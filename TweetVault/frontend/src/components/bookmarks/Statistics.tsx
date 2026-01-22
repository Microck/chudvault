import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { api } from '@/lib/api';
import { eventBus } from '@/lib/eventBus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bookmark, Archive, Tag, CheckSquare, ListTodo, Hash } from 'lucide-react';

export interface StatisticsRef {
  refresh: () => void;
}

export const Statistics = forwardRef<StatisticsRef>((_, ref) => {
  const [stats, setStats] = useState<{
    total_bookmarks: number;
    active_bookmarks: number;
    archived_bookmarks: number;
    total_tags: number;
    top_tags: Array<{ 
      name: string; 
      count: number;
      completed_count: number; 
    }>;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  async function loadStatistics() {
    try {
      const data = await api.getStatistics();
      setStats(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useImperativeHandle(ref, () => ({
    refresh: loadStatistics
  }));

  useEffect(() => {
    const refreshHandler = () => loadStatistics();
    eventBus.on("tagUpdated", refreshHandler);
    return () => {
      eventBus.off("tagUpdated", refreshHandler);
    };
  }, []);

  useEffect(() => {
    loadStatistics();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full animate-pulse space-y-4">
        <div className="h-32 bg-muted rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookmarks</CardTitle>
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_bookmarks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_bookmarks} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.archived_bookmarks}</div>
            <p className="text-xs text-muted-foreground">
              Stored safely
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Read</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.top_tags.find(t => t.name === 'To read')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.top_tags.find(t => t.name === 'To read')?.completed_count || 0} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Do</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.top_tags.find(t => t.name === 'To do')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.top_tags.find(t => t.name === 'To do')?.completed_count || 0} completed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Popular Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.top_tags
                .filter(tag => tag.name !== 'To do' && tag.name !== 'To read')
                .slice(0, 5)
                .map((tag) => (
                  <div key={tag.name} className="flex items-center">
                    <div className="flex items-center gap-2 flex-1">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium leading-none">{tag.name}</span>
                    </div>
                    <div className="ml-auto font-medium">{tag.count}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

Statistics.displayName = 'Statistics';
