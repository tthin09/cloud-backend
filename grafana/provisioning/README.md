# Grafana Provisioning

This directory contains all Grafana auto-provisioning files:

- **`datasources/`** — Prometheus datasource connection
- **`dashboards/`** — 4 dashboard JSONs + provider config
- **`alerting/`** — Alert rules, contact points, notification policies

All files are loaded automatically when Grafana starts (mounted as `:ro` volume).

See [README-grafana.md](../README-grafana.md) for full documentation.
