import { PanelShell } from '@/components/layout/PanelShell';
import VitrineSidebar from '@/panels/vitrine/VitrineSidebar';

export default function VitrineLayout() {
  return (
    <PanelShell
      sidebar={VitrineSidebar}
      mainAriaLabel="Vitrine de referência"
    />
  );
}
