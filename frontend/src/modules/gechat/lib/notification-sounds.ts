import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Gem,
  Leaf,
  Lightbulb,
  Radio,
  Rocket,
  Sparkles,
  Volume2,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';

export interface NotificationSound {
  id: string;
  label: string;
  description: string;
  filename: string | null;
  icon: LucideIcon;
}

export const NOTIFICATION_SOUNDS: NotificationSound[] = [
  {
    id: 'default',
    label: 'GêChat Padrão',
    description: 'Tom sintetizado suave do GêChat',
    filename: null,
    icon: Bell,
  },
  {
    id: 'sino-vento',
    label: 'Sino do Vento',
    description: 'Chime etéreo e tranquilo',
    filename: 'Alert_Chime_Sounds-4306ee87-c919-424c-836d-6b793867ba4c.mp3',
    icon: Wind,
  },
  {
    id: 'cristal',
    label: 'Cristal',
    description: 'Toque limpo e cristalino',
    filename: 'Alert_Chime_Sounds-5a99fe18-7634-4754-98b7-7bb0464ab868.mp3',
    icon: Gem,
  },
  {
    id: 'toque-rapido',
    label: 'Toque Rápido',
    description: 'Alerta direto e objetivo',
    filename: 'Alert_Notification_Sound-16ed3022-8662-448f-b847-42a56914433d.mp3',
    icon: Zap,
  },
  {
    id: 'eco-digital',
    label: 'Eco Digital',
    description: 'Duplo pulso com reverberação',
    filename: 'Alert_Notification_Sound-ca5a83dd-9798-4aff-bb98-bc0e05ae067d.mp3',
    icon: Waves,
  },
  {
    id: 'serenidade',
    label: 'Serenidade',
    description: 'Tom zen, calmo e relaxante',
    filename: 'Alert_Notification_Sounds-ec5f348c-f3fe-47d9-b217-b0c5600942ef.mp3',
    icon: Leaf,
  },
  {
    id: 'pulso-tech',
    label: 'Pulso Tech',
    description: 'Notificação tech premium',
    filename: 'Premium_Tech_Notification_Tone-9500a103-5c27-40fe-88af-e7a49f7f9136.mp3',
    icon: Radio,
  },
  {
    id: 'orbit',
    label: 'Orbit',
    description: 'Tom futurista e elegante',
    filename: 'Premium_Tech_Notification_Tone-b392f663-256b-4fd0-8da9-24f0faf19c49.mp3',
    icon: Rocket,
  },
  {
    id: 'sleek',
    label: 'Sleek',
    description: 'Design sonoro minimalista',
    filename: 'Sleek_Tech_Notification-53af1b69-993a-4e03-bdbc-12735f4b83d1.mp3',
    icon: Sparkles,
  },
  {
    id: 'neon-flash',
    label: 'Neon Flash',
    description: 'Alerta vívido e moderno',
    filename: 'Sleek_Tech_Notification-67054a27-af43-4784-a9f0-7dd6f300256d.mp3',
    icon: Lightbulb,
  },
  {
    id: 'chime-tech',
    label: 'Chime Tech',
    description: 'Chime com toque tecnológico',
    filename: 'Tech_Notification_Chime-3e9f966a-c7f2-4285-b382-fdabdee324c7.mp3',
    icon: Volume2,
  },
];

export function getSoundById(id: string): NotificationSound {
  return NOTIFICATION_SOUNDS.find((s) => s.id === id) ?? NOTIFICATION_SOUNDS[0];
}

export function getNotificationSoundUrl(filename: string): string {
  const trimmed = filename.trim().replace(/^\/+/, '');
  if (trimmed.startsWith('assets/sounds/')) {
    return `/${trimmed}`;
  }
  if (trimmed.startsWith('sounds/')) {
    return `/assets/${trimmed}`;
  }
  return `/assets/sounds/${trimmed}`;
}

/** Toca preview de um som (para uso fora de componentes React). */
let _currentPreview: HTMLAudioElement | null = null;

export function playNotificationSoundById(id: string, synthesizedFallback?: () => void): void {
  const sound = getSoundById(id);
  if (!sound.filename) {
    synthesizedFallback?.();
    return;
  }

  _currentPreview?.pause();
  const audio = new Audio(getNotificationSoundUrl(sound.filename));
  _currentPreview = audio;
  audio.volume = 1;
  void audio.play().catch(() => {
    synthesizedFallback?.();
  });
}

export function stopCurrentPreview(): void {
  _currentPreview?.pause();
  _currentPreview = null;
}
