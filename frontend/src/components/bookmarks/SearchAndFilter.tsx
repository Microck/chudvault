import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { api } from '@/lib/api';
import { Tag } from '@/types';
import { TagMenu } from './TagMenu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SearchAndFilterProps {
  onSearch: (query: string) => void;
  onTagSelect: (tag: string | undefined) => void;
  selectedTag?: string;
  onDeleteTag?: (tagName: string) => void;
}

export interface SearchAndFilterRef {
  loadTags: () => void;
  focusSearch: () => void;
}

export const SearchAndFilter = forwardRef<SearchAndFilterRef, SearchAndFilterProps>(
  ({ onSearch, onTagSelect, selectedTag, onDeleteTag }, ref) => {
    const [tags, setTags] = useState<Tag[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [newTagInput, setNewTagInput] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      loadTags,
      focusSearch: () => searchInputRef.current?.focus()
    }));

    useEffect(() => {
      loadTags();
    }, []);

    async function loadTags() {
      try {
        const response = await api.getTags();
        setTags(response);
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      onSearch(value);
    };

    const handleAddTag = async (tagName: string) => {
      if (!tagName.trim()) return;
      
      try {
        // First select the tag if it exists
        if (tags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
          onTagSelect(tagName);
          setNewTagInput('');
          return;
        }

        // Create new tag via API without selecting it
        await api.createTag(tagName);
        await loadTags(); // Reload tags after creating
        
        setNewTagInput('');
      } catch (error) {
        console.error('Failed to add tag:', error);
      }
    };

    const handleDeleteTag = async (tagName: string) => {
      if (onDeleteTag) {
        onDeleteTag(tagName);
      }
      // If the deleted tag was selected, reset to show all bookmarks
      if (selectedTag === tagName) {
        onTagSelect(undefined);
      }
      await loadTags();
    };

    return (
      <div className="mb-8 flex flex-col gap-4">
        <div className="relative w-full">
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Search bookmarks..."
            className="w-full pl-11 bg-white dark:bg-[#1e293b] rounded-xl border-2"
            value={searchQuery}
            onChange={handleSearch}
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-2.5 overflow-x-auto pb-2 items-center">
          <Button
            variant={!selectedTag ? "default" : "secondary"}
            onClick={() => onTagSelect(undefined)}
            className="rounded-full"
            size="sm"
          >
            All
          </Button>
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center">
              <Badge
                variant={selectedTag === tag.name ? "default" : "secondary"}
                className="rounded-full px-4 py-2 text-sm font-medium cursor-pointer hover:scale-105 transition-transform flex items-center gap-2"
                onClick={() => onTagSelect(tag.name)}
              >
                {tag.name}
                <TagMenu
                  tag={tag}
                  onSuccess={loadTags}
                  selectedTag={selectedTag}
                  onDeleteTag={handleDeleteTag}
                />
              </Badge>
            </div>
          ))}
          <div className="flex items-center">
            <div className="flex items-center gap-1.5 bg-background border-2 border-input hover:border-ring rounded-full px-3 h-9 transition-colors">
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Create tag..."
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none w-24 border-none p-0 h-full"
                value={newTagInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewTagInput(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagInput.trim()) {
                    handleAddTag(newTagInput.trim());
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

SearchAndFilter.displayName = 'SearchAndFilter';
