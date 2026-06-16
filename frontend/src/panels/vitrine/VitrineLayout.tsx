import { PanelShell } from '@/components/layout/PanelShell';
import VitrineSidebar from '@/panels/vitrine/VitrineSidebar';
import { useCvcrmIncrementalOnMount } from '@/hooks/useCvcrmIncrementalOnMount';

export default function VitrineLayout() {
  useCvcrmIncrementalOnMount();

  return (
    <PanelShell
      sidebar={VitrineSidebar}
      mainAriaLabel="Vitrine de referência"
    />
  );
}
