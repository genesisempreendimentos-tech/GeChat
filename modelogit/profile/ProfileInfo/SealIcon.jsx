// src/components/views/profile/ProfileInfo/SealIcon.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Briefcase, ClipboardList, FileText, Users, Calendar as CalendarIcon,
  Wrench, Hammer, Cpu, Cog, Compass, DollarSign, Wallet, CreditCard,
  BarChart, LineChart, Ruler, Building2, Square, Layers, Grid,
  Megaphone, ShoppingBag, Globe, Target, Lightbulb,
} from 'lucide-react';

const SEAL_ICON_OPTIONS = [
  { id: 'briefcase',    Comp: Briefcase },
  { id: 'clipboard',    Comp: ClipboardList },
  { id: 'file-text',    Comp: FileText },
  { id: 'users',        Comp: Users },
  { id: 'calendar',     Comp: CalendarIcon },
  { id: 'wrench',       Comp: Wrench },
  { id: 'hammer',       Comp: Hammer },
  { id: 'cpu',          Comp: Cpu },
  { id: 'cog',          Comp: Cog },
  { id: 'compass',      Comp: Compass },
  { id: 'dollar',       Comp: DollarSign },
  { id: 'wallet',       Comp: Wallet },
  { id: 'credit-card',  Comp: CreditCard },
  { id: 'bar-chart',    Comp: BarChart },
  { id: 'line-chart',    Comp: LineChart },
  { id: 'ruler',        Comp: Ruler },
  { id: 'building',     Comp: Building2 },
  { id: 'square',       Comp: Square },
  { id: 'layers',       Comp: Layers },
  { id: 'grid',         Comp: Grid },
  { id: 'megaphone',    Comp: Megaphone },
  { id: 'shopping-bag', Comp: ShoppingBag },
  { id: 'globe',        Comp: Globe },
  { id: 'target',       Comp: Target },
  { id: 'lightbulb',    Comp: Lightbulb },
];

const SEAL_IDS = new Set(SEAL_ICON_OPTIONS.map(o => o.id));
export const normalizeSealId = (v) => {
  if (!v) return 'briefcase';
  const s = String(v).trim().toLowerCase().replace(/\s+/g, '-');
  return SEAL_IDS.has(s) ? s : 'briefcase';
};

export const getSealComp = (id) => (SEAL_ICON_OPTIONS.find(o => o.id === id)?.Comp || Briefcase);

export default function SealIcon({ 
  sealIcon, 
  setFormData, 
  formData, 
  isEditing, 
  iconPopupOpen, 
  setIconPopupOpen 
}) {
  const SealIconComp = getSealComp(sealIcon);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        disabled={!isEditing}
        onClick={() => setIconPopupOpen(true)}
      >
        <SealIconComp className="w-5 h-5 text-slate-700 dark:text-slate-300" />
      </Button>

      {/* Popup de ícones */}
      {iconPopupOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-md shadow-lg max-w-md">
            <h3 className="mb-4 font-semibold text-center">Escolha um ícone de profissão</h3>
            <div className="grid grid-cols-5 gap-3">
              {SEAL_ICON_OPTIONS.map(({ id, Comp }) => (
                <button
                  key={id}
                  onClick={() => {
                    setFormData({ ...formData, sealIcon: id });
                    setIconPopupOpen(false);
                  }}
                  className={`p-2 border rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${
                    formData.sealIcon === id ? 'ring-2 ring-slate-400' : ''
                  }`}
                >
                  <Comp className="w-5 h-5 mx-auto text-slate-700 dark:text-slate-300" />
                </button>
              ))}
            </div>
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={() => setIconPopupOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}