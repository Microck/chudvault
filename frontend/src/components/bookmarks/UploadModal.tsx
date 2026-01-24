import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [jsonFiles, setJsonFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (jsonFiles.length === 0) return;

    setIsUploading(true);
    try {
      await api.uploadBookmarks(jsonFiles[0], zipFile);
      onSuccess();
      onClose();
      setJsonFiles([]);
      setZipFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setIsUploading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Bookmarks</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="json-file">JSON File(s)</Label>
            <Input
              id="json-file"
              type="file"
              accept=".json"
              multiple
              onChange={(e) => setJsonFiles(Array.from(e.target.files || []))}
              required
            />
            <p className="text-xs text-muted-foreground">
              Select one or more Twitter bookmark export files
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="zip-file">ZIP File (optional)</Label>
            <Input
              id="zip-file"
              type="file"
              accept=".zip"
              onChange={(e) => setZipFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              Media files from Twitter exporter. If not provided, will fetch from URLs
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}