// src/components/views/profile/ProfileInfo/DDI.jsx
import React, { useEffect, useMemo, useState } from 'react';
import ReactCountryFlag from 'react-country-flag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Lista de países com ISO-3166-1 alpha-2 (countryCode) e DDI.
 * Formato retangular via SVG (react-country-flag).
 */
export const COUNTRY_DIALS = [
  { code: 'BR', name: 'Brasil',           dial: '+55'  },
  { code: 'PT', name: 'Portugal',         dial: '+351' },
  { code: 'US', name: 'Estados Unidos',   dial: '+1'   },
  { code: 'AR', name: 'Argentina',        dial: '+54'  },
  { code: 'MX', name: 'México',           dial: '+52'  },
  { code: 'ES', name: 'Espanha',          dial: '+34'  },
  { code: 'GB', name: 'Reino Unido',      dial: '+44'  },
  { code: 'FR', name: 'França',           dial: '+33'  },
  { code: 'DE', name: 'Alemanha',         dial: '+49'  },
  { code: 'IT', name: 'Itália',           dial: '+39'  },
  { code: 'JP', name: 'Japão',            dial: '+81'  },
  { code: 'IN', name: 'Índia',            dial: '+91'  },
  { code: 'CA', name: 'Canadá',           dial: '+1'   },
  { code: 'CL', name: 'Chile',            dial: '+56'  },
  { code: 'CO', name: 'Colômbia',         dial: '+57'  },
  { code: 'PE', name: 'Peru',             dial: '+51'  },
  { code: 'PY', name: 'Paraguai',         dial: '+595' },
  { code: 'UY', name: 'Uruguai',          dial: '+598' },
  { code: 'BO', name: 'Bolívia',          dial: '+591' },
];

function getCountryByDial(dial) {
  return COUNTRY_DIALS.find((c) => c.dial === dial) || COUNTRY_DIALS[0]; // 🇧🇷 por padrão
}

/**
 * Componente seletor de DDI com bandeiras SVG (react-country-flag).
 *
 * Props:
 * - value?: string (ex: '+55') — controlado
 * - defaultValue?: string — valor inicial se não-controlado (default '+55')
 * - onChange?: (newDial: string) => void
 * - preferred?: string[] — DDIs a destacar no topo (ex: ['+55', '+351'])
 * - disabled?: boolean
 * - className?: string
 */
export default function DDI({
  value,
  defaultValue = '+55',
  onChange,
  preferred = ['+55'],
  disabled = false,
  className = '',
}) {
  const controlled = typeof value === 'string';
  const [open, setOpen] = useState(false);
  const [internalDial, setInternalDial] = useState(defaultValue);
  const dial = controlled ? value : internalDial;
  const current = getCountryByDial(dial);

  const [query, setQuery] = useState('');

  // Ordena: preferidos no topo
  const data = useMemo(() => {
    const prefSet = new Set(preferred);
    const top = COUNTRY_DIALS.filter((c) => prefSet.has(c.dial));
    const rest = COUNTRY_DIALS.filter((c) => !prefSet.has(c.dial));
    return [...top, ...rest];
  }, [preferred]);

  // Filtro de busca por nome, DDI ou código do país
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [data, query]);

  // Se vier um value inválido, volta para +55
  useEffect(() => {
    if (!controlled) return;
    if (!getCountryByDial(value)) {
      onChange?.('+55');
    }
  }, [controlled, value, onChange]);

  function selectDial(newDial) {
    if (!controlled) setInternalDial(newDial);
    onChange?.(newDial);
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      {/* Trigger: SOMENTE a bandeira selecionada (retangular SVG) */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`w-9 h-9 ${className}`}
            disabled={disabled}
            aria-label={`DDI ${current.dial} - ${current.name}`}
            title={`${current.name} (${current.dial})`}
          >
            <ReactCountryFlag
              countryCode={current.code}
              svg
              aria-hidden
              style={{ width: '1.35rem', height: '1rem', display: 'block' }}
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-2" align="start">
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="Buscar país ou DDI…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {/* Lista com scrollbar customizada na cor da marca */}
            <div className="max-h-64 overflow-auto rounded border ddi-scroll">
              {filtered.map((c) => {
                const selected = c.dial === dial;
                return (
                  <button
                    key={c.code + c.dial}
                    type="button"
                    onClick={() => selectDial(c.dial)}
                    className={`w-full flex items-center gap-3 px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      selected ? 'bg-slate-100 dark:bg-slate-800' : ''
                    }`}
                  >
                    <span className="shrink-0">
                      <ReactCountryFlag
                        countryCode={c.code}
                        svg
                        aria-hidden
                        style={{ width: '1.6rem', height: '1.15rem', display: 'block' }}
                      />
                    </span>
                    <span className="flex-1">{c.name}</span>
                    <span className="font-mono opacity-80">{c.dial}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Scrollbar moderna na cor da marca #1A9386 */}
      <style>{`
        .ddi-scroll {
          scrollbar-width: thin;                /* Firefox */
          scrollbar-color: #1A9386 transparent; /* Firefox */
        }
        .ddi-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .ddi-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .ddi-scroll::-webkit-scrollbar-thumb {
          background: #1A9386;
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .ddi-scroll::-webkit-scrollbar-thumb:hover {
          background: #157d73;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
    </>
  );
}