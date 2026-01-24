import { BookmarkCardProps, BookmarkCard } from './BookmarkCard';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { FormattedDate } from './FormattedDate';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MoreHorizontal, Archive, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BookmarkListItem({
  bookmark,
  onUpdateTags,
  onDelete,
  isSelectable,
  isSelected,
  onToggleSelect,
  onArchive,
  isArchived,
  isFocused
}: BookmarkCardProps & { isFocused?: boolean }) {
  return (
    <Card className={`group flex flex-row items-center p-3 gap-4 hover:bg-muted/50 transition-colors border-border ${isFocused ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
      {isSelectable && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(bookmark.id)}
        />
      )}
      
      <div className="relative h-12 w-12 shrink-0">
        <Image
          src={bookmark.profile_image_url}
          alt={bookmark.name}
          fill
          className="rounded-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0 grid gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{bookmark.name}</span>
          <span className="text-muted-foreground text-sm truncate">@{bookmark.screen_name}</span>
          <FormattedDate date={bookmark.created_at} className="text-xs text-muted-foreground ml-auto" />
        </div>
        <p className="text-sm truncate text-muted-foreground">
          {bookmark.full_text.replace(/\n/g, ' ')}
        </p>
        <div className="flex items-center gap-2 overflow-hidden">
          {bookmark.tags.map(tag => (
            <Badge key={tag.id} variant="secondary" className="text-[10px] px-1 h-5">
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onArchive(bookmark.id)}>
              <Archive className="mr-2 h-4 w-4" />
              {isArchived ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(bookmark.id)} className="text-destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
