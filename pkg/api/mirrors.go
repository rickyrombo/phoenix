package api

import (
	"context"
	"fmt"
	"net/url"
	"phoenix/pkg/common"

	"connectrpc.com/connect"
	v1 "github.com/OpenAudio/go-openaudio/pkg/api/storage/v1"
)

const MIRROR_COUNT = 3

type StreamMirrors struct {
	Url     string   `json:"url"`
	Mirrors []string `json:"mirrors"`
}

func (s *Server) getStreamMirrors(ctx context.Context, cid string, userId, trackId *int) (*StreamMirrors, error) {
	res, err := s.sdk.Storage.GetRendezvousNodes(ctx, &connect.Request[v1.GetRendezvousNodesRequest]{
		Msg: &v1.GetRendezvousNodesRequest{
			Cid: cid,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get rendezvous nodes: %w", err)
	}

	nodes := res.Msg.GetNodes()
	if len(nodes) < MIRROR_COUNT {
		return nil, fmt.Errorf("not enough rendezvous nodes: have %d, need %d", len(nodes), MIRROR_COUNT+1)
	}

	signature, err := common.SignStreamRequest(s.sdk.PrivKey(), cid, userId, trackId)
	if err != nil {
		return nil, fmt.Errorf("failed to sign stream request: %w", err)
	}
	q := url.Values{}
	q.Add("signature", signature)
	signature = q.Encode()

	return &StreamMirrors{
		Url:     fmt.Sprintf("%s/tracks/cidstream/%s?%s", nodes[0], cid, signature),
		Mirrors: nodes[1:MIRROR_COUNT],
	}, nil
}

type ImageMirrors struct {
	Small   string   `json:"small"`
	Medium  string   `json:"medium"`
	Large   string   `json:"large"`
	Mirrors []string `json:"mirrors"`
}

func (s *Server) getImageMirrors(ctx context.Context, cid string) (*ImageMirrors, error) {
	res, err := s.sdk.Storage.GetRendezvousNodes(ctx, &connect.Request[v1.GetRendezvousNodesRequest]{
		Msg: &v1.GetRendezvousNodesRequest{
			Cid: cid,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get rendezvous nodes: %w", err)
	}

	nodes := res.Msg.GetNodes()
	if len(nodes) < MIRROR_COUNT {
		return nil, fmt.Errorf("not enough rendezvous nodes: have %d, need %d", len(nodes), MIRROR_COUNT+1)
	}

	return &ImageMirrors{
		Small:   fmt.Sprintf("%s/content/%s/150x150.jpg", nodes[0], cid),
		Medium:  fmt.Sprintf("%s/content/%s/480x480.jpg", nodes[0], cid),
		Large:   fmt.Sprintf("%s/content/%s/1000x1000.jpg", nodes[0], cid),
		Mirrors: nodes[1:MIRROR_COUNT],
	}, nil
}

type WideImageMirrors struct {
	Small   string   `json:"small"`
	Large   string   `json:"large"`
	Mirrors []string `json:"mirrors"`
}

func (s *Server) getWideImageMirrors(ctx context.Context, cid string) (*WideImageMirrors, error) {
	res, err := s.sdk.Storage.GetRendezvousNodes(ctx, &connect.Request[v1.GetRendezvousNodesRequest]{
		Msg: &v1.GetRendezvousNodesRequest{
			Cid: cid,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get rendezvous nodes: %w", err)
	}
	nodes := res.Msg.GetNodes()
	if len(nodes) < MIRROR_COUNT {
		return nil, fmt.Errorf("not enough rendezvous nodes: have %d, need %d", len(nodes), MIRROR_COUNT)
	}
	return &WideImageMirrors{
		Small:   fmt.Sprintf("%s/content/%s/640x.jpg", nodes[0], cid),
		Large:   fmt.Sprintf("%s/content/%s/2000x.jpg", nodes[0], cid),
		Mirrors: nodes[1:MIRROR_COUNT],
	}, nil
}
