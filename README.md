<p align="center">
  <img src="https://github.com/user-attachments/assets/50fad90d-334a-43e1-a0f5-a8a8ae7d7c98" width="200" alt="chudvault logo" />
</p>

<p align="center">
  full-stack app to manage, tag, search, and archive twitter bookmarks.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-mit-black" />
  <img src="https://img.shields.io/badge/node-14%2B-black" />
  <img src="https://img.shields.io/badge/next.js-15-black" />
  <img src="https://img.shields.io/badge/go-1.18%2B-black" />
</p>


---

## quickstart

```bash
git clone https://github.com/Microck/chudvault.git
cd chudvault
docker compose up --build
```

frontend: http://localhost:3000
backend: http://localhost:8080


---

## features

- **modern ui/ux**: rebuilt with shadcn/ui, tailwind css, and animations for a premium feel
- **bookmark management**: view detailed bookmarks with full text, clickable links, images, and media
- **tagging system**: 
  - create, rename, and delete custom tags
  - fixed standard tags ("to do", "to read")
  - toggle completion status
- **search & filter**: instant search and tag filtering
- **batch operations**: select multiple bookmarks to delete or archive
- **statistics dashboard**: visualize your bookmark habits and top tags
- **data import**: simple drag-and-drop upload for twitter export zips (use [Twitter Web Exporter](https://github.com/prinsss/twitter-web-exporter))
- **markdown export**: export your curated collection to markdown
- **auto-categorization**: automatic badges for github, youtube, articles, etc.


---

## how it works

1. export bookmarks using [Twitter Web Exporter](https://github.com/prinsss/twitter-web-exporter) (json + zip)
2. backend parses and stores in postgres
3. frontend renders cards, tags, stats, and filters
4. export generates markdown from current data

---

## usage

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

env:
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
docs/
```

---

## license

mit

![G-GHDx-WYAAK5L_](https://github.com/user-attachments/assets/e6046790-3229-4bfb-9a07-e4776dbfe591)

