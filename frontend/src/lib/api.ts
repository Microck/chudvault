import { localStore } from './localStore';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/api';
const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true' || process.env.NEXT_PUBLIC_LOCAL_MODE === '1';

interface Statistics {
  total_bookmarks: number;
  active_bookmarks: number;
  archived_bookmarks: number;
  total_tags: number;
  top_tags: Array<{
    name: string;
    count: number;
    completed_count: number;
  }>;
  heatmap: Array<{
    date: string;
    count: number;
    level: number;
  }>;
}

const handleApiError = (error: unknown, endpoint: string) => {
  console.error(`API Error (${endpoint}):`, error);
  throw error;
};

export const api = {
  async getBookmarks(params?: {
    tag?: string;
    search?: string;
    page?: number;
    limit?: number;
    archived?: boolean;
    date?: string;
  }) {
    if (LOCAL_MODE) {
      return localStore.listBookmarks(params);
    }
    try {
      const searchParams = new URLSearchParams();
      if (params?.tag) searchParams.append('tag', params.tag);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.date) searchParams.append('date', params.date);
      searchParams.append('archived', (params?.archived ?? false).toString());

      const url = `${API_BASE_URL}/bookmarks?${searchParams.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      return handleApiError(error, 'getBookmarks');
    }
  },

  async getTags() {
    if (LOCAL_MODE) {
      return localStore.listTags();
    }
    const res = await fetch(`${API_BASE_URL}/tags`);
    return res.json();
  },

  async updateBookmarkTags(id: string, tags: string[]) {
    if (LOCAL_MODE) {
      return localStore.updateBookmarkTags(id, tags);
    }
    const res = await fetch(`${API_BASE_URL}/bookmarks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    return res.json();
  },

  async uploadBookmarks(jsonFile: File, zipFile: File | null) {
    if (LOCAL_MODE) {
      return localStore.importBookmarks(jsonFile, zipFile);
    }
    const formData = new FormData();
    formData.append('jsonFile', jsonFile);
    if (zipFile) {
      formData.append('zipFile', zipFile);
    }

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async updateTag(id: string, name: string) {
    if (LOCAL_MODE) {
      return localStore.updateTag(id, name);
    }
    const res = await fetch(`${API_BASE_URL}/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return res.json();
  },

  async deleteTag(id: string) {
    if (LOCAL_MODE) {
      return localStore.deleteTag(id);
    }
    const res = await fetch(`${API_BASE_URL}/tags/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getTagBookmarkCount(id: string) {
    if (LOCAL_MODE) {
      return localStore.getTagBookmarkCount(id);
    }
    const res = await fetch(`${API_BASE_URL}/tags/${id}/count`);
    return res.json();
  },

  async deleteBookmark(id: string) {
    if (LOCAL_MODE) {
      return localStore.deleteBookmark(id);
    }
    const res = await fetch(`${API_BASE_URL}/bookmarks/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getBookmark(id: string) {
    if (LOCAL_MODE) {
      return localStore.getBookmark(id);
    }
    const res = await fetch(`${API_BASE_URL}/bookmarks/${id}`);
    return res.json();
  },

  async getStatistics(): Promise<Statistics> {
    if (LOCAL_MODE) {
      return localStore.getStatistics();
    }
    const res = await fetch(`${API_BASE_URL}/statistics`);
    return res.json();
  },

  async toggleArchiveBookmark(id: string) {
    if (LOCAL_MODE) {
      return localStore.toggleArchiveBookmark(id);
    }
    const res = await fetch(`${API_BASE_URL}/bookmarks/${id}/toggle-archive`, {
      method: 'POST',
    });
    return res.json();
  },

  async createTag(name: string) {
    if (LOCAL_MODE) {
      return localStore.createTag(name);
    }
    const res = await fetch(`${API_BASE_URL}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return res.json();
  },

  async toggleTagCompletion(bookmarkId: string, tagName: string) {
    if (LOCAL_MODE) {
      return localStore.toggleTagCompletion(bookmarkId, tagName);
    }
    const res = await fetch(`${API_BASE_URL}/bookmarks/${bookmarkId}/tags/${tagName}/toggle-completion`, {
      method: 'POST',
    });
    const data = await res.json();
    return data;
  },

  async exportBookmarks(): Promise<Blob> {
    if (LOCAL_MODE) {
      const data = await localStore.listBookmarks({ page: 1, limit: Number.MAX_SAFE_INTEGER, archived: false });
      const payload = JSON.stringify(data.bookmarks, null, 2);
      return new Blob([payload], { type: 'application/json' });
    }
    const response = await fetch(`${API_BASE_URL}/bookmarks/export`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to export bookmarks');
    }

    const data = await response.text();
    return new Blob([data], { type: 'text/markdown' });
  },

  async clearAll() {
    if (LOCAL_MODE) {
      return localStore.clearAll();
    }
    throw new Error('Not implemented in full stack mode');
  },
};
