import { DotLottiePlayer } from '@dotlottie/react-player';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// Mapeamento de emojis de texto para os arquivos JSON animados
export const EMOJI_ANIMATIONS: Record<string, string> = {
  '👍': '/assets/icons/joia.json',
  '❤️': '/assets/icons/coracao.json',
  '❤': '/assets/icons/coracao.json', // Fallback sem variation selector
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
  // Remove espaços e variation selectors (U+FE0F) para garantir o match
  const cleanEmoji = emoji?.trim().replace(/\uFE0F/g, '') || '';
  
  // Como removemos o U+FE0F do input, precisamos garantir que as chaves do mapa
  // também sejam comparadas sem ele, ou simplesmente buscar no mapa
  // O mapa já tem '❤️' (com FE0F) e '❤' (sem FE0F).
  // Para ser seguro, vamos tentar o exato, depois sem FE0F.
  const animationUrl = EMOJI_ANIMATIONS[emoji?.trim() || ''] || EMOJI_ANIMATIONS[cleanEmoji];

  if (!animationUrl) {
    return <span className={cn('inline-flex items-center justify-center', className)}>{emoji}</span>;
  }

  // Se estiver ativo, em hover (e playOnHover for true) ou loop for true, a animação toca
  const shouldPlay = isActive || loop || (playOnHover && isHovered);

  return (
    <div 
      className={cn('relative inline-flex items-center justify-center', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <DotLottiePlayer
        src={animationUrl}
        autoplay={shouldPlay}
        loop={loop || isActive || shouldPlay}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
