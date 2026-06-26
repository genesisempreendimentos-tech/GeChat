import { useMemo, useState } from 'react';
import { Clock, Search, Smile } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { MessageReaction } from '@/modules/gechat/types';

const RECENT_KEY = 'gechat-recent-emojis';

const EMOJI_CATEGORIES = {
  recent: { label: 'Recentes', icon: Clock, emojis: [] as string[] },
  smileys: {
    label: 'Carinhas',
    icon: Smile,
    emojis: [
      '😀', '😁', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌',
      '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑',
      '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤',
      '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴',
      '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
      '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰',
      '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫',
      '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩',
    ],
  },
  gestures: {
    label: 'Gestos',
    icon: Smile,
    emojis: [
      '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚',
      '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🤳', '💅',
    ],
  },
  hearts: {
    label: 'Corações',
    icon: Smile,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
    ],
  },
  objects: {
    label: 'Objetos',
    icon: Smile,
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀',
      '🔥', '⭐', '🌟', '✨', '💫', '💥', '💯', '✅', '❌', '❗',
      '❓', '💬', '💭', '🗯️', '👀', '🧠', '💡', '🔔', '📌', '📎',
    ],
  },
} as const;

type CategoryKey = keyof typeof EMOJI_CATEGORIES;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(emoji: string) {
  const recent = [emoji, ...loadRecent().filter((e) => e !== emoji)].slice(0, 24);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}

interface MessageReactionPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function MessageReactionPicker({ onSelect, className }: MessageReactionPickerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryKey>('smileys');
  const recent = useMemo(() => loadRecent(), []);

  const allEmojis = useMemo(
    () => Object.values(EMOJI_CATEGORIES).flatMap((c) => c.emojis),
    [],
  );

  const filtered = search.trim()
    ? allEmojis.filter((e) => e.includes(search.trim()))
    : category === 'recent'
      ? recent
      : EMOJI_CATEGORIES[category].emojis;

  const handleSelect = (emoji: string) => {
    saveRecent(emoji);
    onSelect(emoji);
  };

  return (
    <div className={cn('flex w-[320px] flex-col', className)}>
      <div className="border-b border-border/50 p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisa"
            className="h-8 rounded-full pl-8 text-sm"
          />
        </div>
      </div>

      {!search.trim() && (
        <div className="flex items-center gap-0.5 border-b border-border/50 px-2 py-1.5">
          {(Object.keys(EMOJI_CATEGORIES) as CategoryKey[]).map((key) => {
            const Icon = EMOJI_CATEGORIES[key].icon;
            return (
              <button
                key={key}
                type="button"
                aria-label={EMOJI_CATEGORIES[key].label}
                onClick={() => setCategory(key)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                  category === key
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      )}

      <div className="max-h-[240px] overflow-y-auto p-2">
        {!search.trim() && category === 'recent' && recent.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">Você ainda não usou emojis.</p>
        )}

        {!search.trim() && category !== 'recent' && (
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {EMOJI_CATEGORIES[category].label}
          </p>
        )}

        {search.trim() && (
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Resultados
          </p>
        )}

        <div className="grid grid-cols-8 gap-0.5">
          {filtered.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Reagir com ${emoji}`}
              onClick={() => handleSelect(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function groupMessageReactions(
  reactions: MessageReaction[] | undefined,
  currentUserId: string,
) {
  if (!reactions?.length) return [];

  const groups = new Map<string, { emoji: string; count: number; userIds: string[]; hasOwn: boolean }>();
  for (const reaction of reactions) {
    const existing = groups.get(reaction.emoji);
    if (existing) {
      existing.count += 1;
      existing.userIds.push(reaction.userId);
      if (reaction.userId === currentUserId) existing.hasOwn = true;
    } else {
      groups.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        userIds: [reaction.userId],
        hasOwn: reaction.userId === currentUserId,
      });
    }
  }
  return [...groups.values()];
}
