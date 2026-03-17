import { useState, useRef, useEffect } from 'react';
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

const SPIN_DEG = 360;
const TRANSITION_MS = 380;
const EASING = 'cubic-bezier(0.34, 1.2, 0.64, 1)';

interface ProfileRandomImagesProps {
  onSelectImage: (url: string) => void;
  disabled?: boolean;
}

export function ProfileRandomImages({ onSelectImage, disabled }: ProfileRandomImagesProps) {
  const [rotation, setRotation] = useState(0);
  const [iconKey, setIconKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleRandomize = () => {
    const allImages = getAllBannerImages();
    if (allImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * allImages.length);
      onSelectImage(allImages[randomIndex]!);
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRotation(SPIN_DEG);
    timeoutRef.current = setTimeout(() => {
      setRotation(0);
      setIconKey((k) => k + 1);
      timeoutRef.current = null;
    }, TRANSITION_MS + 20);
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
              key={iconKey}
              className={cn(
                'w-5 h-5 text-slate-700 dark:text-slate-200'
              )}
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: `transform ${TRANSITION_MS}ms ${EASING}`,
              }}
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
