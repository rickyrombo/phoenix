package api

import (
	"context"
	"fmt"
	"math"
	"math/rand"
)

func (s *Server) getUnclaimedId(ctx context.Context, tableName string, fieldName string, lowerBound, upperBound int) (int, error) {
	for i := 0; i < 100; i++ {
		candidateId := lowerBound + rand.Intn(upperBound-lowerBound)
		var exists bool
		sql := fmt.Sprintf("SELECT EXISTS(SELECT 1 FROM %s WHERE %s = $1)", tableName, fieldName)
		err := s.pool.QueryRow(ctx, sql, candidateId).Scan(&exists)
		if err != nil {
			continue
		}
		if !exists {
			return candidateId, nil
		}
	}
	return 0, fmt.Errorf("failed to find unclaimed ID after 100 attempts")
}

func (s *Server) getUnclaimedCommentId(ctx context.Context) (int, error) {
	return s.getUnclaimedId(ctx, "comments", "comment_id", 4_000_000, math.MaxInt32)
}
