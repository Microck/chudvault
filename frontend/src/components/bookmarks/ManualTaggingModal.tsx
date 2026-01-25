import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { FileDown, FileUp, Loader2 } from 'lucide-react';

interface ManualTaggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualTaggingModal({ isOpen, onClose, onSuccess }: ManualTaggingModalProps) {
  const [step, setStep] = useState<'export' | 'import'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importJson, setImportJson] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await api.exportBookmarksForAI();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chudvault-for-llm.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStep('import');
    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to export data');
    }
    setIsExporting(false);
  };

  const handleImport = async () => {
    if (!importJson.trim()) return;
    setIsImporting(true);
    try {
      const tagsMap = JSON.parse(importJson);
      
      let count = 0;
      for (const [id, tags] of Object.entries(tagsMap)) {
        if (Array.isArray(tags) && tags.length > 0) {
          await api.updateBookmarkTags(id, tags as string[]);
          count++;
        }
      }
      
      alert(`Successfully updated tags for ${count} bookmarks.`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Import failed', error);
      alert('Failed to import tags. Check JSON format.');
    }
    setIsImporting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manual AI Tagging</DialogTitle>
          <DialogDescription>
            Use any external LLM (ChatGPT, Claude, etc.) to tag your bookmarks.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {step === 'export' ? (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md text-sm">
                <p className="font-medium mb-2">Step 1: Export Data</p>
                <p>Download a JSON file containing your bookmarks (ID + Text only). Upload this file to an LLM with the following prompt:</p>
                <pre className="mt-2 p-2 bg-background rounded border text-xs overflow-x-auto">
{`Please analyze these tweets and generate tags. 
Return ONLY a JSON object mapping IDs to arrays of tags.
Format: { "12345": ["news", "tech"], "67890": ["funny"] }`}
                </pre>
              </div>
              <Button onClick={handleExport} disabled={isExporting} className="w-full">
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Download JSON for LLM
              </Button>
              <div className="text-center text-xs text-muted-foreground">
                <button onClick={() => setStep('import')} className="underline">
                  Skip to Import (I already have the JSON)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md text-sm">
                <p className="font-medium mb-2">Step 2: Import Tags</p>
                <p>Paste the JSON response from the LLM below to apply tags.</p>
              </div>
              <Textarea 
                placeholder='{ "12345": ["tag1"], ... }'
                className="font-mono text-xs h-40"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('export')}>Back</Button>
                <Button onClick={handleImport} disabled={isImporting || !importJson} className="flex-1">
                  {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                  Apply Tags
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
