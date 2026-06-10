import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  getLeadGender,
  getLeadMaleIconFilter,
  getLeadPersonaSrc,
  getLeadPersonaVariantForTheme,
  LEAD_MALE_ICON,
} from '@/lib/leadGender';
import { useThemeStore } from '@/store/themeStore';

type Props = {
  nome: string;
  /** Se omitido, infere pelo primeiro nome. */
  gender?: 'male' | 'female';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function LeadPersonaAvatar({ nome, gender: genderProp, size = 'md', className }: Props) {
  const [failed, setFailed] = useState(false);
  const { theme } = useThemeStore();
  const gender = genderProp ?? getLeadGender({ name: nome });
  const personaVariant = getLeadPersonaVariantForTheme(theme);
  const personaSrc = getLeadPersonaSrc(gender, personaVariant);
  const isDarkPersona = personaVariant === 'black';
  const genderLabel = gender === 'female' ? 'feminino' : 'masculino';

  useEffect(() => {
    setFailed(false);
  }, [personaSrc]);

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-2xl',
        isDarkPersona ? 'bg-black' : 'bg-muted/30',
        sizeMap[size],
        className,
      )}
      title={`${nome} (${genderLabel})`}
      aria-label={`Avatar ${genderLabel} de ${nome}`}
    >
      {!failed ? (
        <img
          src={personaSrc}
          alt={`Persona de ${nome}`}
          className="h-full w-full object-cover object-top"
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : gender === 'male' ? (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center p-2',
            isDarkPersona ? 'bg-black' : 'bg-muted/30',
          )}
        >
          <img
            src={LEAD_MALE_ICON}
            alt={`Ícone de ${nome}`}
            className="h-full w-full object-contain"
            style={{ filter: getLeadMaleIconFilter() }}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </div>
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center text-xs font-semibold text-primary',
            isDarkPersona ? 'bg-black' : 'bg-muted/30',
          )}
        >
          {initialsFromName(nome)}
        </div>
      )}
    </div>
  );
}
