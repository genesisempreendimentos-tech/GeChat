import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Check, X, KeyRound } from 'lucide-react';
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
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400"
        >
          <Check className="h-4 w-4 shrink-0" />
          {successMessage}
        </motion.div>
      )}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <X className="h-4 w-4 shrink-0" />
          {errorMessage}
        </motion.div>
      )}

      <div className="w-full overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/20">
        <div className="border-b border-border/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
              <KeyRound className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Alterar senha</p>
              <p className="text-xs text-muted-foreground">Use uma senha forte e única</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 px-5 pb-5 pt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Senha atual</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nova senha</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Confirmar nova senha</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 text-sm"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={saving} size="sm" className="mt-1 gap-2">
            <Lock className="h-3.5 w-3.5" />
            {saving ? 'Alterando...' : 'Alterar senha'}
          </Button>
        </div>
      </div>
    </div>
  );
}
