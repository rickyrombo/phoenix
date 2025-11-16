package db

const (
	Table_Blocks = "blocks"
)

type BlocksRow struct {
	Number int64  `db:"number"`
	Hash   string `db:"hash"`
}
