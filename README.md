# ClaimCompass - Car Accident Claim Navigator

## Run Locally

```bash
docker-compose up -d
```

Then open:
- Frontend: http://localhost:3400
- Backend API: http://localhost:8000/health

## Push to GHCR

```bash
./push-to-ghcr.sh roydellclarke latest
```

## Pull and Run from GHCR

```bash
docker pull ghcr.io/roydellclarke/claimcompass-backend:latest
docker pull ghcr.io/roydellclarke/claimcompass-frontend:latest
docker-compose up -d
```
