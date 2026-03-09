import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import LogoSvg from '../../assets/logo-gen-sem-fundo-svg.svg';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUserNotFound(false);
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      const errorMsg = result.error || 'Erro ao fazer login';
      
      // Detectar se é erro de usuário inexistente
      if (errorMsg === 'USUARIO_NAO_CADASTRADO') {
        setUserNotFound(true);
        setError('Usuário não cadastrado no sistema');
      } else if (errorMsg.includes('inválidos') || errorMsg.includes('Invalid')) {
        setUserNotFound(true);
        setError('Usuário não encontrado');
      } else {
        setError(errorMsg);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30" />
      
      {/* Logos decorativas no background (reduzido para visual mais limpo) */}
      <motion.div
        className="absolute top-24 left-1/4 w-72 h-72 opacity-[0.06]"
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      <motion.div
        className="absolute bottom-40 right-1/4 w-64 h-64 opacity-[0.05]"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)' }} />
      </motion.div>
      <motion.div
        className="absolute top-1/2 right-20 w-48 h-48 opacity-[0.04]"
        animate={{ y: [0, -15, 0], rotate: 360 }}
        transition={{ y: { duration: 8, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 20, repeat: Infinity, ease: "linear" } }}
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
        <Card className="border-0 shadow-2xl shadow-black/20 backdrop-blur-md bg-background/95 rounded-2xl overflow-hidden">
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
                    src="/assets/GêApps.svg" 
                    alt="GêApps" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'brightness(0) saturate(100%) invert(55%) sepia(89%) saturate(2148%) hue-rotate(138deg) brightness(91%) contrast(96%)'
                    }}
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
                  GêApps
                </CardTitle>
              </motion.div>
              <CardDescription className="text-base">
                Hub Central de Sistemas Corporativos
              </CardDescription>
              <div className="pt-2">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Genesis Empreendimentos
                </span>
              </div>
            </motion.div>
          </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <label className="text-sm font-medium">Email Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu.nome@genesisempreendimentos.com.br"
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
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-lg border ${
                  userNotFound 
                    ? 'bg-blue-500/10 border-blue-500/20' 
                    : 'bg-destructive/10 border-destructive/20'
                }`}
              >
                {userNotFound ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Este usuário não existe
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Não encontramos uma conta com este email. Deseja criar uma nova conta?
                        </p>
                      </div>
                    </div>
                    <Link 
                      to="/signup" 
                      className="block w-full"
                      onClick={() => {
                        setError('');
                        setUserNotFound(false);
                      }}
                    >
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50"
                      >
                        Criar nova conta
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-destructive text-sm font-medium text-center">
                    {error}
                  </p>
                )}
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
                    <img src="/GeIcons/Gen-Moviment.gif" alt="" className="h-5 w-5 object-contain" />
                    Entrando...
                  </span>
                ) : (
                  'Entrar no GêApps'
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
                Não tem uma conta?{' '}
                <Link to="/signup" className="text-primary font-medium hover:underline">
                  Criar conta
                </Link>
              </p>
            </motion.div>
          </form>
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
          © 2026 Genesis Empreendimentos. Todos os direitos reservados.
        </p>
      </motion.div>
      </motion.div>
    </div>
  );
}
