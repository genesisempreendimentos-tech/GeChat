import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND_LOGO_SRC } from "@/lib/brandAssets";
const LogoSvg = '/assets/logo-gen-sem-fundo-svg.svg';

const logoFilter =
  "brightness(0) saturate(100%) invert(72%) sepia(47%) saturate(558%) hue-rotate(126deg) brightness(94%) contrast(89%)";

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background igual ao /login */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30" />
      <motion.div
        className="absolute top-24 left-1/4 w-72 h-72 opacity-[0.06]"
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: logoFilter }} />
      </motion.div>
      <motion.div
        className="absolute bottom-40 right-1/4 w-64 h-64 opacity-[0.05]"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: logoFilter }} />
      </motion.div>
      <motion.div
        className="absolute top-1/2 right-20 w-48 h-48 opacity-[0.04]"
        animate={{ y: [0, -15, 0], rotate: 360 }}
        transition={{
          y: { duration: 8, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
        }}
      >
        <img src={LogoSvg} alt="" className="w-full h-full" style={{ filter: logoFilter }} />
      </motion.div>
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-0 shadow-2xl shadow-black/20 backdrop-blur-md bg-background/95 rounded-2xl overflow-hidden">
          <CardContent className="pt-10 pb-10 px-8">
            <div className="flex justify-center mb-6">
              <img
                src={BRAND_LOGO_SRC}
                alt="GêNovo"
                className="w-16 h-16 object-contain"
              />
            </div>
            <p className="text-center text-lg font-medium text-foreground mb-2">
              Acesso restrito a administradores do software.
            </p>
            <p className="text-center text-sm text-muted-foreground mb-8">
              Clique no botão abaixo para voltar para o sistema.
            </p>
            <Button
              className="w-full h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              onClick={() => navigate("/")}
            >
              Voltar para o sistema
            </Button>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
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
