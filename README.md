# MotorScout

MotorScout is a production-shaped car deal intelligence app with:

- a Node HTTP backend
- API routes for search, health, saved searches, and watchlists
- persistent JSON-backed storage
- a static frontend served by the backend

## Run locally

```bash
npm start
```

Then open `http://localhost:3000`.

For container or cloud deployment, set `HOST=0.0.0.0`.

## API

- `GET /api/health`
- `GET /api/search`
- `GET /api/saved-searches`
- `POST /api/saved-searches`
- `GET /api/watchlist`
- `POST /api/watchlist`
- `DELETE /api/watchlist/:id`

## Production notes

This repo now has the backend shape and deployment artifacts for production, but the inventory adapters are still seeded. To make the product truly production-real, the next backend upgrade is replacing the seeded generator with live dealer, OEM, and marketplace ingestion plus VIN-based deduplication and durable snapshot history.

## Render handoff

1. Create a GitHub repository and push this codebase.
2. In Render, choose New + > Blueprint.
3. Connect the GitHub repository.
4. Render will detect `render.yaml` and create the `motorscout` web service.
5. Deploy the service.

If deploying with the Docker runtime, set `HOST=0.0.0.0` in Render.
