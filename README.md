# CI/CD Pipeline avec Monitoring Prometheus + Grafana

## Stack
- Backend : Node.js + Express
- Frontend : Nginx
- Base de données : PostgreSQL
- Monitoring : Prometheus + Grafana
- Conteneurs : Docker + Docker Compose

## Architecture

App Node.js → expose /metrics → Prometheus scrape → Grafana affiche

## Comment ça marche

### 1. L'app expose ses métriques
prom-client génère automatiquement les métriques sur /metrics :
- http_requests_total
- process_cpu_seconds_total
- process_resident_memory_bytes

### 2. Prometheus collecte
prometheus.yml configure les cibles à scraper toutes les 5s.

### 3. Grafana visualise
Datasource : http://prometheus:9090
Dashboards créés avec PromQL.

## Lancer le projet

docker compose up -d --build

## Accès
- Frontend  : http://localhost:8080
- Backend   : http://localhost:3000
- Prometheus: http://localhost:9090
- Grafana   : http://localhost:3001 (admin/admin)

## Tests de charge
curl http://localhost:3000/dos/cpu/5
curl http://localhost:3000/dos/ram/200
curl http://localhost:3000/dos/db/100

## Screenshots
[tes screenshots ici]
