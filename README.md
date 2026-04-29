# CPNW Grid Data Visuals

React/Vite dashboard for Clinical Placements Northwest grid data.

## Development

```bash
npm install
npm run data:build
npm run dev
```

The browser app reads `public/data/datasets.json`, which currently contains `2023-2024` and `2024-2025`. Refresh that file with `npm run data:build` whenever source Excel links or academic years change.

## Checks

```bash
npm run lint
npm run build
```
