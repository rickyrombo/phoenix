# Audius Track Indexer & API

This project indexes tracks from the Audius decentralized music platform into a PostgreSQL database and exposes them through a RESTful API built with Go and Fiber. Structured as a monorepo following patterns from [audiusd](https://github.com/AudiusProject/audiusd).

## Architecture

- **Indexer**: Golang service using ConnectRPC to communicate with Audius discovery nodes and HTTP to fetch track data
- **API**: Go/Fiber REST API that serves indexed track data
- **Database**: PostgreSQL database for storing track metadata
- **Shared Packages**: Common models and database operations used by both services

## Project Structure

```
audius/
├── pkg/                    # Shared packages
│   ├── models/            # Data models (Track, Artist, Stats)
│   ├── db/                # Database operations layer
│   ├── indexer/           # Indexer service logic (ConnectRPC)
│   └── api/               # API handlers
├── cmd/                   # Service entry points
│   ├── indexer/           # Indexer main
│   └── api/               # API server main
├── migrations/            # Database migrations
├── indexer/               # Indexer Dockerfile
├── api/                   # API Dockerfile
└── docker-compose.yml     # Orchestration
```

## Prerequisites

- Docker & Docker Compose
- (Optional) Go 1.21+ for local development

## Quick Start

1. **Clone the repository**
   ```bash
   cd f:/Documents/Repositories/audius
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env if you want to customize any settings
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Indexer service (runs continuously)
   - API service on port 3000

4. **Check service health**
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

## API Endpoints

### Health Check
- `GET /api/v1/health` - Check API health status

### Tracks
- `GET /api/v1/tracks` - Get all tracks (paginated)
  - Query params: `limit`, `offset`, `sort` (created_at|play_count|favorite_count|title), `order` (asc|desc)
- `GET /api/v1/tracks/:id` - Get track by ID
- `GET /api/v1/tracks/search?q=query` - Search tracks by title or artist
  - Query params: `q` (required), `limit`, `offset`
- `GET /api/v1/tracks/trending` - Get trending tracks
  - Query params: `limit`

### Artists
- `GET /api/v1/artists` - Get all artists (paginated)
  - Query params: `limit`, `offset`
- `GET /api/v1/artists/:id` - Get artist by ID
- `GET /api/v1/artists/:id/tracks` - Get all tracks by an artist
  - Query params: `limit`, `offset`

### Statistics
- `GET /api/v1/stats` - Get indexer statistics

## Example API Calls

```bash
# Get trending tracks
curl http://localhost:3000/api/v1/tracks/trending?limit=10

# Search for tracks
curl http://localhost:3000/api/v1/tracks/search?q=hip%20hop&limit=20

# Get tracks sorted by play count
curl http://localhost:3000/api/v1/tracks?sort=play_count&order=desc&limit=25

# Get artist tracks
curl http://localhost:3000/api/v1/artists/xyz123/tracks

# Get statistics
curl http://localhost:3000/api/v1/stats
```

## Development

### Local API Development

```bash
cd api
go mod download
go run main.go
```

### Local Indexer Development

```bash
cd indexer
go mod download
go run main.go
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | audius |
| `POSTGRES_PASSWORD` | PostgreSQL password | audius123 |
| `POSTGRES_DB` | PostgreSQL database name | audius_tracks |
| `POSTGRES_PORT` | PostgreSQL port | 5432 |
| `AUDIUS_API_URL` | Audius discovery provider URL | https://discoveryprovider.audius.co |
| `INDEXER_INTERVAL` | Indexing interval in seconds | 300 |
| `API_PORT` | API server port | 3000 |

### Indexer Configuration

The indexer is written in **Golang** and fetches data from Audius Discovery Provider nodes:
- Trending tracks (top 100)
- Recent tracks (top 100)

It runs every 5 minutes by default (configurable via `INDEXER_INTERVAL`). The indexer uses the standard Audius HTTP/REST API from discovery provider nodes.

## Database Schema

### Tables

- **tracks**: Stores track metadata including title, artist, genre, play counts, etc.
- **artists**: Stores artist information
- **indexer_state**: Tracks indexing progress and statistics

See `db/migrations/001_init_schema.sql` for the complete schema.

## Stopping Services

```bash
docker-compose down
```

To also remove the database volume:
```bash
docker-compose down -v
```

## Logs

View logs for all services:
```bash
docker-compose logs -f
```

View logs for specific service:
```bash
docker-compose logs -f api
docker-compose logs -f indexer
docker-compose logs -f postgres
```

## Project Structure

```
.
├── api/                    # Go API service
│   ├── handlers/          # HTTP request handlers
│   ├── models/            # Data models
│   ├── Dockerfile
│   ├── go.mod
│   ├── go.sum
│   └── main.go
├── indexer/               # Golang indexer service
│   ├── Dockerfile
│   ├── go.mod
│   ├── go.sum
│   └── main.go
├── db/
│   └── migrations/        # Database migrations
│       └── 001_init_schema.sql
├── docker-compose.yml
├── .env.example
└── README.md
```

## Notes

- The Audius Discovery Provider API is public and doesn't require authentication
- The indexer uses the standard REST API endpoints from Audius discovery nodes
- Track data is refreshed based on the `INDEXER_INTERVAL` setting
- Both the indexer and API are written in **Golang** for performance and consistency
- The API supports CORS for web applications
- All timestamps are stored in UTC

## Troubleshooting

### Database connection issues
- Ensure PostgreSQL container is healthy: `docker-compose ps`
- Check database logs: `docker-compose logs postgres`

### Indexer not fetching data
- Check indexer logs: `docker-compose logs indexer`
- Verify Audius API is accessible: `curl https://discoveryprovider.audius.co/v1/tracks/trending`

### API errors
- Check API logs: `docker-compose logs api`
- Verify database connection in API logs

## License

This project is for educational and personal use.
