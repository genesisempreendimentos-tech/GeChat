import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** Largura da coluna do ícone — igual à sidebar recolhida; ícone nunca se desloca. */
export const SIDEBAR_ICON_COLUMN_WIDTH = 80;

const HIGHLIGHT_EASE = [0.4, 0, 0.2, 1] as const;
const NAV_ITEM_HEIGHT = 48;
const COLLAPSED_HIGHLIGHT_INSET_X = 6;
const COLLAPSED_HIGHLIGHT_HEIGHT = 44;
const COLLAPSED_HIGHLIGHT_TOP = (NAV_ITEM_HEIGHT - COLLAPSED_HIGHLIGHT_HEIGHT) / 2;

type SidebarNavItemProps = {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isExpanded: boolean;
  iconAdornment?: ReactNode;
  tourId?: string;
};

function highlightBg(isActive: boolean) {
  return isActive ? 'bg-primary' : 'bg-accent/75';
}

function useHighlightMotion(isActive: boolean, hovered: boolean) {
  const visible = isActive || hovered;
  return {
    animate: {
      opacity: visible ? (isActive ? 1 : 0.82) : 0,
      scale: visible ? 1 : 0.94,
    },
    transition: {
      opacity: { duration: 0.28, ease: HIGHLIGHT_EASE },
      scale: { duration: 0.28, ease: HIGHLIGHT_EASE },
    },
  };
}

function ExpandedHighlight({
  isActive,
  hovered,
}: {
  isActive: boolean;
  hovered: boolean;
}) {
  const motionProps = useHighlightMotion(isActive, hovered);

  return (
    <motion.div
      layout
      initial={false}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-y-0 left-2 right-2 rounded-xl',
        highlightBg(isActive),
      )}
      {...motionProps}
      transition={{
        ...motionProps.transition,
        layout: { duration: 0.32, ease: HIGHLIGHT_EASE },
      }}
    />
  );
}

function CollapsedHighlight({
  isActive,
  hovered,
}: {
  isActive: boolean;
  hovered: boolean;
}) {
  const motionProps = useHighlightMotion(isActive, hovered);

  return (
    <motion.div
      initial={false}
      aria-hidden
      className={cn('pointer-events-none absolute rounded-xl', highlightBg(isActive))}
      style={{
        left: COLLAPSED_HIGHLIGHT_INSET_X,
        right: COLLAPSED_HIGHLIGHT_INSET_X,
        top: COLLAPSED_HIGHLIGHT_TOP,
        height: COLLAPSED_HIGHLIGHT_HEIGHT,
      }}
      {...motionProps}
    />
  );
}

export function SidebarNavItem({
  to,
  icon: Icon,
  label,
  isActive,
  isExpanded,
  iconAdornment,
  tourId,
}: SidebarNavItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={to}
      className="group relative block h-12"
      title={label}
      aria-label={label}
      data-tour={tourId}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isExpanded ? (
        <ExpandedHighlight isActive={isActive} hovered={hovered} />
      ) : null}

      <div className="relative z-[1] flex h-12 items-center">
        <div
          className="relative flex h-12 shrink-0 items-center justify-center"
          style={{ width: SIDEBAR_ICON_COLUMN_WIDTH }}
        >
          {!isExpanded ? (
            <CollapsedHighlight isActive={isActive} hovered={hovered} />
          ) : null}
          <span className="relative z-[1] flex h-5 w-5 items-center justify-center">
            <Icon
              className={cn(
                'h-5 w-5 transition-colors duration-300 ease-out',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground group-hover:text-foreground',
              )}
            />
            {iconAdornment}
          </span>
        </div>
        <motion.span
          className={cn(
            'min-w-0 font-medium text-sm whitespace-nowrap overflow-hidden',
            isActive
              ? 'text-primary-foreground'
              : 'text-muted-foreground group-hover:text-foreground',
          )}
          initial={false}
          animate={{
            opacity: isExpanded ? 1 : 0,
            maxWidth: isExpanded ? 180 : 0,
          }}
          transition={{ duration: 0.28, ease: HIGHLIGHT_EASE }}
          aria-hidden={!isExpanded}
        >
          {label}
        </motion.span>
      </div>
    </Link>
  );
}

type SidebarSectionTitleProps = {
  title: string;
  isExpanded: boolean;
};

export function SidebarSectionTitle({ title, isExpanded }: SidebarSectionTitleProps) {
  return (
    <motion.p
      className="overflow-hidden pr-4 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80"
      style={{ paddingLeft: SIDEBAR_ICON_COLUMN_WIDTH }}
      initial={false}
      animate={{
        opacity: isExpanded ? 1 : 0,
        maxHeight: isExpanded ? 32 : 0,
        marginBottom: isExpanded ? undefined : 0,
        paddingBottom: isExpanded ? undefined : 0,
        paddingTop: isExpanded ? undefined : 0,
      }}
      transition={{ duration: 0.28, ease: HIGHLIGHT_EASE }}
      aria-hidden={!isExpanded}
    >
      {title}
    </motion.p>
  );
}
