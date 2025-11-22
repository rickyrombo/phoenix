package waveforms

import (
	"audius/pkg/common"
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/OpenAudio/go-openaudio/pkg/sdk"
	"github.com/OpenAudio/go-openaudio/pkg/sdk/mediorum"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	DatabaseURL        string
	AudiusURL          string
	BatchSize          int
	Buckets            int
	Concurrency        int
	Logger             *slog.Logger
	DelegatePrivateKey string
}

type Job struct {
	batchSize   int
	buckets     int
	concurrency int
	client      *http.Client
	pool        *pgxpool.Pool
	sdk         *sdk.OpenAudioSDK
	logger      *slog.Logger
}

func NewJob(cfg *Config) (*Job, error) {
	connConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), connConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	openAudioSdk := sdk.NewOpenAudioSDK(cfg.AudiusURL)
	privKey, err := crypto.HexToECDSA(cfg.DelegatePrivateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to parse delegate private key: %w", err)
	}
	openAudioSdk.SetPrivKey(privKey)

	if cfg.BatchSize <= 0 {
		cfg.BatchSize = 50
	}
	if cfg.Buckets <= 0 {
		cfg.Buckets = 500
	}
	if cfg.Concurrency <= 0 {
		cfg.Concurrency = 4
	}
	return &Job{
		batchSize:   cfg.BatchSize,
		buckets:     cfg.Buckets,
		concurrency: cfg.Concurrency,
		client:      &http.Client{Timeout: 60 * time.Second},
		pool:        pool,
		sdk:         openAudioSdk,
		logger:      cfg.Logger,
	}, nil
}

// RunWaveformJob scans the tracks table for tracks that don't have a waveform
// saved in the `waveforms` table and computes & upserts a wavesurfer-compatible
// waveform JSON for each. It processes records in batches to avoid loading the
// entire table into memory.
func (j *Job) Run(ctx context.Context) error {
	for {
		tasks, err := j.fetchPendingWaveformTasks(ctx, j.batchSize)
		if err != nil {
			return fmt.Errorf("fetching pending tasks: %w", err)
		}
		if len(tasks) == 0 {
			return nil
		}

		var wg sync.WaitGroup
		sem := make(chan struct{}, j.concurrency)

		for _, t := range tasks {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
			}
			sem <- struct{}{}
			wg.Add(1)
			go func(t waveformTask) {
				defer wg.Done()
				defer func() { <-sem }()
				j.ProcessCID(ctx, t.CID)
			}(t)
		}
		wg.Wait()
	}
}

func (j *Job) ProcessTrack(ctx context.Context, trackID int) error {
	sql := `SELECT track_cid, preview_cid FROM tracks WHERE id = $1 LIMIT 1;`

	var trackCID, previewCID string
	err := j.pool.QueryRow(ctx, sql, trackID).Scan(&trackCID, &previewCID)
	if err != nil {
		return fmt.Errorf("failed to fetch track cids: %w", err)
	}
	cids := []string{trackCID, previewCID}
	for _, cid := range cids {
		if cid == "" {
			continue
		}
		if err := j.ProcessCID(ctx, cid); err != nil {
			return err
		}
	}
	return nil
}

func (j *Job) ProcessCID(ctx context.Context, cid string) error {
	logger := j.logger.With(slog.String("cid", cid))

	signature, err := common.SignStreamRequest(j.sdk.PrivKey(), cid, nil, nil)
	if err != nil {
		return fmt.Errorf("failed to sign stream request: %w", err)
	}

	logger.Debug("Begin streaming")
	r, err := j.sdk.Mediorum.StreamTrack(cid, &mediorum.StreamOptions{
		Signature: string(signature),
	})
	if err != nil {
		return fmt.Errorf("failed to get cid data: %w", err)
	}

	logger.Debug("Creating temp file")
	tmp, err := os.CreateTemp("", "waveform-*.mp3")
	if err != nil {
		r.Close()
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpPath := tmp.Name()
	// ensure temp file is cleaned up
	defer func() {
		logger.Debug("Cleaning up temp file and closing stream")
		tmp.Close()
		os.Remove(tmpPath)
		r.Close()
	}()

	logger.Debug("Copying to temp file", slog.String("temp_path", tmpPath))
	if _, err := io.Copy(tmp, r); err != nil {
		return fmt.Errorf("copy to temp file: %w", err)
	}

	logger.Debug("Computing waveform from temp file")
	peaks, err := computeWaveformFromMP3File(tmpPath, j.buckets)
	if err != nil {
		return fmt.Errorf("failed to compute waveform: %w", err)
	}

	logger.Debug("Upserting waveform")
	if err := upsertWaveform(ctx, j.pool, cid, peaks); err != nil {
		return fmt.Errorf("failed to upsert waveform: %w", err)
	}
	return nil
}

// waveformTask represents a single track -> cid work unit.
type waveformTask struct {
	TrackID int    `db:"track_id"`
	CID     string `db:"cid"`
}

// fetchPendingWaveformTasks returns a slice of tasks (track id + cid) to process.
func (j *Job) fetchPendingWaveformTasks(ctx context.Context, batchSize int) ([]waveformTask, error) {
	querySQL := `
        SELECT t.id, t.track_cid, t.preview_cid
        FROM tracks t
        LEFT JOIN waveforms w1 ON w1.cid = t.track_cid
        LEFT JOIN waveforms w2 ON w2.cid = t.preview_cid
        WHERE (t.track_cid IS NOT NULL AND w1.cid IS NULL)
          OR (t.track_cid IS NULL AND t.preview_cid IS NOT NULL AND w2.cid IS NULL)
        LIMIT $1;
        `

	rows, err := j.pool.Query(ctx, querySQL, batchSize)
	if err != nil {
		return nil, fmt.Errorf("failed querying tracks for waveform job: %w", err)
	}

	tasks, err := pgx.CollectRows(rows, pgx.RowToStructByName[waveformTask])
	if err != nil {
		return nil, fmt.Errorf("failed collecting waveform tasks: %w", err)
	}

	return tasks, nil
}

func upsertWaveform(ctx context.Context, db *pgxpool.Pool, cid string, peaks []float32) error {
	upsertSQL := `
        INSERT INTO waveforms (cid, peaks)
        VALUES (@cid, @peaks)
        ON CONFLICT (cid) DO UPDATE SET
            peaks = EXCLUDED.peaks,
            updated_at = NOW();
        `
	if _, err := db.Exec(ctx, upsertSQL, pgx.NamedArgs{
		"cid":   cid,
		"peaks": peaks,
	}); err != nil {
		return fmt.Errorf("failed to upsert waveform for cid %s: %w", cid, err)
	}
	return nil
}

// computeWaveformFromMP3Stream uses ffmpeg to decode MP3 bytes to raw PCM and
// computes RMS per-bucket. It streams the MP3 into ffmpeg's stdin and reads
// signed 16-bit little-endian PCM from stdout.
func computeWaveformFromMP3Stream(r io.Reader, buckets int) ([]float32, error) {
	// ffmpeg command: read from stdin, output s16le mono 44.1k to stdout
	cmd := exec.Command("ffmpeg",
		"-hide_banner", "-loglevel", "error",
		"-i", "pipe:0",
		"-f", "s16le",
		"-acodec", "pcm_s16le",
		"-ac", "1",
		"-ar", "44100",
		"pipe:1",
	)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("ffmpeg stdin: %w", err)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("ffmpeg stdout: %w", err)
	}

	if err := cmd.Start(); err != nil {
		stdin.Close()
		return nil, fmt.Errorf("start ffmpeg: %w", err)
	}

	// copy mp3 data into ffmpeg stdin
	copyErrCh := make(chan error, 1)
	go func() {
		_, err := io.Copy(stdin, r)
		stdin.Close()
		copyErrCh <- err
	}()

	// read PCM from ffmpeg stdout and compute per-frame sum of squares
	const bufSize = 32 * 1024
	buf := make([]byte, bufSize)
	const samplesPerFrame = 1024
	var frameSums []float64
	var frameCounts []int
	var curSum float64
	var curCnt int

	for {
		n, readErr := stdout.Read(buf)
		if n > 0 {
			limit := n - (n % 2)
			for off := 0; off < limit; off += 2 {
				sample := int16(binary.LittleEndian.Uint16(buf[off : off+2]))
				f := float64(sample) / 32768.0
				curSum += f * f
				curCnt++
				if curCnt >= samplesPerFrame {
					frameSums = append(frameSums, curSum)
					frameCounts = append(frameCounts, curCnt)
					curSum = 0
					curCnt = 0
				}
			}
		}
		if readErr != nil {
			if readErr == io.EOF {
				if curCnt > 0 {
					frameSums = append(frameSums, curSum)
					frameCounts = append(frameCounts, curCnt)
				}
				break
			}
			// ensure we clean up ffmpeg process
			cmd.Process.Kill()
			<-copyErrCh
			return nil, fmt.Errorf("ffmpeg read: %w", readErr)
		}
	}

	// wait for copy to finish and ffmpeg to exit
	if copyErr := <-copyErrCh; copyErr != nil && copyErr != io.EOF {
		// ignore EOF
	}
	if err := cmd.Wait(); err != nil {
		return nil, fmt.Errorf("ffmpeg exit: %w", err)
	}

	if len(frameSums) == 0 {
		return nil, fmt.Errorf("no pcm data from ffmpeg")
	}

	// Reduce frameSums -> buckets by grouping and computing RMS per bucket.
	out := make([]float32, buckets)
	fpLen := len(frameSums)
	if fpLen <= buckets {
		for i := 0; i < fpLen; i++ {
			if frameCounts[i] > 0 {
				out[i] = float32(math.Sqrt(frameSums[i] / float64(frameCounts[i])))
			} else {
				out[i] = 0
			}
		}
	} else {
		for i := 0; i < buckets; i++ {
			start := int(math.Floor(float64(i*fpLen) / float64(buckets)))
			end := int(math.Floor(float64((i+1)*fpLen) / float64(buckets)))
			if end <= start {
				end = start + 1
			}
			if end > fpLen {
				end = fpLen
			}
			sumSq := 0.0
			cnt := 0
			for j := start; j < end; j++ {
				sumSq += frameSums[j]
				cnt += frameCounts[j]
			}
			if cnt > 0 {
				out[i] = float32(math.Sqrt(sumSq / float64(cnt)))
			} else {
				out[i] = 0
			}
		}
	}

	// Normalize to 0..1 using the maximum RMS observed across buckets
	maxVal := float32(0)
	for _, v := range out {
		if v > maxVal {
			maxVal = v
		}
	}
	if maxVal > 0 {
		for i := range out {
			out[i] = out[i] / maxVal
		}
	}

	return out, nil
}

// probeAudioFile uses ffprobe to determine sample rate and duration for an
// audio file. It returns sampleRate (hz) and duration (seconds).
func probeAudioFile(path string) (int, float64, error) {
	// sample rate
	cmd := exec.Command("ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate", "-of", "default=noprint_wrappers=1:nokey=1", path)
	out, err := cmd.Output()
	if err != nil {
		return 0, 0, fmt.Errorf("ffprobe sample_rate: %w", err)
	}
	srStr := strings.TrimSpace(string(out))
	sr, err := strconv.Atoi(srStr)
	if err != nil {
		return 0, 0, fmt.Errorf("parse sample_rate: %w", err)
	}

	// duration
	cmd2 := exec.Command("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path)
	out2, err := cmd2.Output()
	if err != nil {
		return 0, 0, fmt.Errorf("ffprobe duration: %w", err)
	}
	durStr := strings.TrimSpace(string(out2))
	dur, err := strconv.ParseFloat(durStr, 64)
	if err != nil {
		return 0, 0, fmt.Errorf("parse duration: %w", err)
	}

	return sr, dur, nil
}

// computeWaveformFromMP3File decodes the given mp3 file with ffmpeg and maps
// samples to `buckets` using an exact per-sample mapping derived from
// sample count (duration * sampleRate). This produces consistent results
// with wavesurfer-style binning.
func computeWaveformFromMP3File(path string, buckets int) ([]float32, error) {
	sampleRate, duration, err := probeAudioFile(path)
	if err != nil {
		// fallback: stream decode without precise sample count
		f, ferr := os.Open(path)
		if ferr != nil {
			return nil, fmt.Errorf("probe failed: %v, and failed to open file: %w", err, ferr)
		}
		defer f.Close()
		return computeWaveformFromMP3Stream(f, buckets)
	}

	totalSamples := int64(math.Round(duration * float64(sampleRate)))
	if totalSamples <= 0 {
		// fallback to streaming
		f, ferr := os.Open(path)
		if ferr != nil {
			return nil, fmt.Errorf("invalid sample count and open failed: %w", ferr)
		}
		defer f.Close()
		return computeWaveformFromMP3Stream(f, buckets)
	}

	// Prepare buckets accumulators
	sums := make([]float64, buckets)
	counts := make([]int64, buckets)

	// Run ffmpeg to output s16le mono at the probed sample rate
	cmd := exec.Command("ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-f", "s16le", "-acodec", "pcm_s16le", "-ac", "1", "-ar", fmt.Sprintf("%d", sampleRate), "pipe:1")
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("ffmpeg stdout pipe: %w", err)
	}
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start ffmpeg: %w", err)
	}

	buf := make([]byte, 32*1024)
	var sampleIdx int64
	for {
		n, rerr := stdout.Read(buf)
		if n > 0 {
			limit := n - (n % 2)
			for off := 0; off < limit; off += 2 {
				sample := int16(binary.LittleEndian.Uint16(buf[off : off+2]))
				f := float64(sample) / 32768.0
				// map sample index to bucket
				b := int((sampleIdx * int64(buckets)) / totalSamples)
				if b < 0 {
					b = 0
				}
				if b >= buckets {
					b = buckets - 1
				}
				sums[b] += f * f
				counts[b]++
				sampleIdx++
			}
		}
		if rerr != nil {
			if rerr == io.EOF {
				break
			}
			cmd.Process.Kill()
			cmd.Wait()
			return nil, fmt.Errorf("ffmpeg read: %w", rerr)
		}
	}

	if err := cmd.Wait(); err != nil {
		return nil, fmt.Errorf("ffmpeg exit: %w", err)
	}

	// compute RMS per bucket and normalize
	out := make([]float32, buckets)
	maxVal := float32(0)
	for i := 0; i < buckets; i++ {
		if counts[i] > 0 {
			rms := math.Sqrt(sums[i] / float64(counts[i]))
			out[i] = float32(rms)
			if out[i] > maxVal {
				maxVal = out[i]
			}
		} else {
			out[i] = 0
		}
	}
	if maxVal > 0 {
		for i := range out {
			out[i] = out[i] / maxVal
		}
	}
	return out, nil
}
