import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Check, X, KeyRound, Monitor, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';

export function ProfileSecurityTab() {
  const { user: currentUser } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [openBox, setOpenBox] = useState<'password' | 'sessions' | null>(null);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (!currentPassword) {
      setErrorMessage('Digite a senha atual');
      return;
    }
    if (!currentUser?.email) return;

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });
      if (signInError) {
        setErrorMessage('Senha atual incorreta');
        setSaving(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccessMessage('Senha alterada com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setErrorMessage((err as Error).message ?? 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toasts */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm"
        >
          <Check className="w-4 h-4 shrink-0" />
          {successMessage}
        </motion.div>
      )}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
        >
          <X className="w-4 h-4 shrink-0" />
          {errorMessage}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Alterar senha */}
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenBox((v) => (v === 'password' ? null : 'password'))}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Alterar senha</p>
                  <p className="text-xs text-muted-foreground">Use uma senha forte e única</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openBox === 'password' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {openBox === 'password' && (
              <motion.div
                key="password-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-3">
                  <div className="space-y-1.5 pt-3">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Senha atual</label>
                    <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nova senha</label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirmar nova senha</label>
                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="h-9 text-sm" />
                  </div>
                  <Button onClick={handleChangePassword} disabled={saving} size="sm" className="gap-2 mt-1">
                    <Lock className="w-3.5 h-3.5" />
                    {saving ? 'Alterando...' : 'Alterar senha'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Box 2: Sessões e dispositivos */}
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenBox((v) => (v === 'sessions' ? null : 'sessions'))}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                  <Monitor className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Sessões e dispositivos</p>
                  <p className="text-xs text-muted-foreground">Dispositivos conectados à conta</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openBox === 'sessions' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {openBox === 'sessions' && (
              <motion.div
                key="sessions-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-4 border-t border-border/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-sky-500/60" />
                    <p className="text-sm">Em breve você poderá ver e encerrar sessões ativas aqui.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
