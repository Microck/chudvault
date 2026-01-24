<p align="center">
  <img src="https://github.com/user-attachments/assets/50fad90d-334a-43e1-a0f5-a8a8ae7d7c98" width="200" alt="chudvault logo" />
</p>

<p align="center">
  full-stack app to manage, tag, search, and archive twitter bookmarks. now supports local-only mode.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-mit-black" />
  <img src="https://img.shields.io/badge/node-14%2B-black" />
  <img src="https://img.shields.io/badge/next.js-15-black" />
  <img src="https://img.shields.io/badge/go-1.18%2B-black" />
</p>


 <p align="center">
   <img src="./docs/assets/preview.png" width="800" alt="chudvault preview" />
 </p>

---

## quickstart

quickstart:
```bash
# Windows
start.bat

# Mac/Linux
chmod +x start.sh
./start.sh
```

choose mode:
1. **Local-only** - frontend only, data saved to file
2. **Full-stack** - frontend + backend + Docker (PostgreSQL)

local-only:

```bash
git clone https://github.com/Microck/chudvault.git
cd chudvault/frontend
npm install
# no env file needed for file-system storage default
npm run dev
```

open: http://localhost:3039

full stack (docker):

```bash
git clone https://github.com/Microck/chudvault.git
cd chudvault
docker compose up --build
```

frontend: http://localhost:3000
backend: http://localhost:8080

---

## features

 - modern ui/ux with shadcn/ui and tailwind
 - **local file storage**: data saved to `frontend/data/db.json` on disk (gitignored)
 - **AI auto-tagging**: use your own OpenAI/Anthropic keys or local Ollama
 - **Grid/List view**: customized browsing experience
 - **Keyboard shortcuts**: `j`/`k` to navigate, `a` to archive, `/` to search
 - **Data Hygiene**: tools to verify media integrity and find orphans
 - **Browser Extension**: quick save current tweet (Chrome/Edge)
 - bookmark cards with full text and media
- tags: create, rename, delete, and mark complete
- search and filter by text or tag
- batch select delete and archive
- stats panel with **activity heatmap**
- import twitter export json + zip
- export current bookmarks
- auto-categorize by url

---

## how it works

```mermaid
flowchart td
  a[export twitter bookmarks json + zip] --> b[upload in ui]
  b --> c{local mode?}
  c -->|yes| d[local api writes to data/db.json]
  c -->|no| e[backend parses and stores in postgres]
  d --> f[frontend renders cards, tags, stats]
  e --> f
```

1. export bookmarks using [Twitter Web Exporter](https://github.com/prinsss/twitter-web-exporter)
2. upload json + zip in the ui
3. local mode stores data in `frontend/data/db.json`
4. full stack mode stores data in postgres
5. export generates a file from current data

---

## usage

frontend only:

```bash
cd frontend
npm install
npm run dev
```

full stack:

```bash
cd frontend
npm install
npm run dev
```

```bash
cd backend
go mod tidy
go run cmd/server/main.go
```

backend env:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=chudvault
SERVER_PORT=8080
```

---

## project structure

```
backend/
  cmd/server/main.go
  internal/api/handlers/
  internal/services/
frontend/
  src/app/
  src/components/
  data/          <-- Local storage location
docs/
```

---

 ## license
 
 mit

 ![G-GHDx-WYAAK5L_](https://github.com/user-attachments/assets/e6046790-3229-4bfb-9a07-e4776dbfe591)
