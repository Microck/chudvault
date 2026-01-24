import { unzipSync } from 'fflate';
import type { Bookmark, Tag } from '@/types';

type StoredMedia = {
  id: number;
  tweet_id: string;
  type: string;
  url: string;
  thumbnail: string;
  original: string;
  file_name: string;
  blob: Blob | null;
};

type StoredTag = Tag & { completed: boolean };

type StoredBookmark = Bookmark & {
  media: StoredMedia[];
  tags: StoredTag[];
};

type DbState = {
  bookmarks: StoredBookmark[];
  tags: StoredTag[];
  version: number;
};

const DB_NAME = 'chudvault-local';
const STORE_NAME = 'state';
const STATE_KEY = 'root';
const DB_VERSION = 1;

const USE_API_STORAGE = typeof window !== 'undefined';

const STANDARD_TAGS = ['To do', 'To read'];

type TwitterBookmark = {
  id: string;
  created_at: string;
  full_text: string;
  screen_name: string;
  name: string;
  profile_image_url: string;
  in_reply_to?: string | null;
  retweeted_status?: string | null;
  quoted_status?: string | null;
  favorite_count: number;
  retweet_count: number;
  bookmark_count: number;
  quote_count: number;
  reply_count: number;
  views_count: number;
  favorited: boolean;
  retweeted: boolean;
  bookmarked: boolean;
  url: string;
  metadata: unknown;
  media: Array<{
    type: string;
    url: string;
    thumbnail: string;
    original: string;
  }>;
};


let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
       console.error('IndexedDB not supported');
       reject(new Error('IndexedDB not supported'));
       return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onblocked = () => {
       console.error('openDb blocked');
    };

    request.onsuccess = () => {
        resolve(request.result);
    }
    request.onerror = () => {
        console.error('openDb onerror', request.error);
        dbPromise = null;
        reject(request.error);
    }
  });
  return dbPromise;
}

async function readState(): Promise<DbState> {
  if (USE_API_STORAGE) {
    const res = await fetch('/api/db');
    if (!res.ok) {
      throw new Error(`Failed to read DB: ${res.status}`);
    }
    return res.json();
  }

  const db = await openDb();
  
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);

      request.onsuccess = () => {
        const data = request.result as DbState | undefined;
        if (data) {
          resolve(data);
          return;
        }

        resolve({
          bookmarks: [],
          tags: STANDARD_TAGS.map((name, index) => ({
            id: index + 1,
            name,
            created_at: new Date().toISOString(),
            completed: false,
          })),
          version: DB_VERSION,
        });
      };

      request.onerror = () => {
          console.error('readState request error', request.error);
          reject(request.error);
      }
    } catch (e) {
      console.error('readState transaction error', e);
      reject(e);
    }
  });
}

async function writeState(state: DbState): Promise<void> {
  if (USE_API_STORAGE) {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (!res.ok) {
      throw new Error(`Failed to write DB: ${res.status}`);
    }
    return;
  }

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(state, STATE_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function slugifyTag(name: string): string {
  return name.trim().toLowerCase();
}

function buildTagIndex(tags: StoredTag[]): Map<string, StoredTag> {
  const map = new Map<string, StoredTag>();
  tags.forEach((tag) => {
    map.set(slugifyTag(tag.name), tag);
  });
  return map;
}

function ensureTag(tags: StoredTag[], tagName: string): StoredTag {
  const normalized = slugifyTag(tagName);
  const existing = tags.find((tag) => slugifyTag(tag.name) === normalized);
  if (existing) return existing;

  const newTag: StoredTag = {
    id: Math.max(0, ...tags.map((t) => t.id)) + 1,
    name: tagName,
    created_at: new Date().toISOString(),
    completed: false,
  };
  tags.push(newTag);
  return newTag;
}

function resolveMediaFileName(screenName: string, tweetId: string, mediaType: string, index: number) {
  const ext = mediaType === 'video' ? '.mp4' : mediaType === 'photo' ? '.jpg' : '';
  return `${screenName}_${tweetId}_${mediaType}_${index}${ext}`;
}

async function readFileText(file: File): Promise<string> {
  if (typeof (file as File & { text?: () => Promise<string> }).text === 'function') {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function readFileArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof (file as File & { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

async function readJsonFile(file: File): Promise<TwitterBookmark[]> {
  const text = await readFileText(file);
  return JSON.parse(text) as TwitterBookmark[];
}

async function unzipMedia(zipFile: File): Promise<Record<string, Uint8Array>> {
  const arrayBuffer = await readFileArrayBuffer(zipFile);
  const data = new Uint8Array(arrayBuffer);
  return unzipSync(data);
}

function lookupFile(files: Record<string, Uint8Array>, fileName: string) {
  const file = files[`data/media/${fileName}`] ?? files[fileName];
  return file ?? null;
}

function toMedia(bookmark: TwitterBookmark, fileMap: Record<string, Uint8Array>): StoredMedia[] {
  if (!bookmark.media || bookmark.media.length === 0) return [];

  return bookmark.media.map((media, index) => {
    const fileName = resolveMediaFileName(bookmark.screen_name, bookmark.id, media.type, index + 1);
    const data = lookupFile(fileMap, fileName);
    const blob = data ? new Blob([data.slice().buffer], { type: media.type === 'video' ? 'video/mp4' : 'image/jpeg' }) : null;
    const url = blob ? URL.createObjectURL(blob) : media.url;
    const thumbnail = blob && media.type === 'image' ? url : media.thumbnail;
    const original = blob ? url : media.original;

    return {
      id: index + 1,
      tweet_id: bookmark.id,
      type: media.type,
      url,
      thumbnail,
      original,
      file_name: fileName,
      blob,
    };
  });
}

function mapBookmarks(raw: TwitterBookmark[], fileMap: Record<string, Uint8Array>): StoredBookmark[] {
  return raw.map((bookmark) => {
    const media = toMedia(bookmark, fileMap);
    return {
      id: bookmark.id,
      created_at: new Date(bookmark.created_at).toISOString(),
      full_text: bookmark.full_text,
      screen_name: bookmark.screen_name,
      name: bookmark.name,
      profile_image_url: bookmark.profile_image_url,
      favorite_count: bookmark.favorite_count,
      retweet_count: bookmark.retweet_count,
      bookmark_count: bookmark.bookmark_count,
      quote_count: bookmark.quote_count,
      reply_count: bookmark.reply_count,
      views_count: bookmark.views_count,
      url: bookmark.url,
      media,
      tags: [],
      archived: false,
    };
  });
}

function mapTagsFromBookmarks(bookmarks: StoredBookmark[], tags: StoredTag[]) {
  const tagIndex = buildTagIndex(tags);

  bookmarks.forEach((bookmark) => {
    const words = bookmark.full_text.split(/\s+/);
    words.forEach((word) => {
      if (!word.startsWith('#')) return;
      const cleaned = word.replace(/[^\w#]/g, '').slice(1);
      if (!cleaned) return;
      const tagName = cleaned.replace(/_/g, ' ').replace(/-/g, ' ');
      if (!tagName) return;
      const tag = ensureTag(tags, tagName);
      const existing = bookmark.tags.find((t) => t.id === tag.id);
      if (!existing) {
        bookmark.tags.push({ ...tag, completed: false });
      }
      tagIndex.set(slugifyTag(tag.name), tag);
    });
  });
}

function applyBookmarkTags(bookmarks: StoredBookmark[], tagIndex: Map<string, StoredTag>, tagNames?: string[]) {
  if (!tagNames || tagNames.length === 0) return;
  const tags = tagNames.map((name) => {
    const existing = tagIndex.get(slugifyTag(name));
    if (existing) return existing;
    const created = {
      id: Math.max(0, ...Array.from(tagIndex.values()).map((t) => t.id)) + 1,
      name,
      created_at: new Date().toISOString(),
      completed: false,
    };
    tagIndex.set(slugifyTag(name), created);
    return created;
  });

  bookmarks.forEach((bookmark) => {
    tags.forEach((tag) => {
      if (!bookmark.tags.find((t) => t.id === tag.id)) {
        bookmark.tags.push({ ...tag, completed: false });
      }
    });
  });
}

function refreshTagList(state: DbState) {
  const tagIndex = buildTagIndex(state.tags);
  state.bookmarks.forEach((bookmark) => {
    bookmark.tags.forEach((tag) => {
      if (!tagIndex.has(slugifyTag(tag.name))) {
        const storedTag: StoredTag = {
          id: tag.id,
          name: tag.name,
          created_at: tag.created_at,
          completed: tag.completed ?? false,
        };
        tagIndex.set(slugifyTag(tag.name), storedTag);
        state.tags.push(storedTag);
      }
    });
  });
}

function serializeBookmarks(bookmarks: StoredBookmark[]): Bookmark[] {
  return bookmarks.map((bookmark) => ({
    ...bookmark,
    media: bookmark.media.map((media) => ({
      id: media.id,
      tweet_id: media.tweet_id,
      type: media.type,
      url: media.url,
      thumbnail: media.thumbnail,
      original: media.original,
      file_name: media.file_name,
    })),
    tags: bookmark.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      created_at: tag.created_at,
      completed: tag.completed,
    })),
  }));
}

export const localStore = {
  async clearAll() {
    const state: DbState = {
      bookmarks: [],
      tags: STANDARD_TAGS.map((name, index) => ({
        id: index + 1,
        name,
        created_at: new Date().toISOString(),
        completed: false,
      })),
      version: DB_VERSION,
    };
    await writeState(state);
    return { message: 'Cleared all data' };
  },

  async importBookmarks(jsonFile: File, zipFile: File) {
    const [rawBookmarks, fileMap] = await Promise.all([
      readJsonFile(jsonFile),
      unzipMedia(zipFile),
    ]);

    const state = await readState();
    const bookmarks = mapBookmarks(rawBookmarks, fileMap);
    refreshTagList(state);

    state.bookmarks = bookmarks;
    await writeState(state);

    return { count: bookmarks.length };
  },

  async listBookmarks(params?: {
    tag?: string;
    search?: string;
    page?: number;
    limit?: number;
    archived?: boolean;
    date?: string;
  }) {
    const state = await readState();
    const archived = params?.archived ?? false;
    let items = state.bookmarks.filter((bookmark) => bookmark.archived === archived);

    if (params?.date) {
      items = items.filter((bookmark) => bookmark.created_at.startsWith(params.date!));
    }

    if (params?.tag) {
      items = items.filter((bookmark) => bookmark.tags.some((tag) => tag.name === params.tag));
    }

    if (params?.search) {
      const query = params.search.toLowerCase();
      items = items.filter((bookmark) =>
        bookmark.full_text.toLowerCase().includes(query) ||
        bookmark.name.toLowerCase().includes(query) ||
        bookmark.screen_name.toLowerCase().includes(query),
      );
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 12;
    const start = (page - 1) * limit;
    const pageItems = items.slice(start, start + limit);

    return {
      bookmarks: serializeBookmarks(pageItems),
      total: items.length,
    };
  },

  async getBookmark(id: string) {
    const state = await readState();
    const bookmark = state.bookmarks.find((item) => item.id === id);
    if (!bookmark) throw new Error('Bookmark not found');
    return serializeBookmarks([bookmark])[0];
  },

  async deleteBookmark(id: string) {
    const state = await readState();
    state.bookmarks = state.bookmarks.filter((bookmark) => bookmark.id !== id);
    refreshTagList(state);
    await writeState(state);
    return { message: 'Bookmark deleted successfully' };
  },

  async updateBookmarkTags(id: string, tagNames: string[]) {
    const state = await readState();
    const bookmark = state.bookmarks.find((item) => item.id === id);
    if (!bookmark) throw new Error('Bookmark not found');

    const tagIndex = buildTagIndex(state.tags);
    bookmark.tags = tagNames.map((name) => ({
      ...ensureTag(state.tags, name),
      completed: false,
    }));

    applyBookmarkTags([bookmark], tagIndex, tagNames);
    refreshTagList(state);
    await writeState(state);
    return { message: 'Tags updated successfully' };
  },

  async toggleTagCompletion(bookmarkId: string, tagName: string) {
    const state = await readState();
    const bookmark = state.bookmarks.find((item) => item.id === bookmarkId);
    if (!bookmark) throw new Error('Bookmark not found');
    const tag = bookmark.tags.find((t) => t.name === tagName);
    if (!tag) throw new Error('Tag not found');

    tag.completed = !tag.completed;
    await writeState(state);
    return { completed: tag.completed };
  },

  async toggleArchiveBookmark(id: string) {
    const state = await readState();
    const bookmark = state.bookmarks.find((item) => item.id === id);
    if (!bookmark) throw new Error('Bookmark not found');
    bookmark.archived = !bookmark.archived;
    await writeState(state);
    return { message: 'Bookmark archive status toggled successfully' };
  },

  async listTags() {
    const state = await readState();
    refreshTagList(state);
    await writeState(state);
    return state.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      created_at: tag.created_at,
      completed: tag.completed,
    }));
  },

  async createTag(name: string) {
    const state = await readState();
    const tag = ensureTag(state.tags, name);
    await writeState(state);
    return tag;
  },

  async updateTag(id: string, name: string) {
    const state = await readState();
    const tag = state.tags.find((t) => t.id === Number(id));
    if (!tag) throw new Error('Tag not found');
    tag.name = name;
    state.bookmarks.forEach((bookmark) => {
      bookmark.tags.forEach((bookmarkTag) => {
        if (bookmarkTag.id === tag.id) {
          bookmarkTag.name = name;
        }
      });
    });
    await writeState(state);
    return tag;
  },

  async deleteTag(id: string) {
    const state = await readState();
    const tagId = Number(id);
    state.tags = state.tags.filter((tag) => tag.id !== tagId);
    state.bookmarks.forEach((bookmark) => {
      bookmark.tags = bookmark.tags.filter((bookmarkTag) => bookmarkTag.id !== tagId) as StoredTag[];
    });
    await writeState(state);
    return { message: 'Tag deleted successfully' };
  },

  async getTagBookmarkCount(id: string) {
    const state = await readState();
    const tagId = Number(id);
    const count = state.bookmarks.filter((bookmark) => bookmark.tags.some((tag) => tag.id === tagId)).length;
    return { count };
  },

  async getStatistics() {
    const state = await readState();
    const total = state.bookmarks.length;
    const archived = state.bookmarks.filter((bookmark) => bookmark.archived).length;
    const active = total - archived;
    const tagCounts = new Map<string, { count: number; completed_count: number }>();


    const heatmap = new Map<string, number>();

    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        heatmap.set(dateStr, 0);
    }

    let missingCreatedAt = 0;
    let outOfRange = 0;

    state.bookmarks.forEach((bookmark) => {
      if (!bookmark.created_at) {
        missingCreatedAt += 1;
        return;
      }

      const date = bookmark.created_at.split('T')[0];
      if (!heatmap.has(date)) {
        outOfRange += 1;
      }

      heatmap.set(date, (heatmap.get(date) ?? 0) + 1);

      bookmark.tags.forEach((tag) => {
        const current = tagCounts.get(tag.name) ?? { count: 0, completed_count: 0 };
        current.count += 1;
        if (tag.completed) current.completed_count += 1;
        tagCounts.set(tag.name, current);
      });
    });

    const heatmapData = Array.from(heatmap.entries())
      .map(([date, count]) => ({
        date,
        count,
        level: Math.min(4, Math.ceil(count / 2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (debugHeatmap) {
      const activeDays = heatmapData.filter((d) => d.count > 0).length;
      const maxCount = heatmapData.reduce((acc, d) => (d.count > acc ? d.count : acc), 0);
      console.log('[heatmap]', {
        bookmarks: state.bookmarks.length,
        days: heatmapData.length,
        activeDays,
        maxCount,
        missingCreatedAt,
        outOfRange,
      });
    }

    const topTags = Array.from(tagCounts.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count);

    STANDARD_TAGS.forEach((name) => {
      if (!tagCounts.has(name)) {
        topTags.unshift({ name, count: 0, completed_count: 0 });
      }
    });

    return {
      total_bookmarks: total,
      active_bookmarks: active,
      archived_bookmarks: archived,
      total_tags: state.tags.length,
      top_tags: topTags,
      heatmap: heatmapData,
    };
  },
};
