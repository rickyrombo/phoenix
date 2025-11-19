package db

const (
	Table_Blocks     = "blocks"
	Table_RetryQueue = "retry_queue"
	Table_Tracks     = "tracks"
	Table_Users      = "users"
)

type BlocksRow struct {
	Number int64  `db:"number"`
	Hash   string `db:"hash"`
}
