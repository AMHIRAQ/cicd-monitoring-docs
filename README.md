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
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/05d75d5d-ae35-4634-aca4-2e6ded29fec5" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/02eb4147-9ba6-46e0-a0f9-a6d84604c1b8" />
<img width="1920" height="1080" alt="Capture d’écran du 2026-11-18 14-46-20" src="https://github.com/user-attachments/assets/e46dfbfd-b649-4fc6-9a45-405c45b2fa2c" />
<img width="1920" height="1080" alt="Capture d’écran du 2026-11-18 14-40-41" src="https://github.com/user-attachments/assets/a5d1b9fb-4e1d-4c08-8357-8549205302e1" />
<img width="1920" height="1080" alt="Capture d’écran du 2026-11-18 15-29-02" src="https://github.com/user-attachments/assets/0671565b-0571-44a2-a976-35585c92198c" />
<img width="1920" height="1080" alt="Capture d’écran du 2026-11-18 15-29-04" src="https://github.com/user-attachments/assets/ab6a1265-4761-41fa-a2b2-0e717f442e9b" />


