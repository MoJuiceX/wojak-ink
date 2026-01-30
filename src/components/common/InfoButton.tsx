import { Info } from 'lucide-react';
import { useState } from 'react';
import { Lightbox } from '@/components/ui/Lightbox';
import { PageInfoContent } from './PageInfoContent';

export type PageId =
  | 'gallery'
  | 'bigpulp'
  | 'generator'
  | 'games'
  | 'leaderboard'
  | 'chat'
  | 'account'
  | 'shop'
  | 'treasury';

interface InfoButtonProps {
  page: PageId;
}

export function InfoButton({ page }: InfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenInfo, setHasSeenInfo] = useState(
    () => !!localStorage.getItem(`info-seen-${page}`)
  );

  const handleOpen = () => setIsOpen(true);

  const handleClose = () => {
    localStorage.setItem(`info-seen-${page}`, 'true');
    setHasSeenInfo(true);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`info-button ${hasSeenInfo ? 'seen' : ''}`}
        aria-label="Page information and tips"
      >
        <Info size={18} />
      </button>

      <Lightbox isOpen={isOpen} onClose={handleClose}>
        <PageInfoContent page={page} />
      </Lightbox>
    </>
  );
}
