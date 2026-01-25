'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Bookmark } from '@/types';
import { api } from '@/lib/api';
import { BookmarkListItem } from '@/components/bookmarks/BookmarkListItem';
import { BookmarkCard } from '@/components/bookmarks/BookmarkCard';
import { Button } from '@/components/ui/button';
import { UploadModal } from '@/components/bookmarks/UploadModal';
import { SearchAndFilter, SearchAndFilterRef } from '@/components/bookmarks/SearchAndFilter';
import { SelectionToolbar } from '@/components/bookmarks/SelectionToolbar';
import { Statistics } from '@/components/bookmarks/Statistics';
import { StatisticsRef } from '@/components/bookmarks/Statistics';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Upload, FileText, Check, Square, Trash2, LayoutGrid, List } from 'lucide-react';
import { DotPattern } from '@/components/ui/dot-pattern';
import { cn } from '@/lib/utils';
import { AISettingsModal } from '@/components/bookmarks/AISettingsModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function Home() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<string>();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedSize = localStorage.getItem('bookmark-page-size');
      return savedSize ? Number(savedSize) : 20;
    }
    return 20;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchAndFilterRef = useRef<SearchAndFilterRef>(null);
  const statisticsRef = useRef<StatisticsRef>(null);
  const mainRef = useRef<HTMLElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && currentPage < totalPages && !isLoading) {
          loadBookmarks(currentPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [currentPage, totalPages, isLoading, loadBookmarks]);

  useKeyboardShortcuts({
    onNext: () => {
      setFocusedIndex(prev => {
        const next = Math.min(prev + 1, filteredBookmarks.length - 1);
        if (next !== prev) {
          const element = document.getElementById(`bookmark-${filteredBookmarks[next].id}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return next;
      });
    },
    onPrevious: () => {
      setFocusedIndex(prev => {
        const next = Math.max(prev - 1, 0);
        if (next !== prev) {
          const element = document.getElementById(`bookmark-${filteredBookmarks[next].id}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return next;
      });
    },
    onArchive: () => {
      if (focusedIndex >= 0 && focusedIndex < filteredBookmarks.length) {
        handleArchive(filteredBookmarks[focusedIndex].id);
      }
    },
    onSearch: () => {
      searchAndFilterRef.current?.focusSearch();
    },
    onSelect: () => {
      if (focusedIndex >= 0 && focusedIndex < filteredBookmarks.length) {
        if (!isSelectMode) setIsSelectMode(true);
        handleToggleSelect(filteredBookmarks[focusedIndex].id);
      }
    },
    onDelete: () => {
      if (selectedBookmarks.size > 0) {
        setIsDeleteModalOpen(true);
      }
    },
  });

  const loadBookmarks = useCallback(async (pageToLoad = 1) => {
    setIsLoading(true);
    if (pageToLoad === 1) {
        scrollPositionRef.current = window.scrollY;
    }

    try {
      const data = await api.getBookmarks({
        tag: selectedTag,
        search: searchQuery,
        page: pageToLoad,
        limit: pageSize,
        archived: showArchived,
        date: selectedDate,
      });

      setBookmarks(prev => pageToLoad === 1 ? (data.bookmarks || []) : [...prev, ...(data.bookmarks || [])]);
      setTotalPages(Math.ceil(data.total / pageSize));
      setCurrentPage(pageToLoad);
      
      if (pageToLoad === 1 && mainRef.current) {
        window.scrollTo(0, scrollPositionRef.current);
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      if (pageToLoad === 1) setBookmarks([]);
    }
    setIsLoading(false);
  }, [selectedTag, searchQuery, pageSize, showArchived, selectedDate]);

  useEffect(() => {
    loadBookmarks(1);
  }, [loadBookmarks]);

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('bookmark-view-mode', mode);
  };

  async function handleUpdateTags(id: string, tags: string[]) {
    try {
      await api.updateBookmarkTags(id, tags);
      setBookmarks(currentBookmarks => 
        currentBookmarks.map(bookmark => 
          bookmark.id === id 
            ? { ...bookmark, tags: tags.map((name, index) => ({ 
                id: -index - 1,
                name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })) }
            : bookmark
        )
      );
      searchAndFilterRef.current?.loadTags();
      statisticsRef.current?.refresh();
    } catch (error) {
      console.error('Failed to update tags:', error);
    }
  }

  async function handleDeleteTag(tagName: string) {
    try {
      setBookmarks(currentBookmarks => 
        currentBookmarks.map(bookmark => ({
          ...bookmark,
          tags: bookmark.tags.filter(tag => tag.name !== tagName)
        }))
      );
      statisticsRef.current?.refresh();
    } catch (error) {
      console.error('Failed to handle tag deletion:', error);
    }
  }

  async function handleClearAll() {
    try {
      await api.clearAll();
      setSelectedTag(undefined);
      setSelectedDate(undefined);
      setSearchQuery('');
      setCurrentPage(1);
      setSelectedBookmarks(new Set());
      setIsSelectMode(false);
      setIsClearModalOpen(false);
      searchAndFilterRef.current?.loadTags();
      statisticsRef.current?.refresh();
      await loadBookmarks();
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
  }

  function handleTagSelect(tag: string | undefined) {
    setSelectedTag(tag);
    setCurrentPage(1);
  }

  function handleDateSelect(date: string | undefined) {
    setSelectedDate(date);
    setCurrentPage(1);
  }

  async function handleDeleteBookmark(id: string) {
    try {
      await api.deleteBookmark(id);
      setBookmarks(currentBookmarks => 
        currentBookmarks.filter(bookmark => bookmark.id !== id)
      );
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  }

  function toggleSelectMode() {
    setIsSelectMode(!isSelectMode);
    setSelectedBookmarks(new Set());
  }

  function handleToggleSelect(id: string) {
    setSelectedBookmarks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  async function handleDeleteSelected() {
    try {
      const deletePromises = Array.from(selectedBookmarks).map(id => 
        api.deleteBookmark(id)
      );
      await Promise.all(deletePromises);
      
      setBookmarks(currentBookmarks => 
        currentBookmarks.filter(bookmark => !selectedBookmarks.has(bookmark.id))
      );
      setSelectedBookmarks(new Set());
      setIsSelectMode(false);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Failed to delete bookmarks:', error);
    }
  }

  function handlePageSizeChange(newSize: string) {
    const size = parseInt(newSize);
    setPageSize(size);
    localStorage.setItem('bookmark-page-size', newSize);
    setCurrentPage(1);
  }

  const handleArchive = async (id: string) => {
    try {
      await api.toggleArchiveBookmark(id);
      loadBookmarks();
    } catch (error) {
      console.error('Failed to archive bookmark:', error);
    }
  };

  const exportToMarkdown = async () => {
    try {
      const allBookmarks: Bookmark[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await api.getBookmarks({ page, limit: 100, archived: false });
        allBookmarks.push(...response.bookmarks);
        hasMore = page < Math.ceil(response.total / 100);
        page++;
      }

      if (allBookmarks.length === 0) {
        alert('No bookmarks to export');
        return;
      }

      const markdown = generateMarkdown(allBookmarks);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chudvault-export-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export bookmarks:', error);
      alert('Failed to export bookmarks');
    }
  };

  const generateMarkdown = (bookmarks: Bookmark[]): string => {
    const groupedByDate = bookmarks.reduce((acc, bookmark) => {
      const date = new Date(bookmark.created_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!acc[date]) acc[date] = [];
      acc[date].push(bookmark);
      return acc;
    }, {} as Record<string, Bookmark[]>);

    let markdown = `# ChudVault Export\n\nExported: ${new Date().toISOString()}\nTotal Bookmarks: ${bookmarks.length}\n\n---\n\n`;

    Object.entries(groupedByDate).forEach(([date, items]) => {
      markdown += `## ${date}\n\n`;

      items.forEach(bookmark => {
        const tags = bookmark.tags.map(t => `\`${t.name}\``).join(', ');
        const categoryBadge = bookmark.category ? `[${bookmark.category.toUpperCase()}]` : '';

        markdown += `### ${categoryBadge} ${bookmark.name} (@${bookmark.screen_name})\n\n`;
        markdown += `**Tweet:** ${bookmark.full_text}\n\n`;
        markdown += `**URL:** ${bookmark.url}\n\n`;
        markdown += `**Date:** ${new Date(bookmark.created_at).toLocaleString()}\n\n`;
        if (tags) markdown += `**Tags:** ${tags}\n\n`;
        if (bookmark.media?.length > 0) {
          markdown += `**Media:** ${bookmark.media.length} attachment(s)\n\n`;
        }
        markdown += `**Stats:** ♥ ${bookmark.favorite_count} | 🔄 ${bookmark.retweet_count} | 👁 ${bookmark.views_count}\n\n`;
        markdown += `---\n\n`;
      });
    });

    return markdown;
  };

  const filteredBookmarks = bookmarks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) ?? [];

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden">
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]",
          "opacity-40 text-primary/30"
        )}
      />
      <main ref={mainRef} className="container relative z-10 mx-auto px-6 py-12 max-w-7xl">
        <div className="mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">chudvault</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ThemeToggle />
          <AISettingsModal />
          <div className="flex bg-muted rounded-md p-1 gap-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => toggleViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => toggleViewMode('list')}
              title="List View"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant={showArchived ? "default" : "secondary"}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </Button>
          <Button
            variant={isSelectMode ? "secondary" : "outline"}
            onClick={toggleSelectMode}
          >
            {isSelectMode ? <Square className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
            {isSelectMode ? 'Cancel' : 'Select'}
          </Button>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="animate-pulse hover:animate-none"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button
            variant="outline"
            onClick={exportToMarkdown}
          >
            <FileText className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsClearModalOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsModalOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      <div className="mb-8">
        <Statistics 
          ref={statisticsRef}
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
        />
      </div>

      <div className="mb-8">
        <SearchAndFilter
          ref={searchAndFilterRef}
          onSearch={handleSearch}
          onTagSelect={handleTagSelect}
          selectedTag={selectedTag}
          onDeleteTag={handleDeleteTag}
        />
      </div>

      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading bookmarks...</p>
          </div>
        </div>
      ) : (
        <>
          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
              : "grid-cols-1 max-w-4xl mx-auto"
          )}>
            {filteredBookmarks.map((bookmark, index) => (
              <div 
                key={bookmark.id} 
                id={`bookmark-${bookmark.id}`}
                className="animate-fade-in opacity-0 [animation-fill-mode:forwards]" 
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {viewMode === 'grid' ? (
                  <BookmarkCard
                    bookmark={bookmark}
                    onUpdateTags={handleUpdateTags}
                    onDelete={handleDeleteBookmark}
                    onArchive={handleArchive}
                    isArchived={bookmark.archived}
                    isSelectable={isSelectMode}
                    isSelected={selectedBookmarks.has(bookmark.id)}
                    onToggleSelect={handleToggleSelect}
                    isFocused={index === focusedIndex}
                  />
                ) : (
                  <BookmarkListItem
                    bookmark={bookmark}
                    onUpdateTags={handleUpdateTags}
                    onDelete={handleDeleteBookmark}
                    onArchive={handleArchive}
                    isArchived={bookmark.archived}
                    isSelectable={isSelectMode}
                    isSelected={selectedBookmarks.has(bookmark.id)}
                    onToggleSelect={handleToggleSelect}
                    isFocused={index === focusedIndex}
                  />
                )}
              </div>
            ))}
          </div>

          {filteredBookmarks.length === 0 && (
            <div className="mt-12 text-center text-muted-foreground">
              No bookmarks found
            </div>
          )}

          {filteredBookmarks.length > 0 && (
            <div ref={observerTarget} className="h-20 w-full flex items-center justify-center p-4">
              {isLoading && currentPage > 1 && (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
          )}
        </>
      )}

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setCurrentPage(1);
          loadBookmarks();
        }}
      />

      {isSelectMode && selectedBookmarks.size > 0 && (
        <SelectionToolbar
          selectedCount={selectedBookmarks.size}
          onClearSelection={() => setSelectedBookmarks(new Set())}
          onDeleteSelected={() => setIsDeleteModalOpen(true)}
        />
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-destructive/10 border-destructive/20 border rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold mb-3 text-destructive-foreground">Delete Bookmarks</h3>
            <p className="mb-6 text-muted-foreground">
              Are you sure you want to delete {selectedBookmarks.size} selected bookmark{selectedBookmarks.size !== 1 ? 's' : ''}?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteSelected}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {isClearModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-destructive/10 border-destructive/20 border rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold mb-3 text-destructive-foreground">Reset ChudVault</h3>
            <p className="mb-6 text-muted-foreground">
              This will permanently delete all bookmarks and tags from your local storage (data/db.json).
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsClearModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClearAll}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
