// src/components/views/ProfileView/ProfileTabs/ProfileSecurity.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext.jsx';
import { supabase } from '@/lib/customSupabaseClient.js';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

import {
  Shield,
  Edit,
  AlertTriangle,
  Trash2,
  Loader2,
  Smartphone,
  KeyRound,
  Lock,
  ChevronDown,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';

const BRAND_COLOR = '#1A9386';

/* Util: hex -> rgba com alpha para fundo semitransparente */
function hexToRgba(hex, alpha = 0.25) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* Paleta forte por ativo (borda forte + “bola” do ícone) */
const ACCENTS = {
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  orange: '#F59E0B',
  red: '#EF4444',
};

/* ---------------------------------------
 * Subcomponentes autocontidos (locais)
 * -------------------------------------*/

function ChangePasswordDialog({ open, onOpenChange }) {
  const { updateUserPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter no mínimo 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    const { error } = await updateUserPassword(password);
    setLoading(false);
    if (error) return;

    setPassword('');
    setConfirm('');
    onOpenChange(false);
    toast({ title: 'Sucesso!', description: 'Senha alterada com sucesso.' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
          <DialogDescription>Defina uma nova senha para sua conta.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="new-pass">Nova senha</Label>
            <Input
              id="new-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <Label htmlFor="confirm-pass">Confirmar nova senha</Label>
            <Input
              id="confirm-pass"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoodbyeDialog({ open, showExitButton }) {
  const handleExit = () => {
    window.location.href = 'https://getask.moregenesis.com.br/login';
  };

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="text-center">
        <DialogHeader>
          <DialogTitle>Uma pena você ir embora…</DialogTitle>
          <DialogDescription>Foi um prazer tê-lo aqui! Até a próxima.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center h-24">
          {!showExitButton ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <Button onClick={handleExit}>Sair</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* Card visual padronizado dos ativos
   - Borda: cor forte
   - Fundo: semitransparente da cor forte
   - Ícone: claro no tema claro (#D5D9E0) e escuro no tema escuro (#1E293B)
   - “Bola” do ícone: a cor forte
*/
function SecurityActionCard({
  title,
  description,
  icon: Icon,
  actionLabel,
  actionVariant = 'secondary',
  onAction,
  accentColor,
  rightSlot, // opcional (ex.: switch, botão extra)
  children,  // ⬅️ ADICIONADO: conteúdo interno (ex.: lista de dispositivos)
}) {
  const bgSemi = hexToRgba(accentColor, 0.1);

  return (
    <div
      className="p-4 rounded-lg flex flex-col gap-4 border"
      style={{ borderColor: accentColor, backgroundColor: bgSemi }}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="p-2 rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            <Icon
              className="w-5 h-5 text-[#D5D9E0] dark:text-[#1E293B]"
              aria-hidden="true"
            />
          </div>
          <div>
            <h4 className="font-bold">{title}</h4>
            <p className="text-sm opacity-80">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {rightSlot}
          {onAction && (
            <Button
              variant={actionVariant}
              onClick={onAction}
              style={{
                backgroundColor: accentColor,
                color: '#ffffff',
                borderColor: accentColor,
              }}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>

      {/* ⬇️ CONTEÚDO INTERNO (ex.: lista de dispositivos) dentro do mesmo box */}
      {children}
    </div>
  );
}


/* ---------------------------------------
 * Componente principal: ProfileSecurity
 * -------------------------------------*/

export default function ProfileSecurity() {
  const { user, signOut, getUserSessions, revokeSession, revokeAllOtherSessions } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Dialogs / Estados locais
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDataAlert, setDeleteDataAlert] = useState(false);
  const [deleteAccountAlert, setDeleteAccountAlert] = useState(false);
  const [deleteDataContactDialog, setDeleteDataContactDialog] = useState(false);
  const [deleteAccountContactDialog, setDeleteAccountContactDialog] = useState(false);
  const [goodbyeDialogOpen, setGoodbyeDialogOpen] = useState(false);
  const [showExitButton, setShowExitButton] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Detectar quando vem do email de recuperação de senha
  useEffect(() => {
    const hash = location.hash;
    
    // Verificar se há token de recuperação na URL (hash contém access_token e type=recovery)
    const hasRecoveryToken = hash && hash.includes('access_token') && hash.includes('type=recovery');
    
    if (hasRecoveryToken) {
      // Limpar URL para remover o token da barra de endereços
      const cleanPath = location.pathname;
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('resetPassword');
      const cleanUrl = cleanPath + (newSearchParams.toString() ? `?${newSearchParams.toString()}` : '');
      window.history.replaceState({}, '', cleanUrl);
      
      // Abrir o popup automaticamente após um pequeno delay para garantir que o componente está montado
      setTimeout(() => {
        setPasswordDialogOpen(true);
      }, 300);
    }
  }, [location, searchParams]);

  // Placeholders para 2FA e Dispositivos
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Novo: expand/encolher Sessões & Dispositivos (minimizado por padrão)
  const [sessionsOpen, setSessionsOpen] = useState(false);

  // Carregar sessões do banco de dados
  const loadSessions = async () => {
    if (!user?.id) return;
    
    setLoadingSessions(true);
    try {
      const { data, error } = await getUserSessions();
      
      if (error) throw error;
      
      // Formatar dados para exibição
      const formattedSessions = (data || []).map(session => ({
        id: session.id,
        device: session.device_name,
        browser: session.browser,
        os: session.os,
        location: session.location || 'Localização não disponível',
        isCurrent: session.is_current_session,
        lastActive: formatDistanceToNow(new Date(session.last_active_at), {
          addSuffix: true,
          locale: ptBR
        }),
        lastActiveDate: format(new Date(session.last_active_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
        createdAt: format(new Date(session.created_at), "dd/MM/yyyy", { locale: ptBR }),
        sessionId: session.session_id
      }));
      
      setSessions(formattedSessions);
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as sessões.',
        variant: 'destructive'
      });
    } finally {
      setLoadingSessions(false);
    }
  };

  // Carregar sessões quando expandir
  useEffect(() => {
    if (sessionsOpen && user?.id && getUserSessions) {
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsOpen, user?.id]);

  // Handler para revogar sessão
  const handleRevokeSession = async (sessionId, deviceName, isCurrent) => {
    try {
      const { error } = await revokeSession(sessionId);
      
      if (error) throw error;
      
      // Se for a sessão atual, o signOut já foi chamado na função revokeSession
      if (isCurrent) {
        toast({
          title: 'Sessão encerrada',
          description: 'Você foi desconectado desta sessão.',
        });
        return;
      }
      
      // Atualizar lista
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({
        title: 'Sessão encerrada',
        description: `Sessão "${deviceName}" foi encerrada.`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível encerrar a sessão.',
        variant: 'destructive'
      });
    }
  };

  // Handler para revogar todas as outras sessões
  const handleRevokeAllOtherSessions = async () => {
    try {
      const { error } = await revokeAllOtherSessions();
      
      if (error) throw error;
      
      // Recarregar lista
      await loadSessions();
      
      toast({
        title: 'Sessões encerradas',
        description: 'Todas as outras sessões foram encerradas.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível encerrar as sessões.',
        variant: 'destructive'
      });
    }
  };

  // Handler para abrir dialog de contato para apagar dados
  const handleDeleteAllDataClick = () => {
    setDeleteDataContactDialog(true);
  };

  // Handler para contato WhatsApp - Apagar dados
  const handleContactWhatsAppDeleteData = () => {
    const phoneNumber = '5521996159111'; // +55 21 99615-9111 (sem espaços e caracteres especiais)
    const message = encodeURIComponent(`Olá,\n\nGostaria de solicitar a exclusão de todos os meus dados.\n\nAgradeço desde já.`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    setDeleteDataContactDialog(false);
  };

  // Apagar todos os dados do usuário (BLOQUEADO - não será chamado)
  const handleDeleteAllData = async () => {
    setLoading(true);
    try {
      const tables = ['tasks', 'someday_tasks', 'areas', 'tags'];
      const results = await Promise.all(
        tables.map((t) => supabase.from(t).delete().eq('user_id', user.id))
      );
      const errors = results.filter((r) => r.error);

      if (errors.length) {
        toast({
          title: 'Erro',
          description: 'Não foi possível apagar todos os dados. Tente novamente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso!',
          description: 'Seus dados foram apagados. Sua conta permanece ativa.',
        });
      }
    } finally {
      setLoading(false);
      setDeleteDataAlert(false);
    }
  };

  // Handler para abrir dialog de contato para excluir conta
  const handleDeleteAccountClick = () => {
    setDeleteAccountContactDialog(true);
  };

  // Handler para contato WhatsApp - Excluir conta
  const handleContactWhatsAppDeleteAccount = () => {
    const phoneNumber = '5521996159111'; // +55 21 99615-9111 (sem espaços e caracteres especiais)
    const message = encodeURIComponent(`Olá,\n\nGostaria de solicitar a exclusão da minha conta.\n\nAgradeço desde já.`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    setDeleteAccountContactDialog(false);
  };

  // Excluir conta (BLOQUEADO - não será chamado)
  const handleDeleteAccount = async () => {
    setDeleteAccountAlert(false);
    setGoodbyeDialogOpen(true);
    setShowExitButton(false);

    const start = Date.now();

    const { error } = await supabase.functions.invoke('delete-user');
    if (error) {
      setGoodbyeDialogOpen(false);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir sua conta. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    await signOut();
    localStorage.clear();
    sessionStorage.clear();

    const elapsed = Date.now() - start;
    const remaining = 5000 - elapsed;
    setTimeout(() => setShowExitButton(true), Math.max(0, remaining));
  };

  return (
    <>
      {/* Box de fundo do card principal por tema */}
      <Card className="bg-gray-300 dark:bg-slate-900/30 border border-slate-400 dark:border-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield style={{ color: BRAND_COLOR }} /> Segurança da Conta
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Alterar senha (AZUL) */}
          <SecurityActionCard
            title="Alterar senha"
            description="Recomendamos usar uma senha forte e única."
            icon={Edit}
            actionLabel="Alterar senha"
            actionVariant="secondary"
            onAction={() => setPasswordDialogOpen(true)}
            accentColor={ACCENTS.blue}
          />

          {/* 2FA (VERDE) - OCULTO */}
          {/* <SecurityActionCard
            title="Verificação em duas etapas (2FA)"
            description={
              twoFAEnabled
                ? '2FA está ativada. Você será solicitado a informar um código adicional no login.'
                : 'Ative a verificação em duas etapas para aumentar a segurança da sua conta.'
            }
            icon={KeyRound}
            actionLabel={twoFAEnabled ? 'Desativar 2FA' : 'Ativar 2FA'}
            actionVariant="secondary"
            onAction={() => {
              setTwoFAEnabled((v) => !v);
              toast({
                title: twoFAEnabled ? '2FA desativada' : '2FA ativada',
                description: twoFAEnabled
                  ? 'A verificação em duas etapas foi desativada.'
                  : 'A verificação em duas etapas foi ativada (placeholder).',
              });
            }}
            accentColor={ACCENTS.green}
          /> */}

          {/* Sessões / Dispositivos (ROXA) com expandir/encolher dentro do mesmo box */}
          <SecurityActionCard
            title="Sessões e dispositivos"
            description="Gerencie os dispositivos conectados à sua conta."
            icon={Smartphone}
            accentColor={ACCENTS.purple}
            rightSlot={
              <Button
                variant="ghost"
                aria-label={sessionsOpen ? 'Encolher' : 'Expandir'}
                onClick={() => setSessionsOpen((v) => !v)}
                className="h-9 w-9 p-0"
              >
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${sessionsOpen ? 'rotate-180' : 'rotate-0'}`}
                />
              </Button>
            }
          >
            {sessionsOpen && (
              <div className="space-y-3">
                {loadingSessions ? (
                  <div className="text-center py-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando sessões...
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Nenhuma sessão ativa encontrada.
                  </div>
                ) : (
                  <>
                    {sessions.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRevokeAllOtherSessions}
                        className="w-full mb-2"
                        style={{
                          borderColor: ACCENTS.purple,
                          color: ACCENTS.purple
                        }}
                      >
                        Encerrar todas as outras sessões
                      </Button>
                    )}
                    
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-3 rounded-md border ${
                          s.isCurrent 
                            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700' 
                            : 'bg-[#D5D9E0] dark:bg-[#1E293B]'
                        }`}
                        style={{ borderColor: ACCENTS.purple }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ACCENTS.purple }}>
                            <Smartphone className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium truncate">{s.device}</div>
                              {s.isCurrent && (
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  Sessão atual
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs opacity-70 mt-1">
                              Último acesso: {s.lastActive}
                            </div>
                            <div className="text-xs opacity-50 mt-0.5">
                              Criada em: {s.createdAt}
                            </div>
                          </div>
                        </div>
                        {!s.isCurrent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeSession(s.id, s.device, s.isCurrent)}
                            className="flex-shrink-0"
                            style={{
                              backgroundColor: ACCENTS.purple,
                              borderColor: ACCENTS.purple,
                              color: 'white',
                            }}
                          >
                            Encerrar
                          </Button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </SecurityActionCard>

          {/* Apagar dados (LARANJA) */}
          <SecurityActionCard
            title="Apagar todos os dados"
            description="Esta ação apagará tarefas, áreas e tags. Sua conta será mantida."
            icon={AlertTriangle}
            actionLabel="Apagar dados"
            actionVariant="destructive"
            onAction={handleDeleteAllDataClick}
            accentColor={ACCENTS.orange}
          />

          {/* Excluir conta (VERMELHA) */}
          <SecurityActionCard
            title="Excluir conta"
            description="Excluir sua conta removerá permanentemente todos os seus dados. Esta ação não pode ser desfeita."
            icon={Trash2}
            actionLabel="Excluir conta"
            actionVariant="destructive"
            onAction={handleDeleteAccountClick}
            accentColor={ACCENTS.red}
          />
        </CardContent>
      </Card>

      {/* Dialogs & Alerts */}
      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />

      <AlertDialog open={deleteDataAlert} onOpenChange={setDeleteDataAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação apagará todas as suas tarefas, áreas e tags. Sua conta será mantida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllData} disabled={loading}>
              {loading ? 'Apagando…' : 'Sim, apagar dados'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAccountAlert} onOpenChange={setDeleteAccountAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os seus dados e acesso serão apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount}>Sim, excluir conta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GoodbyeDialog open={goodbyeDialogOpen} showExitButton={showExitButton} />

      {/* Dialog de contato para apagar dados */}
      <Dialog open={deleteDataContactDialog} onOpenChange={setDeleteDataContactDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle>Apagar Todos os Dados</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              A exclusão de todos os dados é uma ação sensível e requer autorização da administração.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Entre em contato com a administração solicitando a exclusão:
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDataContactDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleContactWhatsAppDeleteData}
              className="bg-[#1A9386] hover:bg-[#1A9386]/90"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Entrar em Contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de contato para excluir conta */}
      <Dialog open={deleteAccountContactDialog} onOpenChange={setDeleteAccountContactDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle>Excluir Conta</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              A exclusão da conta é uma ação irreversível e requer autorização da administração.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Entre em contato com a administração solicitando a exclusão:
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteAccountContactDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleContactWhatsAppDeleteAccount}
              className="bg-[#1A9386] hover:bg-[#1A9386]/90"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Entrar em Contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
