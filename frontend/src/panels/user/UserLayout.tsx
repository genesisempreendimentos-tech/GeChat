import { PanelShell } from '@/components/layout/PanelShell';
import UserSidebar from '@/panels/user/UserSidebar';
import { useGeChatSocket } from '@/modules/gechat/hooks/useGeChatSocket';
import { useGeChatBootstrap } from '@/modules/gechat/hooks/useGeChat';

export default function UserLayout() {
  useGeChatSocket(true);
  useGeChatBootstrap();

  return (
    <PanelShell
      sidebar={UserSidebar}
      mainAriaLabel="GêChat"
      mainClassName="gechat-main"
    />
  );
}
