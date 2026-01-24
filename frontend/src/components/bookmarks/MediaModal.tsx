import { useEffect } from 'react';
import Image from 'next/image';

interface MediaModalProps {
  media: {
    url: string;
    type: 'image' | 'video';
    originalUrl?: string;
  };
  onClose: () => void;
}

export function MediaModal({ media, onClose }: MediaModalProps) {
  // Use a fallback URL if the blob URL fails (e.g. for videos)
  // Or if we want to try using vxtwitter/fxtwitter for embeds
  const mediaUrl = media.url; 
  
  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <>
      {/* Prevent scroll on body when modal is open */}
      <style jsx global>{`
        body {
          overflow: hidden;
        }
      `}</style>
      
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
          aria-label="Close modal"
        >
          <svg
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div 
          className="relative max-h-[90vh] max-w-[90vw]"
          onClick={e => e.stopPropagation()}
        >
          {media.type === 'image' ? (
            <Image
              src={mediaUrl}
              alt=""
              className="rounded-lg"
              width={1200}
              height={800}
              style={{ 
                maxHeight: '90vh',
                width: 'auto',
                objectFit: 'contain'
              }}
              priority
              quality={100}
              sizes="90vw"
              unoptimized={mediaUrl.startsWith('blob:')}
              onError={(e) => {
                // If blob fails, try original URL if available (though it might be restricted)
                if (media.originalUrl && mediaUrl !== media.originalUrl) {
                  const target = e.target as HTMLImageElement;
                  target.src = media.originalUrl;
                }
              }}
            />
          ) : (
            <video
              src={mediaUrl}
              controls
              className="rounded-lg"
              style={{ maxHeight: '90vh', maxWidth: '90vw' }}
              onError={(e) => {
                console.error("Video playback error", e);
                // Try fallback to original URL or better yet, vxtwitter if it's a twitter video
                if (media.originalUrl) {
                   const target = e.target as HTMLVideoElement;
                   if (target.src !== media.originalUrl) {
                     target.src = media.originalUrl;
                   }
                }
              }}
            />
          )}
        </div>
      </div>
    </>
  );
} 