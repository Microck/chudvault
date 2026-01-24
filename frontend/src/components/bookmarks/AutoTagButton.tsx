import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAISettings } from '@/lib/ai/settings';
import { generateTags } from '@/lib/ai/client';
import { api } from '@/lib/api';

interface AutoTagButtonProps {
  bookmarkId: string;
  text: string;
  onTagsUpdated: () => void;
}

export function AutoTagButton({ bookmarkId, text, onTagsUpdated }: AutoTagButtonProps) {
  const { settings } = useAISettings();
  const [loading, setLoading] = useState(false);

  async function handleAutoTag() {
    if (!settings.apiKey && settings.provider !== 'ollama') {
      alert('Please configure AI settings first');
      return;
    }

    setLoading(true);
    try {
      const existingTags = await api.getTags();
      const tagNames = existingTags.map((t: any) => t.name);
      
      const result = await generateTags(text, settings, tagNames);
      
      if (result.tags && result.tags.length > 0) {
        await api.updateBookmarkTags(bookmarkId, result.tags);
        onTagsUpdated();
      }
    } catch (error) {
      console.error('Auto-tag failed', error);
      alert('Failed to auto-tag. Check console for details.');
    }
    setLoading(false);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs"
      onClick={handleAutoTag}
      disabled={loading}
      title="Auto-tag with AI"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
      ) : (
        <Sparkles className="h-3 w-3 mr-1" />
      )}
      AI Tag
    </Button>
  );
}
