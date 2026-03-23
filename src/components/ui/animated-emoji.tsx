import { DotLottiePlayer } from '@dotlottie/react-player';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// Mapeamento de emojis de texto para os arquivos JSON animados
export const EMOJI_ANIMATIONS: Record<string, string> = {
  '👍': '/assets/icons/joia.json',
  '❤️': '/assets/icons/coracao.json',
  '😂': '/assets/icons/rindo.json',
  '😮': '/assets/icons/surpreso.json',
  '😢': '/assets/icons/triste.json',
  '🙏': '/assets/icons/mao-amem.json',
  '👏': '/assets/icons/parabens.json',
  '🎉': '/assets/icons/festa.json',
  '🔥': '/assets/icons/fogo.json',
  '🚀': '/assets/icons/foguete.json',
  '🥂': '/assets/icons/tacas.json',
  '🥳': '/assets/icons/festa-face.json',
};

interface AnimatedEmojiProps {
  emoji: string;
  className?: string;
  isActive?: boolean;
  playOnHover?: boolean;
  loop?: boolean;
}

export function AnimatedEmoji({ 
  emoji, 
  className, 
  isActive = false,
  playOnHover = true,
  loop = false
}: AnimatedEmojiProps) {
  const [isHovered, setIsHovered] = useState(false);
  const animationUrl = EMOJI_ANIMATIONS[emoji];

  if (!animationUrl) {
    return <span className={cn('inline-flex items-center justify-center', className)}>{emoji}</span>;
  }

  // Se estiver ativo ou em hover (e playOnHover for true), a animação toca
  const shouldPlay = isActive || (playOnHover && isHovered);

  return (
    <div 
      className={cn('relative inline-flex items-center justify-center', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <DotLottiePlayer
        src={animationUrl}
        autoplay={shouldPlay}
        loop={loop || isActive}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
