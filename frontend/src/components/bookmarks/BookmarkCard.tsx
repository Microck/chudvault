import { useState, useEffect } from 'react';
import { Bookmark, Tag } from '@/types';
import Image from 'next/image';
import { FormattedDate } from './FormattedDate';
import { MediaModal } from './MediaModal';
import { api } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';
import { eventBus } from '@/lib/eventBus';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Heart, Repeat, Eye, X, ExternalLink, Trash, Archive } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onUpdateTags: (id: string, tags: string[]) => void;
  onDelete: (id: string) => void;
  isSelectable: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onArchive: (id: string) => void;
  isArchived: boolean;
}

import { AutoTagButton } from './AutoTagButton';

export function BookmarkCard({ 
  bookmark,
  onUpdateTags, 
  onDelete,
  isSelectable,
  isSelected,
  onToggleSelect,
  onArchive,
  isArchived
}: BookmarkCardProps) {
  const [newTag, setNewTag] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<null | {
    url: string;
    type: 'image' | 'video';
  }>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [localTags, setLocalTags] = useState(() => {
    return bookmark.tags.map(tag => ({
      ...tag,
      uniqueId: uuidv4(),
      completed: tag.completed
    }));
  });


  const specialTags = ['To do', 'To read'];

  const detectCategory = (bookmark: Bookmark): Bookmark['category'] => {
    const url = bookmark.url.toLowerCase();
    if (url.includes('github.com')) return 'github';
    if (url.includes('medium.com') || url.includes('substack.com') || url.includes('dev.to')) return 'article';
    if (url.includes('buttondown.email') || url.includes('beehiiv.com')) return 'newsletter';
    if (url.includes('arxiv.org') || url.includes('scholar.google')) return 'research';
    if (url.includes('youtube.com') || url.includes('vimeo.com')) return 'video';
    if (url.includes('spotify.com') || url.includes('podcast')) return 'podcast';
    return 'tweet';
  };

  const category = detectCategory(bookmark) ?? 'tweet';

  const categoryColors: Record<NonNullable<Bookmark['category']>, string> = {
    article: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    github: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    tweet: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    video: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800',
    podcast: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    newsletter: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    research: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  };

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    const refreshTags = async () => {
      try {
        const response = await api.getBookmark(bookmark.id);
        const updatedTags = response.tags.map((tag: Tag) => ({
          ...tag,
          uniqueId: uuidv4(),
          completed: tag.completed ?? false
        }));
        setLocalTags(updatedTags);
      } catch (error) {
        console.error('Failed to refresh bookmark tags:', error);
      }
    };

    eventBus.on("tagUpdated", refreshTags);
    return () => {
      eventBus.off("tagUpdated", refreshTags);
    };
  }, [bookmark.id]);

  async function loadTags() {
    try {
      const tags = await api.getTags();
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }

  const updateSuggestedTags = async (input: string) => {
    if (!input.trim()) {
      setSuggestedTags([]);
      return;
    }
    
    await loadTags();
    
    const searchTerm = input.toLowerCase();
    const filtered = allTags.filter(tag => 
      tag.name.toLowerCase().includes(searchTerm) &&
      !bookmark.tags.some(t => t.name.toLowerCase() === tag.name.toLowerCase())
    );
    setSuggestedTags(filtered);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      
      const updatedTags = [
        ...localTags,
        {
          id: 0,
          name: newTag.trim(),
          completed: false,
          uniqueId: uuidv4(),
          created_at: new Date().toISOString()
        }
      ];
      
      setLocalTags(updatedTags);
      onUpdateTags(bookmark.id, updatedTags.map(t => t.name));
      setNewTag('');
      setSuggestedTags([]);
      loadTags();
    }
  };

  const handleSuggestedTagClick = (tag: Tag) => {
    const updatedTags = [
      ...localTags,
      { ...tag, completed: false, uniqueId: uuidv4() }
    ];
    setLocalTags(updatedTags);
    onUpdateTags(bookmark.id, updatedTags.map(t => t.name));
    setNewTag('');
    setSuggestedTags([]);
    loadTags();
  };

  function handleRemoveTag(tagToRemove: string) {
    const updatedTags = localTags.filter(tag => tag.name !== tagToRemove);
    setLocalTags(updatedTags);
    onUpdateTags(bookmark.id, updatedTags.map(t => t.name));
  }

  function renderTextWithLinks(text: string) {
    return text.split(/\s+/).map((word, index) => {
      if (word.match(/^(https?:\/\/[^\s]+)/)) {
        return (
          <a
            key={index}
            href={word}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {word}
          </a>
        );
      }
      return <span key={index}>{word} </span>;
    });
  }

  const handleToggleCompletion = async (tagName: string) => {
    try {
      const response = await api.toggleTagCompletion(bookmark.id, tagName);
      setLocalTags(prevTags => 
        prevTags.map(tag => 
          tag.name === tagName ? { ...tag, completed: response.completed } : tag
        )
      );
      eventBus.emit("tagUpdated", undefined);
    } catch (error) {
      console.error('Failed to toggle completion:', error);
    }
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300 bg-card border-border overflow-hidden group">
      <CardHeader className="p-4 pb-2 space-y-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isSelectable && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(bookmark.id)}
                className="mt-1"
              />
            )}
            <div className="relative h-10 w-10 shrink-0">
              <Image
                src={bookmark.profile_image_url}
                alt={bookmark.name}
                fill
                className="rounded-full object-cover ring-2 ring-background"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate leading-tight">{bookmark.name}</h3>
              <a 
                href={`https://twitter.com/${bookmark.screen_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary transition-colors truncate block"
                onClick={(e) => e.stopPropagation()}
              >
                @{bookmark.screen_name}
              </a>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onArchive(bookmark.id)}>
                <Archive className="mr-2 h-4 w-4" />
                {isArchived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(bookmark.id)} className="text-destructive focus:text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex-1 space-y-4">
        {category !== 'tweet' && (
          <Badge variant="outline" className={`mb-2 ${categoryColors[category]} border hover:bg-opacity-80 transition-colors`}>
            {category.toUpperCase()}
          </Badge>
        )}

        <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed break-words">
          {isExpanded ? renderTextWithLinks(bookmark.full_text) : (
            <>
              {renderTextWithLinks(bookmark.full_text.slice(0, 280))}
              {bookmark.full_text.length > 280 && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="text-primary hover:underline ml-1 font-medium"
                >
                  Show more
                </button>
              )}
            </>
          )}
        </div>

        {bookmark.media.length > 0 && (
          <div className={`grid gap-2 ${bookmark.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {bookmark.media.map((media) => (
              <div
                key={media.id}
                className="relative aspect-video cursor-pointer overflow-hidden rounded-lg border border-border"
                onClick={() => setSelectedMedia({
                  url: media.original,
                  type: media.type === 'photo' ? 'image' : 'video'
                })}
              >
                <Image
                  src={media.thumbnail.replace('name=thumb', 'name=medium')}
                  alt="Media content"
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                  unoptimized
                />
                {media.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="rounded-full bg-black/50 p-2">
                      <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

          <div className="flex flex-wrap gap-2 items-center">
            {localTags.map((tag) => {
              const isSpecial = specialTags.includes(tag.name);
              return (
                <Badge 
                  key={tag.uniqueId} 
                  variant={isSpecial ? "default" : "secondary"}
                  className={`flex items-center gap-1 pr-1 cursor-default ${
                    isSpecial ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''
                  }`}
                >
                  {isSpecial && (
                    <Checkbox 
                      checked={tag.completed} 
                      onCheckedChange={() => handleToggleCompletion(tag.name)}
                      className="h-3 w-3 border-current data-[state=checked]:bg-current data-[state=checked]:text-background mr-1"
                    />
                  )}
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.name)}
                    className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="+ Tag"
                className="text-xs bg-transparent border border-input rounded-full px-2 py-1 w-16 focus:w-24 focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground"
                value={newTag}
                onChange={(e) => {
                  setNewTag(e.target.value);
                  updateSuggestedTags(e.target.value);
                }}
                onKeyDown={handleAddTag}
              />
              {suggestedTags.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-32 bg-popover border border-border rounded-md shadow-md z-50 overflow-hidden">
                  {suggestedTags.map(tag => (
                    <button
                      key={tag.id}
                      className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => handleSuggestedTagClick(tag)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <AutoTagButton 
              bookmarkId={bookmark.id} 
              text={bookmark.full_text}
              onTagsUpdated={() => eventBus.emit("tagUpdated", undefined)}
            />
          </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 text-xs text-muted-foreground border-t border-border/50 mt-auto pt-3 flex justify-between items-center bg-muted/20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 hover:text-red-500 transition-colors cursor-default" title="Likes">
            <Heart className="h-3 w-3" /> {bookmark.favorite_count}
          </span>
          <span className="flex items-center gap-1 hover:text-green-500 transition-colors cursor-default" title="Retweets">
            <Repeat className="h-3 w-3" /> {bookmark.retweet_count}
          </span>
          <span className="flex items-center gap-1 hover:text-blue-500 transition-colors cursor-default" title="Views">
            <Eye className="h-3 w-3" /> {bookmark.views_count}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FormattedDate date={bookmark.created_at} />
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardFooter>

      {selectedMedia && (
        <MediaModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </Card>
  );
}
