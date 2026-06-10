import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type IrisVariant =
  | 'iris1'
  | 'iris2'
  | 'iris4'
  | 'iris6'
  | 'iris11'
  | 'iris14'
  | 'iris19'
  | 'iris21'
  | 'iris23';

const VARIANT_CLASS: Record<IrisVariant, string> = {
  iris1:
    'bg-red-400/10 border-red-500 text-red-700 dark:text-red-400 hover:bg-red-400/20',
  iris2:
    'bg-orange-400/10 border-orange-500 text-orange-700 dark:text-orange-400 hover:bg-orange-400/20',
  iris4:
    'bg-yellow-400/10 border-yellow-500 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-400/20',
  iris6:
    'bg-green-400/10 border-green-500 text-green-700 dark:text-green-400 hover:bg-green-400/20',
  iris11:
    'bg-blue-400/10 border-blue-500 text-blue-700 dark:text-blue-400 hover:bg-blue-400/20',
  iris14:
    'bg-purple-400/10 border-purple-500 text-purple-700 dark:text-purple-400 hover:bg-purple-400/20',
  iris19:
    'bg-gray-400/10 border-gray-500 text-gray-700 dark:text-gray-400 hover:bg-gray-400/20',
  iris21:
    'bg-neutral-400/10 border-neutral-500 text-neutral-700 dark:text-neutral-400 hover:bg-neutral-400/20',
  iris23:
    'bg-white/10 border-neutral-300 text-neutral-700 dark:text-neutral-400 hover:bg-white/20 dark:border-neutral-500',
};

type IrisProps = {
  text: ReactNode;
  variant?: IrisVariant;
  className?: string;
};

export function Iris({ text, variant = 'iris23', className }: IrisProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md border px-2.5 py-0.5 text-xs font-medium leading-snug transition-colors duration-200',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      <span className="truncate">{text}</span>
    </span>
  );
}
