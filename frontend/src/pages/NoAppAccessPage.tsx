import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuthPageBackground } from '@/components/auth/AuthPageBackground';
import { BRAND_LOGO_SRC } from '@/lib/brandAssets';
import { authService } from '@/services/supabase';

export default function NoAppAccessPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <AuthPageBackground />
      <Card className="relative z-10 w-full max-w-md rounded-2xl border-0 bg-background/95 shadow-2xl shadow-black/20 backdrop-blur-md">
        <CardContent className="px-8 pb-10 pt-10">
          <div className="mb-6 flex justify-center">
            <img src={BRAND_LOGO_SRC} alt="GêChat" className="h-16 w-16 object-contain" />
          </div>
          <p className="mb-2 text-center text-lg font-medium text-foreground">
            Você não tem permissão para acessar o GêChat.
          </p>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Solicite acesso ao administrador do GêApps para este aplicativo.
          </p>
          <div className="flex flex-col gap-2">
            <Button className="h-11 w-full" onClick={() => void handleLogout()}>
              Sair e usar outra conta
            </Button>
            <Button variant="ghost" className="h-11 w-full" onClick={() => navigate('/login', { replace: true })}>
              Voltar ao login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
