import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { BRAND_LOGO_SRC } from '@/lib/brandAssets';
const LogoSvg = '/assets/logo-gen-sem-fundo-svg.svg';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validações
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }
    
    // Derivar nome do email (ex: joao.silva@domain.com -> Joao Silva)
    const namePart = email.split('@')[0];
    const derivedName = namePart
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
      
    const result = await register(email, password, derivedName);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } else {
      if (import.meta.env.DEV) console.error('Erro no cadastro:', result.error);
      
      setError(result.error || 'Erro ao criar conta');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary/40" />
      
      {/* Logos animadas no background */}
      <motion.div 
        className="absolute top-20 left-20 w-80 h-80 opacity-10"
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      
      <motion.div 
        className="absolute bottom-32 right-16 w-64 h-64 opacity-8"
        animate={{ 
          rotate: -360,
          scale: [1, 1.2, 1]
        }}
        transition={{ 
          rotate: { duration: 25, repeat: Infinity, ease: "linear" },
          scale: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }
        }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      
      <motion.div 
        className="absolute top-1/2 left-10 w-48 h-48 opacity-7"
        animate={{ 
          y: [0, -20, 0],
          rotate: 360
        }}
        transition={{ 
          y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 15, repeat: Infinity, ease: "linear" }
        }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      
      <motion.div 
        className="absolute top-1/3 right-24 w-56 h-56 opacity-9"
        animate={{ 
          x: [0, 20, 0],
          rotate: -360
        }}
        transition={{ 
          x: { duration: 7, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 18, repeat: Infinity, ease: "linear" }
        }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      
      <motion.div 
        className="absolute top-16 right-32 w-72 h-72 opacity-6"
        animate={{ 
          rotate: 360,
          scale: [1, 1.15, 1]
        }}
        transition={{ 
          rotate: { duration: 22, repeat: Infinity, ease: "linear" },
          scale: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
        }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      
      <motion.div 
        className="absolute bottom-20 left-32 w-60 h-60 opacity-8"
        animate={{ 
          rotate: -360,
          x: [0, -15, 0]
        }}
        transition={{ 
          rotate: { duration: 28, repeat: Infinity, ease: "linear" },
          x: { duration: 6.5, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      
      <motion.div 
        className="absolute top-2/3 right-12 w-52 h-52 opacity-7"
        animate={{ 
          rotate: 360,
          y: [0, 15, 0]
        }}
        transition={{ 
          rotate: { duration: 17, repeat: Infinity, ease: "linear" },
          y: { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }
        }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      
      <motion.div 
        className="absolute top-1/4 left-1/4 w-44 h-44 opacity-5"
        animate={{ 
          rotate: -360,
          scale: [1, 1.3, 1]
        }}
        transition={{ 
          rotate: { duration: 30, repeat: Infinity, ease: "linear" },
          scale: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }
        }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      
      {/* Padrão de fundo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Círculos decorativos */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-background/95">
          <CardHeader className="space-y-6 pb-8 pt-10">
            {/* Logo */}
            <motion.div 
              className="flex justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                <motion.div 
                  className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-lg p-3"
                  animate={{ 
                    rotate: [0, 5, 0, -5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <img
                    src={BRAND_LOGO_SRC}
                    alt="GêNovo"
                    className="w-full h-full object-contain"
                  />
                </motion.div>
              </div>
            </motion.div>
            
            {/* Título */}
            <motion.div 
              className="text-center space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <motion.div
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent" style={{ backgroundSize: '200% auto' }}>
                  GêNovo
                </CardTitle>
              </motion.div>
              <CardDescription className="text-base">
                Crie sua conta para começar a acompanhar leads
              </CardDescription>
            </motion.div>
          </CardHeader>
        
        <CardContent>
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8 space-y-4"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-600">Conta criada com sucesso!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Enviamos um link de confirmação para o seu e-mail.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Redirecionando para login...
                </p>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
              >
                <label className="text-sm font-medium">Email Corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="voce@example.com"
                    className="pl-10 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              >
                <label className="text-sm font-medium">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10 pr-10 h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded p-0.5"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55, duration: 0.3 }}
              >
                <label className="text-sm font-medium">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Digite a senha novamente"
                    className="pl-10 pr-10 h-11"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded p-0.5"
                    aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <p className="text-destructive text-sm font-medium text-center">
                    {error}
                  </p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
              >
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                  <img src="/Gen-Moviment.gif" alt="" className="h-5 w-5 object-contain" />
                      Criando conta...
                    </span>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.3 }}
                className="text-center pt-2"
              >
                <p className="text-sm text-muted-foreground">
                  Já tem uma conta?{' '}
                  <Link to="/login" className="text-primary font-medium hover:underline">
                    Fazer login
                  </Link>
                </p>
              </motion.div>
            </form>
          )}
        </CardContent>
      </Card>
      
      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="mt-6 text-center"
      >
        <p className="text-xs text-white/70">
          © Demo UI — sem dados reais.
        </p>
      </motion.div>
      </motion.div>
    </div>
  );
}
