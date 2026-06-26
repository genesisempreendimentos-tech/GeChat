import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { BRAND_LOGO_SRC } from '@/lib/brandAssets';
import { AuthPageBackground } from '@/components/auth/AuthPageBackground';
const LogoSvg = '/assets/logo-gen-sem-fundo-svg.svg';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const navigate = useNavigate();
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    const check = (isRetry: boolean) =>
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setHasSession(true);
          return;
        }
        if (isRetry) {
          setHasSession(false);
          navigate('/login', { replace: true });
        }
      });
    check(false);
    const timer = setTimeout(() => check(true), 400);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || 'Erro ao alterar a senha.');
      setLoading(false);
      return;
    }
    await checkAuth();
    setLoading(false);
    navigate('/', { replace: true });
  };

  if (hasSession === null) {
    return null;
  }

  if (!hasSession) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <AuthPageBackground />
      <motion.div
        className="absolute top-24 left-1/4 w-72 h-72 opacity-[0.06]"
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      <motion.div
        className="absolute bottom-40 right-1/4 w-64 h-64 opacity-[0.05]"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      <motion.div
        className="absolute top-1/2 right-20 w-48 h-48 opacity-[0.04]"
        animate={{ y: [0, -15, 0], rotate: 360 }}
        transition={{ y: { duration: 8, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 20, repeat: Infinity, ease: 'linear' } }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-0 shadow-2xl shadow-black/20 backdrop-blur-md bg-background/95 rounded-2xl overflow-hidden">
          <CardHeader className="space-y-6 pb-8 pt-10">
            <motion.div className="flex justify-center" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, duration: 0.3 }}>
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                <motion.div
                  className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-lg p-3"
                  animate={{ rotate: [0, 5, 0, -5, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <img src={BRAND_LOGO_SRC} alt="GêChat" className="w-full h-full object-contain" />
                </motion.div>
              </div>
            </motion.div>
            <motion.div className="text-center space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.3 }}>
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent" style={{ backgroundSize: '200% auto' }}>
                Nova senha
              </CardTitle>
              <CardDescription className="text-base">
                Defina uma nova senha para acessar o GêChat
              </CardDescription>
              <div className="pt-2">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Demo UI</span>
              </div>
            </motion.div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div className="space-y-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.3 }}>
                <label className="text-sm font-medium">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" className="pl-10 h-11" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
              </motion.div>

              <motion.div className="space-y-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.3 }}>
                <label className="text-sm font-medium">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" className="pl-10 h-11" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
                </div>
              </motion.div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-lg border bg-destructive/10 border-destructive/20">
                  <p className="text-destructive text-sm font-medium text-center">{error}</p>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.3 }}>
                <Button type="submit" className="w-full h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                  <img src="/Gen-Moviment.gif" alt="" className="h-5 w-5 object-contain" />
                      Alterando...
                    </span>
                  ) : (
                    'Alterar a senha'
                  )}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.3 }} className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">© Demo UI — sem dados reais.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
