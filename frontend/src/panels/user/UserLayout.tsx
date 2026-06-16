import { PanelShell } from '@/components/layout/PanelShell';
import UserSidebar from '@/panels/user/UserSidebar';

export default function UserLayout() {
  return (
    <PanelShell
      sidebar={UserSidebar}
      mainAriaLabel="Painel User"
    />
  );
}
