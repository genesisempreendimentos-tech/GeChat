import { Outlet, useLocation } from 'react-router-dom';
import { MotionPage } from '@/components/motion/AppMotion';

export default function AuthLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen">
      <MotionPage pageKey={location.pathname}>
        <Outlet />
      </MotionPage>
    </div>
  );
}
