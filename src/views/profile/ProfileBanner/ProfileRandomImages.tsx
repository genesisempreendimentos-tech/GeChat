import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getAllBannerImages } from './ProfileBannerImages';

interface ProfileRandomImagesProps {
  onSelectImage: (url: string) => void;
  disabled?: boolean;
}

export function ProfileRandomImages({ onSelectImage, disabled }: ProfileRandomImagesProps) {
  const [rotation, setRotation] = useState(0);

  const handleRandomize = () => {
    const allImages = getAllBannerImages();
    if (allImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * allImages.length);
      onSelectImage(allImages[randomIndex]!);
      setRotation((prev) => prev + 180);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRandomize}
            disabled={disabled}
            className={cn(
              'h-9 w-9 rounded-full border-2 transition-all duration-200',
              'border-slate-100 dark:border-slate-800',
              'bg-slate-100/90 dark:bg-slate-800',
              'hover:bg-slate-300 dark:hover:bg-slate-700',
              'disabled:opacity-60'
            )}
            aria-label="Randomizar imagem do banner"
          >
            <Shuffle
              className={cn(
                'w-5 h-5 transition-transform duration-200',
                'text-slate-700 dark:text-slate-200'
              )}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Randomizar imagem do banner</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
