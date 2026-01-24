import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageSize: number;
  onPageSizeChange: (size: string) => void;
}

export function SettingsModal({ isOpen, onClose, pageSize, onPageSizeChange }: SettingsModalProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyReport, setVerifyReport] = useState<any>(null);

  const handleVerifyMedia = async () => {
    setIsVerifying(true);
    setVerifyReport(null);
    try {
      const res = await fetch('/api/maintenance/verify-media', { method: 'POST' });
      const data = await res.json();
      setVerifyReport(data.report);
    } catch (error) {
      console.error('Verification failed', error);
    }
    setIsVerifying(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your preferences and data.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Default Page Size</span>
              <Select value={pageSize.toString()} onValueChange={onPageSizeChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[12, 20, 32, 48, 64].map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Theme</span>
              <ThemeToggle />
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4 py-4">
            <div className="border rounded-md p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Data Hygiene
              </h4>
              <p className="text-sm text-muted-foreground">
                Scan your library for missing media files and orphaned files.
              </p>
              
              <Button onClick={handleVerifyMedia} disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  'Verify Media Integrity'
                )}
              </Button>

              {verifyReport && (
                <div className="mt-4 p-3 bg-muted rounded-md text-sm space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Scan Complete</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Total Bookmarks: {verifyReport.total_bookmarks}</div>
                    <div>Media References: {verifyReport.total_media_references}</div>
                    <div className={verifyReport.missing_files.length > 0 ? 'text-red-500' : ''}>
                      Missing Files: {verifyReport.missing_files.length}
                    </div>
                    <div className={verifyReport.orphan_files.length > 0 ? 'text-yellow-500' : ''}>
                      Orphan Files: {verifyReport.orphan_files.length}
                    </div>
                  </div>
                  
                  {verifyReport.missing_files.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold text-xs uppercase mb-1">Missing Files (Sample):</p>
                      <ul className="list-disc pl-4 text-xs font-mono text-muted-foreground max-h-20 overflow-y-auto">
                        {verifyReport.missing_files.slice(0, 5).map((f: string, i: number) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t text-sm text-muted-foreground text-center">
          chudvault v0.1.0
        </div>
      </DialogContent>
    </Dialog>
  );
}
