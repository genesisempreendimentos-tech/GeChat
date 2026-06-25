import { Navigate, Route } from 'react-router-dom';
import { vitrinePath } from '@/lib/panels';

/** Redireciona rotas legadas para o namespace da Vitrine. */
export const vitrineLegacyRedirectRoutes = (
  <>
    <Route path="/dashboard" element={<Navigate to={vitrinePath('/item-1')} replace />} />
    <Route path="/settings" element={<Navigate to={vitrinePath('/settings')} replace />} />
    <Route path="/notifications" element={<Navigate to={vitrinePath('/notifications')} replace />} />
  </>
);
