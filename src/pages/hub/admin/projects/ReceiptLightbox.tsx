import { getDriveThumbnailUrl } from '@/pages/hub/utils/drive';

// Full-screen viewer for receipt images (payments + payouts).
export default function ReceiptLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => onClose()}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={getDriveThumbnailUrl(url, 1600)} alt="Receipt" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
            <button onClick={() => onClose()} className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black cursor-pointer">
              <i className="ri-close-line text-sm"></i>
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 text-white text-xs rounded-lg hover:bg-black">
              <i className="ri-external-link-line text-xs"></i> Open full size
            </a>
          </div>
        </div>
  );
}
