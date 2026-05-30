# BizSpot

> A system that evaluates business viability based on location and budget.

---

## What It Does

BizSpot answers one question:

**Should I open this business, in this place, with this budget?**

The user provides:
- a business type (e.g. coffee shop, barbershop, pharmacy)
- a map location (coordinates + search radius)
- a starting budget

The system returns a structured evaluation: a viability score, verdict, estimated payback period, identified risks, a summary, and alternative formats if the idea scores poorly.

---

## How the System Thinks

BizSpot does not give generic advice. It runs a structured analysis across four layers:

### 1. Location Understanding
Analyzes the target area using reverse geocoding (Nominatim) and local settlement data:
- population of the settlement or district, resolved from the Держстат dataset (28 000+ settlements)
- district activity level (traffic multiplier from POI density)
- average commercial rent

*Answers: is there a market here?*

### 2. Competition Analysis
Evaluates market saturation using live data from OpenStreetMap (Overpass API):
- how many similar businesses exist within the user's chosen radius
- competitor density normalized to population
- whether there is room for a new player

*Answers: is there space for this business?*

### 3. Economic Feasibility
Assesses the financial reality using the user's budget:
- whether the budget is sufficient to launch (vs. minimum required)
- rent pressure relative to the budget
- estimated payback timeline

*Answers: can this be launched and sustained?*

### 4. Verdict
All factors are combined into a single weighted score:

| Score | Verdict | Meaning |
|-------|---------|---------|
| 75–100 | GREEN | Strong potential, proceed |
| 50–74 | YELLOW | Moderate potential, proceed with caution |
| 0–49 | RED | Weak potential, consider alternatives |

The output includes the score, verdict, top risks, payback estimate, a summary sentence, and if RED — concrete alternative formats.

---

## Project Stages

| Stage | Description | Status |
|-------|-------------|--------|
| 0 | Setup — install deps, folder structure, verify app starts | planned |
| 1 | OverpassService — live competitor count from OpenStreetMap | planned |
| 2 | NominatimService — reverse geocode coordinates → district | planned |
| 3 | LvivStaticProvider — combines live + static data into MarketSnapshot | planned |
| 4 | MetricsService — normalize raw data into 0..1 values | planned |
| 5 | ScoringService — weighted formula → score + verdict | planned |
| 6 | ReportService — payback, risks, summary | planned |
| 7 | RecommendationService — alternatives when RED | planned |
| 8 | AnalysisModule — orchestrator, controller, DTOs | planned |
| 9 | Wiring & Verification — AppModule, end-to-end test, error cases | planned |

For the detailed plan and step-by-step instructions see [PLAN.md](./PLAN.md) and [PLAN_STEPS.md](./PLAN_STEPS.md).

---

## Tech Stack

- **Backend:** NestJS, TypeScript
- **Frontend:** React Native (planned, not started)
- **Database:** PostgreSQL + Prisma (planned, not started)
- **AI:** Claude API (planned, not started)
- **Competitor data:** Overpass API (OpenStreetMap)
- **Geocoding:** Nominatim (OpenStreetMap)
- **Rent data:** DIM RIA API (dom.ria.com) — API access requested, planned for final version

---

## City Coverage

**Current version:** Ukraine-wide

Settlement population data covers 28,655 settlements across all 25 oblasts, sourced from official Держстат data. Any location that Nominatim can reverse-geocode will receive a population estimate; unknown settlements fall back to OSM building count or Nominatim place-type defaults.

Supported business types: `coffee_shop`, `car_wash`, `auto_repair`, `barbershop`, `grocery_store`, `pharmacy`

---

## Population Data

Settlement population is resolved from a local static dataset generated from official government data.

**Source:** "Чисельність наявного населення по регіонах, районах, територіальних громадах та населених пунктах" — [data.gov.ua](https://data.gov.ua) / Держстат (State Statistics Service of Ukraine), 2020–2021 census estimates.

**Generated file:** `src/data/ua-settlements-population.generated.json`
- 28,655 settlements, all 25 oblasts
- each entry: Ukrainian name, KMU 2010 transliteration, region, district, hromada, population
- file size ~12 MB; included in the production `dist/` build and Docker image

**Regeneration** (required only when the official XLSX is updated):

```bash
# Place updated XLSX at:
tools/data-source/population.xlsx

# Run the generator:
npx ts-node scripts/generate-settlements.ts

# Rebuild:
yarn build
```

**Runtime:** the application reads the generated JSON at startup via `fs.readFileSync`. The original XLSX is not required at runtime and is not included in the Docker image.

**Population lookup priority:**
1. Known major city (static table — Kyiv, Lviv, Kharkiv, …)
2. Generated Держстат dataset — matched by KMU transliteration or Ukrainian name, disambiguated by oblast and raion
3. Known OSM-name-vs-official discrepancy overrides (manual list, currently only Рудне/Rudno)
4. OSM building count (Overpass API) around the selected radius
5. Nominatim place-type fallback (town → 10 000, suburb → 8 000, village → 3 000)

**Adaptive competitor search radius:**

The competitor search radius adapts to settlement size to ensure the query captures realistic local competition even in areas with lower POI density:

| Settlement size | Competitor radius |
|----------------|-----------------|
| < 20 000 (small town / suburb) | max(business base radius, 2 000 m) |
| 20 000 – 99 999 (mid-size city) | max(business base radius, 1 200 m) |
| ≥ 100 000 (large city) | business base radius unchanged |
| unknown (not in dataset) | max(business base radius, 2 000 m) |

Population is estimated synchronously from the in-memory dataset before the Overpass query. The adaptation ensures that small towns with spread-out commercial activity are not incorrectly shown as having zero competitors.

---

## Why This Is a Diploma-Level Project

The system contains:

- **Domain analysis** — understanding what makes a small business viable
- **Decision model** — a fuzzy-inference weighted scoring model with transparent rules
- **Official data processing** — 28,655 Ukrainian settlements from Держстат XLSX, parsed and normalized into a local lookup dataset; KMU 2010 transliteration bridges official Ukrainian names to OSM/Nominatim English output
- **Live data integration** — real competitor counts and POI density from OpenStreetMap (Overpass API)
- **Result interpretation** — converting numbers into a business recommendation
- **Explainability** — every score can be traced back to its contributing factors; verdict-aware report wording ensures GREEN/YELLOW/RED language is never contradictory
- **AI layer** — LLM-generated explanation of the result in plain language (planned)

---

## Core Thesis

> BizSpot simulates the reasoning of an entry-level business analyst.
> It takes a business idea, a location, and a budget —
> and turns them into a clear, structured answer: start or don't start.

---

For technical documentation see [TECHNICAL.md](./TECHNICAL.md).
For architecture documentation see [ARCHITECTURE_V1.md](./ARCHITECTURE_V1.md) and [ARCHITECTURE_FINAL.md](./ARCHITECTURE_FINAL.md).

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `3030` | HTTP port the server listens on |
| `NODE_ENV` | no | — | Set to `production` in deployment |
| `DIM_RIA_API_KEY` | **yes*** | — | DimRia commercial rent API key |

\* `DIM_RIA_API_KEY` is **required for analysis requests**. The app starts and `/api` (Swagger) works without it, but any call to `POST /analysis/analyze` will return `503 DimRia [unavailable]: DIM_RIA_API_KEY is not configured` until the key is set. Get your key at https://developers.ria.com/.

The following are code constants, not configurable via env:
- `REQUEST_TIMEOUT_MS = 8000` — wall-clock timeout per external HTTP request
- CSV output always written to `test-statistic.csv` in the working directory

---

## Running Locally

```bash
# install dependencies
yarn install

# development (watch mode, auto-reload)
yarn start:dev

# production build + start
yarn build
node dist/src/main.js
```

Swagger UI: http://localhost:3030/api  
OpenAPI JSON: http://localhost:3030/api-json  
Analysis endpoint: `POST http://localhost:3030/analysis/analyze`

---

## Running with Docker

```bash
# build the image
docker build -t bizspot-api .

# run with env file
docker run --env-file .env -p 3030:3030 bizspot-api

# or with docker-compose
docker compose up --build
```

The Docker image uses a two-stage build: TypeScript is compiled in the builder stage, and only the compiled `dist/` and production `node_modules` are copied to the final image.

---

## Deployment

### Render (recommended)

Render is the simplest option: free tier, HTTPS out of the box, auto-deploys on every push to GitHub. The `render.yaml` in this repo contains the full service definition.

#### Step 1 — push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/bizspot-api.git
git push -u origin main
```

#### Step 2 — create a Render account and connect the repo

1. Go to https://render.com and sign up (free)
2. **New → Web Service → Connect a repository** → select `bizspot-api`
3. Render auto-detects `render.yaml`. Confirm the service name and plan (Free)

#### Step 3 — set the secret env var

In the Render dashboard for the service → **Environment → Add Environment Variable**:

| Key | Value |
|---|---|
| `DIM_RIA_API_KEY` | your key from https://developers.ria.com/ |

`PORT` and `NODE_ENV` are managed automatically by `render.yaml`. Do not set `PORT` manually — Render injects it.

#### Step 4 — deploy

Click **Deploy**. Render builds the Docker image and starts the container. Initial deploy takes ~2 minutes.

#### Step 5 — verify

```bash
# replace with your actual Render URL
export API=https://bizspot-api.onrender.com

# Swagger UI must return 200
curl -s -o /dev/null -w "%{http_code}" $API/api

# analysis must return 201 with full response shape
curl -s -X POST $API/analysis/analyze \
  -H "Content-Type: application/json" \
  -d '{"lat":50.4501,"lng":30.5234,"businessType":"coffee_shop","budget":50000}'
```

Expected: `201` with `score`, `verdict`, `verdictSource`, `metrics`, `latentFactors`, `report`.

> **Free tier note:** Render free services spin down after ~15 minutes of inactivity. The first request after a cold start takes 30–60 seconds. Warm the service up before a demo by hitting `/api` a minute in advance.

---

### Alternative: Fly.io (CLI, no GitHub required)

Fly.io deploys directly from your local machine. No GitHub needed.

```bash
# install CLI
brew install flyctl          # macOS
# or: curl -L https://fly.io/install.sh | sh

# authenticate
fly auth signup              # or: fly auth login

# create and configure the app (run once in the project directory)
fly launch --name bizspot-api --no-deploy

# set the secret
fly secrets set DIM_RIA_API_KEY=your_key_here

# deploy
fly deploy
```

Fly.io auto-detects the Dockerfile. After deploy, verify:

```bash
fly open /api               # opens Swagger in browser
fly logs                    # tail live logs
```

---

### Alternative: any VPS or server with Docker

```bash
# on the server
git clone https://github.com/YOUR_USERNAME/bizspot-api.git
cd bizspot-api
cp .env.example .env
# edit .env and set DIM_RIA_API_KEY

docker build -t bizspot-api .
docker run -d --restart=unless-stopped \
  --env-file .env \
  -p 3030:3030 \
  bizspot-api
```
