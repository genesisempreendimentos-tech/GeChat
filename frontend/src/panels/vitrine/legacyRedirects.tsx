import { Navigate, Route } from 'react-router-dom';
import { vitrinePath } from '@/lib/panels';

/**
 * Redireciona rotas legadas (pré-painéis) para o namespace da Vitrine.
 * Remova junto com o módulo `panels/vitrine/` quando a Vitrine for descartada.
 */
export const vitrineLegacyRedirectRoutes = (
  <>
    <Route path="/dashboard" element={<Navigate to={vitrinePath('/dashboard')} replace />} />
    <Route path="/dados" element={<Navigate to={vitrinePath('/dados')} replace />} />
    <Route path="/dados/qualidade" element={<Navigate to={vitrinePath('/dados/qualidade')} replace />} />
    <Route path="/maturacao" element={<Navigate to={vitrinePath('/maturacao')} replace />} />
    <Route path="/empreendimentos" element={<Navigate to={vitrinePath('/empreendimentos')} replace />} />
    <Route path="/relatorios" element={<Navigate to={vitrinePath('/relatorios')} replace />} />
    <Route path="/leads" element={<Navigate to={vitrinePath('/leads')} replace />} />
    <Route path="/notifications" element={<Navigate to={vitrinePath('/notifications')} replace />} />
    <Route path="/profile" element={<Navigate to={vitrinePath('/profile')} replace />} />
    <Route path="/settings" element={<Navigate to={vitrinePath('/settings')} replace />} />
    <Route path="/systems" element={<Navigate to={vitrinePath('/leads')} replace />} />
    <Route path="/favorites" element={<Navigate to={vitrinePath('/leads')} replace />} />
    <Route path="/solicitacoes" element={<Navigate to={vitrinePath('/leads')} replace />} />
    <Route path="/equipes" element={<Navigate to={vitrinePath('/leads')} replace />} />
    <Route path="/empresa" element={<Navigate to={vitrinePath('/leads')} replace />} />
    <Route path="/comunicados" element={<Navigate to={vitrinePath('/leads')} replace />} />
    <Route path="/chat" element={<Navigate to={vitrinePath('/leads')} replace />} />
  </>
);
