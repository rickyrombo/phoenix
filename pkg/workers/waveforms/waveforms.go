package waveforms

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/OpenAudio/go-openaudio/pkg/sdk"
	"github.com/OpenAudio/go-openaudio/pkg/sdk/mediorum"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/hajimehoshi/go-mp3"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
    DatabaseURL string
    AudiusURL   string
    BatchSize int
    Buckets   int
    Logger    *slog.Logger
    DelegatePrivateKey string
}

type Job struct {
	batchSize int
	buckets   int
	client   *http.Client
	pool    *pgxpool.Pool
	sdk     *sdk.OpenAudioSDK
	logger *slog.Logger
	delegatePrivateKey string
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

	if cfg.BatchSize <= 0 {
		cfg.BatchSize = 50
	}
	if cfg.Buckets <= 0 {
		cfg.Buckets = 500
	}
	return &Job{
		batchSize: cfg.BatchSize,
		buckets:   cfg.Buckets,
		client:    &http.Client{Timeout: 30 * time.Second},
		pool:      pool,
		sdk:       openAudioSdk,
        delegatePrivateKey: cfg.DelegatePrivateKey,
		logger:    cfg.Logger,
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
		sem := make(chan struct{}, 4) // limit concurrency to 4

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
				j.ProcessWaveform(ctx, t.TrackID, &t.CID)
			}(t)
		}
		wg.Wait()
    }
}

func (j *Job) ProcessWaveform(ctx context.Context, trackID int, cid *string) error {
	cids := make([]string, 0, 2)
	if cid == nil {
		sql := `SELECT track_cid, preview_cid FROM tracks WHERE id = $1 LIMIT 1;`

		var trackCID, previewCID string
		err := j.pool.QueryRow(ctx, sql, trackID).Scan(&trackCID, &previewCID)
		if err != nil {
			return fmt.Errorf("failed to fetch track cids: %w", err)
		}

		cids = append(cids, trackCID, previewCID)
	} else {
		cids = append(cids, *cid)
	}
	for _, cid := range cids {
        if cid == "" {
            continue
        }
        signature, err := signStreamRequest(cid, trackID, 0, j.delegatePrivateKey)
        if err != nil {
            return fmt.Errorf("failed to sign stream request: %w", err)
        }
        r, err := j.sdk.Mediorum.StreamTrack(cid, &mediorum.StreamOptions{
            Signature: string(signature),
        })
        if err != nil {
            return fmt.Errorf("failed to get cid data: %w", err)
        }
        defer r.Close()

        peaks, err := computeWaveformFromMP3Stream(r, j.buckets)
        if err != nil {
            return fmt.Errorf("failed to compute waveform: %w", err)
        }

        if err := upsertWaveform(ctx, j.pool, cid, trackID, peaks); err != nil {
            return fmt.Errorf("failed to upsert waveform: %w", err)
        }
	}
	return nil
}

// waveformTask represents a single track -> cid work unit.
type waveformTask struct {
    TrackID int `db:"track_id"`
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

func upsertWaveform(ctx context.Context, db *pgxpool.Pool, cid string, trackID int, peaks []float32) error {
        upsertSQL := `
            INSERT INTO waveforms (cid, track_id, peaks)
            VALUES ($1, $2, $3)
            ON CONFLICT (cid) DO UPDATE SET
                track_id = EXCLUDED.track_id,
                peaks = EXCLUDED.peaks,
                updated_at = NOW();
            `
        if _, err := db.Exec(ctx, upsertSQL, cid, trackID, peaks); err != nil {
            return fmt.Errorf("failed to upsert waveform for cid %s: %w", cid, err)
	}
	return nil
}

// computeWaveformFromMP3Stream reads decoded PCM from the mp3 decoder as a stream,
// computes per-frame peak amplitudes, then reduces those frame-peaks into `buckets` values.
func computeWaveformFromMP3Stream(r io.Reader, buckets int) ([]float32, error) {
    dec, err := mp3.NewDecoder(r)
    if err != nil {
        return nil, fmt.Errorf("mp3 decode: %w", err)
    }

    // Buffer for decoded PCM bytes. must be even length (16-bit samples)
    const bufSize = 4096
    buf := make([]byte, bufSize)

    // We'll compute per-frame sum-of-squares every `samplesPerFrame` samples to avoid storing samples.
    const samplesPerFrame = 1024 // tune: smaller => more frames, higher accuracy

    var frameSums []float64 // sum of squared normalized samples per frame
    var frameCounts []int   // sample count per frame
    var currentFrameSumSq float64
    var sampleCountInFrame int
    var totalFrames int

    // dec.Read returns decoded PCM bytes (little endian 16-bit samples)
    for {
        n, readErr := dec.Read(buf)
        if n > 0 {
            // process the decoded bytes
            // ensure we process full sample pairs
            limit := n - (n % 2)
            for off := 0; off < limit; off += 2 {
                // treat as uint16 little-endian, then reinterpret as int16
                sample := int16(binary.LittleEndian.Uint16(buf[off : off+2]))
                // normalized sample in [-1,1)
                f := float64(sample) / 32768.0
                currentFrameSumSq += f * f
                sampleCountInFrame++

                if sampleCountInFrame >= samplesPerFrame {
                    frameSums = append(frameSums, currentFrameSumSq)
                    frameCounts = append(frameCounts, sampleCountInFrame)
                    // reset for next frame
                    currentFrameSumSq = 0
                    sampleCountInFrame = 0
                    totalFrames++
                }
            }
        }

        if readErr != nil {
            if readErr == io.EOF {
                // flush remaining partial frame
                if sampleCountInFrame > 0 {
                    frameSums = append(frameSums, currentFrameSumSq)
                    frameCounts = append(frameCounts, sampleCountInFrame)
                    totalFrames++
                }
                break
            }
            return nil, fmt.Errorf("read pcm: %w", readErr)
        }
    }

    if len(frameSums) == 0 {
        return nil, fmt.Errorf("no frame data computed")
    }

    // Reduce frameSums -> buckets by grouping and computing RMS per bucket.
    out := make([]float32, buckets)
    fpLen := len(frameSums)
    if fpLen <= buckets {
        // fewer frames than buckets: compute RMS per frame and place into output
        for i := 0; i < fpLen; i++ {
            if frameCounts[i] > 0 {
                out[i] = float32(math.Sqrt(frameSums[i] / float64(frameCounts[i])))
            } else {
                out[i] = 0
            }
        }
    } else {
        // group map: group i corresponds to frame indices from floor(i*fpLen/buckets) to floor((i+1)*fpLen/buckets)-1
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

func signStreamRequest(cid string, trackId int, userId int, privateKey string) ([]byte, error) {
    timestamp := time.Now().Unix() * 1000
	data := map[string]interface{}{
		"cid":       cid,
		"timestamp": timestamp,
		"trackId":   trackId,
		"userId":    userId,
	}

	signature, err := generateSignature(data, privateKey)
	if err != nil {
		return nil, err
	}

	// Convert the data map to a JSON string
	dataJSON, _ := json.Marshal(data)

	signatureData := map[string]interface{}{
		"signature": signature,
		"data":      string(dataJSON),
	}
	signatureJSON, _ := json.Marshal(signatureData)
	return signatureJSON, nil
}

func generateSignature(data map[string]interface{}, privateKey string) (string, error) {
	ecdsaPrivKey, err := crypto.HexToECDSA(privateKey)
	if err != nil {
		return "", err
	}

	// Sort json
	jsonStr := func(data map[string]interface{}) string {
		var b bytes.Buffer
		_ = json.NewEncoder(&b).Encode(data)
		return strings.TrimRight(b.String(), "\n")
	}(data)

	// Hash the JSON string, prefix it, and hash again
	messageHash := crypto.Keccak256([]byte(jsonStr))
	prefix := fmt.Sprintf("\x19Ethereum Signed Message:\n%d", len(messageHash))
	prefixedMessage := append([]byte(prefix), messageHash...)
	finalHash := crypto.Keccak256(prefixedMessage)

	// Sign the hash with the private key
	signature, err := crypto.Sign(finalHash, ecdsaPrivKey)
	if err != nil {
		return "", err
	}

	return hexutil.Encode(signature), nil
}