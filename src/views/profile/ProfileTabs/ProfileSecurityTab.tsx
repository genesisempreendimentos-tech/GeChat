import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Check, X, KeyRound, Monitor, ChevronDown } from 'lucide-react';
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
    <div className="space-y-6">
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary text-primary px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <Check className="w-5 h-5" />
          <span>{successMessage}</span>
        </motion.div>
      )}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <X className="w-5 h-5" />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Alterar senha */}
        <Card>
          <button
            type="button"
            onClick={() => setOpenBox((v) => (v === 'password' ? null : 'password'))}
            className="w-full text-left"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <CardTitle className="text-base">Alterar senha</CardTitle>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform ${openBox === 'password' ? 'rotate-180' : ''}`}
              />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Recomendamos usar uma senha forte e única.
              </p>
            </CardContent>
          </button>
          {openBox === 'password' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="border-t pt-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha atual</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nova senha</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmar nova senha</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button onClick={handleChangePassword} variant="outline" disabled={saving}>
                  <Lock className="w-4 h-4 mr-2" />
                  {saving ? 'Alterando...' : 'Alterar senha'}
                </Button>
              </CardContent>
            </motion.div>
          )}
        </Card>

        {/* Box 2: Sessões e dispositivos */}
        <Card>
          <button
            type="button"
            onClick={() => setOpenBox((v) => (v === 'sessions' ? null : 'sessions'))}
            className="w-full text-left"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                <CardTitle className="text-base">Sessões e dispositivos</CardTitle>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform ${openBox === 'sessions' ? 'rotate-180' : ''}`}
              />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Gerencie os dispositivos conectados à sua conta.
              </p>
            </CardContent>
          </button>
          {openBox === 'sessions' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Em breve você poderá ver e encerrar sessões ativas aqui.
                </p>
              </CardContent>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}
