import { useState, useEffect } from "react";
import {
  useNavigate,
  Link,
  useSearchParams,
  useLocation,
  type Location as RouterLocation,
} from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/supabase";
import { isAllowedReturnToUrl } from "@/services/authStorage";
import { getSafeInternalReturnPath } from "@/lib/postLoginRedirect";
import { BRAND_LOGO_SRC } from "@/lib/brandAssets";
import { AuthPageBackground } from "@/components/auth/AuthPageBackground";
const LogoSvg = '/assets/logo-gen-sem-fundo-svg.svg';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [emailSentModalOpen, setEmailSentModalOpen] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState("");
  const [requestEmailModalOpen, setRequestEmailModalOpen] = useState(false);
  const [requestEmailValue, setRequestEmailValue] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [requestEmailError, setRequestEmailError] = useState("");
  const [rememberUser, setRememberUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmResetModalOpen, setConfirmResetModalOpen] = useState(false);
  const [confirmResetEmail, setConfirmResetEmail] = useState("");

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: RouterLocation } | null)?.from;

  const validReturnTo = returnTo && isAllowedReturnToUrl(returnTo) ? returnTo : null;

  const REMEMBER_EMAIL_KEY = "ui-shell-login-remember-email";

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberUser(true);
    }
  }, []);

  const sendResetPasswordEmail = async (emailToSend: string) => {
    setSendingReset(true);
    setRequestEmailError("");
    const { error } = await authService.resetPasswordForEmail(emailToSend);
    setSendingReset(false);
    if (error) {
      setRequestEmailError((error as Error).message || "Erro ao enviar email.");
      return false;
    }
    setEmailSentTo(emailToSend);
    setRequestEmailModalOpen(false);
    setRequestEmailValue("");
    setRequestEmailError("");
    setEmailSentModalOpen(true);
    return true;
  };

  const handleAlterarSenhaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setError("");
    setWrongPassword(false);
    setConfirmResetEmail(email);
    setConfirmResetModalOpen(true);
  };

  const handleConfirmResetSubmit = async () => {
    setConfirmResetModalOpen(false);
    await sendResetPasswordEmail(confirmResetEmail);
  };

  const handleRedefinirSenhaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setRequestEmailValue(email);
    setRequestEmailModalOpen(true);
  };

  const handleRequestEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmailValue.trim()) return;
    await sendResetPasswordEmail(requestEmailValue.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUserNotFound(false);
    setWrongPassword(false);
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      if (rememberUser) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      if (validReturnTo) {
        window.location.href = validReturnTo;
        return;
      }
      navigate(getSafeInternalReturnPath(from));
    } else {
      const errorMsg = result.error || "Erro ao fazer login";
      if (
        errorMsg === "USUARIO_NAO_EXISTE" ||
        errorMsg === "USUARIO_NAO_CADASTRADO"
      ) {
        setUserNotFound(true);
        setError("Este usuário não existe");
      } else if (errorMsg === "SENHA_INCORRETA") {
        setWrongPassword(true);
        setError("Senha incorreta");
      } else {
        setError(errorMsg);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <AuthPageBackground />

      {/* Logos decorativas no background (reduzido para visual mais limpo) */}
      <motion.div
        className="absolute top-24 left-1/4 w-72 h-72 opacity-[0.06]"
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        <img
          src={LogoSvg}
          alt=""
          className="w-full h-full"
          style={{
            filter:
              "brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)",
          }}
        />
      </motion.div>
      <motion.div
        className="absolute bottom-40 right-1/4 w-64 h-64 opacity-[0.05]"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <img
          src={LogoSvg}
          alt=""
          className="w-full h-full"
          style={{
            filter:
              "brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)",
          }}
        />
      </motion.div>
      <motion.div
        className="absolute top-1/2 right-20 w-48 h-48 opacity-[0.04]"
        animate={{ y: [0, -15, 0], rotate: 360 }}
        transition={{
          y: { duration: 8, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
        }}
      >
        <img
          src={LogoSvg}
          alt=""
          className="w-full h-full"
          style={{
            filter:
              "brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)",
          }}
        />
      </motion.div>

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
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <img
                    src={BRAND_LOGO_SRC}
                    alt="GêChat"
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
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <CardTitle
                  className="text-4xl font-bold bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent"
                  style={{ backgroundSize: "200% auto" }}
                >
                  GêChat
                </CardTitle>
              </motion.div>
              <CardDescription className="text-base">
                Acompanhe e gerencie seus leads em um só lugar
              </CardDescription>
              <div className="pt-2"></div>
            </motion.div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on">
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <label className="text-sm font-medium" htmlFor="login-email">
                  Email Corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    name="email"
                    placeholder="voce@example.com"
                    className="pl-10 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
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
                <label className="text-sm font-medium" htmlFor="login-password">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded p-0.5"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.3 }}
                className="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  id="remember-user"
                  checked={rememberUser}
                  onChange={(e) => setRememberUser(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <label
                  htmlFor="remember-user"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Lembrar do usuário
                </label>
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-lg border ${
                    userNotFound
                      ? "bg-blue-500/10 border-blue-500/20"
                      : wrongPassword
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-destructive/10 border-destructive/20"
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
                            Não encontramos uma conta com este email. Deseja
                            criar uma nova conta?
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/signup"
                        className="block w-full"
                        onClick={() => {
                          setError("");
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
                  ) : wrongPassword ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Lock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            Senha incorreta
                          </p>
                          <p className="text-xs text-muted-foreground">
                            A senha fornecida está incorreta. Deseja alterar a
                            senha?
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50"
                        onClick={handleAlterarSenhaClick}
                      >
                        Alterar senha
                      </Button>
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
                      <img
                      src="/Gen-Moviment.gif"
                        alt=""
                        className="h-5 w-5 object-contain"
                      />
                      Entrando...
                    </span>
                  ) : (
                    "Entrar no GêChat"
                  )}
                </Button>
              </motion.div>

              <div className="space-y-1 pt-1">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.65, duration: 0.3 }}
                  className="text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    Não tem uma conta?{" "}
                    <Link
                      to="/signup"
                      className="text-primary font-medium hover:underline"
                    >
                      Criar conta
                    </Link>
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.3 }}
                  className="text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    Esqueceu a senha?{" "}
                    <button
                      type="button"
                      className="text-primary font-medium hover:underline"
                      onClick={handleRedefinirSenhaClick}
                    >
                      Redefinir senha
                    </button>
                  </p>
                </motion.div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Modal: confirmar antes de enviar (botão "Alterar senha" no box senha incorreta) */}
        <Dialog
          open={confirmResetModalOpen}
          onOpenChange={setConfirmResetModalOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Redefinir senha</DialogTitle>
              <DialogDescription>
                Ao clicar no botão abaixo um link de redefinição de senha será
                enviado para o seu email para você redefinir a senha. Tem
                certeza que deseja prosseguir?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmResetModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmResetSubmit}
                disabled={sendingReset}
              >
                {sendingReset ? "Enviando..." : "Redefinir senha"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: solicitar email para redefinir (link "Redefinir senha") */}
        <Dialog
          open={requestEmailModalOpen}
          onOpenChange={setRequestEmailModalOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Redefinir senha</DialogTitle>
              <DialogDescription>
                Ao clicar no botão abaixo um link de redefinição de senha será
                enviado para o seu email para você redefinir a senha. Tem
                certeza que deseja prosseguir?
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRequestEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="voce@example.com"
                  value={requestEmailValue}
                  onChange={(e) => setRequestEmailValue(e.target.value)}
                  required
                />
              </div>
              {requestEmailError && (
                <p className="text-sm text-destructive">{requestEmailError}</p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequestEmailModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={sendingReset}>
                  {sendingReset ? "Enviando..." : "Redefinir senha"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: email enviado */}
        <Dialog open={emailSentModalOpen} onOpenChange={setEmailSentModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Email enviado</DialogTitle>
              <DialogDescription>
                Foi enviado um email para <strong>{emailSentTo}</strong> para
                redefinir sua senha. Verifique sua caixa de entrada e siga o
                link para criar uma nova senha.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setEmailSentModalOpen(false)}>Ok</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
          className="mt-6 text-center"
        >
          <p className="text-xs text-muted-foreground">
            © Demo UI — sem dados reais.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
