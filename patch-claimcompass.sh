#!/bin/bash
case "${1:-help}" in
    status)
        docker compose ps
        ;;
    fix-ports)
        sed -i '' 's/3400:3400/3400:3000/g' docker-compose.yml
        docker compose up -d --build
        echo "Open http://localhost:3400"
        ;;
    restart)
        docker compose restart ${2:-}
        ;;
    logs)
        docker compose logs -f ${2:-}
        ;;
    rebuild)
        docker compose build --no-cache ${2:-}
        docker compose up -d ${2:-}
        ;;
    *)
        echo "Commands: status, fix-ports, restart, logs, rebuild"
        ;;
esac
