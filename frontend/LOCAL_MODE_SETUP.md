# local mode setup

## overview

frontend now supports local-only mode with indexeddb storage for bookmarks and media. no backend required.

## how to use

1. create `.env.local` file in frontend directory:

```bash
# enable local mode (no backend required)
NEXT_PUBLIC_LOCAL_MODE=true
```

2. start frontend:

```bash
cd frontend
npm run dev
```

3. import bookmarks via upload button:
   - select your `bookmarks.json` file from twitter data export
   - select your `data/media.zip` file (contains images/videos)
   - upload both files, bookmarks stored in browser indexeddb
   - all features work: search, tags, archive, statistics

4. export bookmarks:
   - click "export" to download your bookmarks as json
   - data stored in browser persists across page reloads

## features supported

- search & filter: search by text, author, or tag
- tags: create custom tags, auto-extract hashtags
- archive: toggle archive status
- statistics: totals and top tags
- media support: images and videos from zip
- pagination: navigate with page size
- responsive design: works on all screen sizes

## technical details

- indexeddb name: `chudvault-local`
- storage limit: ~50mb+ per origin
- data persistence: survives page reloads
- media handling: images converted to blob urls
- tag system: case-insensitive, supports "to do" and "to read"

## notes

- no backend server needed, all data lives in browser
- exported json can be re-imported
- zip media files are processed and embedded as blob urls
- performance: in-memory operations before indexeddb write

## troubleshooting

if bookmarks don't appear:
1. check browser console for indexeddb errors
2. verify `.env.local` exists with `NEXT_PUBLIC_LOCAL_MODE=true`
3. clear browser data and re-import
