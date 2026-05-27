#!/bin/bash
set -e
USERNAME="${1:-roydellclarke}"
TAG="${2:-latest}"

echo "Logging into GHCR..."
echo "Enter your GitHub token:"
read -s TOKEN
echo $TOKEN | docker login ghcr.io -u $USERNAME --password-stdin

echo "Building images..."
docker build -f backend/Dockerfile -t ghcr.io/${USERNAME}/claimcompass-backend:${TAG} .
docker build -f frontend/Dockerfile -t ghcr.io/${USERNAME}/claimcompass-frontend:${TAG} .

echo "Pushing to GHCR..."
docker push ghcr.io/${USERNAME}/claimcompass-backend:${TAG}
docker push ghcr.io/${USERNAME}/claimcompass-frontend:${TAG}

echo "Done!"
echo "ghcr.io/${USERNAME}/claimcompass-backend:${TAG}"
echo "ghcr.io/${USERNAME}/claimcompass-frontend:${TAG}"
