import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { motion } from 'framer-motion';
import { SidebarProvider, useSidebarWidth } from '@/contexts/SidebarContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useState, useEffect } from 'react';
import { databaseService, type Statement } from '@/services/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { emitCommunicadosUnreadChanged } from '@/lib/communicadosEvents';

const OFFICIAL_COMUNICADO_IMAGE_URL =
  'https://shmrdhpjlsrqiffcykzw.supabase.co/storage/v1/object/public/GeComunicado/ComunicadoOficial01.png';

function normalizeOfficialText(value: string): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isOfficialStatement(statement: Statement): boolean {
  if (statement.isOfficial === true) return true;
  const title = normalizeOfficialText(statement.title);
  if (title.includes('comunicado oficial')) return true;
  const hasOfficialTag = statement.tags.some((tag) =>
    normalizeOfficialText(tag).includes('comunicado oficial')
  );
  if (hasOfficialTag) return true;
  return statement.imageUrl?.trim() === OFFICIAL_COMUNICADO_IMAGE_URL;
}

function MainContent() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const sidebarWidth = useSidebarWidth();

  return (
    <motion.div
      className="min-h-screen min-w-0 overflow-x-hidden"
      initial={false}
      animate={{
        marginLeft: isDesktop ? sidebarWidth : 0,
        width: isDesktop ? `calc(100% - ${sidebarWidth}px)` : '100%',
      }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <Topbar />
        <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="px-1 md:px-2 pt-2 md:pt-2.5 pb-10 md:pb-3 w-full max-w-[1600px] mx-auto"
        role="main"
        aria-label="Conteúdo principal"
      >
        <Outlet />
      </motion.main>
    </motion.div>
  );
}

export default function MainLayout() {
  const { user } = useAuthStore();
  const [zoomLevelBack, setZoomLevelBack] = useState(100);
  const [autoOfficialOpen, setAutoOfficialOpen] = useState(false);
  const [autoOfficialStatement, setAutoOfficialStatement] = useState<Statement | null>(null);
  const [autoOfficialCheckedUserId, setAutoOfficialCheckedUserId] = useState<string | null>(null);

  // Polling para altura
  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem('pageZoom');
      setZoomLevelBack(Math.round(saved ? parseFloat(saved) : 100));
    };
    read();
    const id = setInterval(read, 100);
    return () => clearInterval(id);
  }, []);

  const containerHeight = `${(100 / zoomLevelBack) * 100}vh`;

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user?.id) {
        if (mounted) {
          setAutoOfficialCheckedUserId(null);
          setAutoOfficialStatement(null);
          setAutoOfficialOpen(false);
        }
        return;
      }

      // Evita reabrir automaticamente várias vezes durante a mesma sessão.
      if (autoOfficialCheckedUserId === user.id) return;

      const { data } = await databaseService.listStatements(false);
      if (!mounted) return;

      const unreadOfficial = (data ?? []).find(
        (statement) => isOfficialStatement(statement) && statement.viewed !== true
      );

      setAutoOfficialCheckedUserId(user.id);

      if (!unreadOfficial) return;

      setAutoOfficialStatement(unreadOfficial);
      setAutoOfficialOpen(true);
      emitCommunicadosUnreadChanged();

      // Após exibir automaticamente, marca como lido para não abrir novamente.
      void databaseService.markStatementViewed(unreadOfficial.id).then(() => {
        emitCommunicadosUnreadChanged();
      });
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [user?.id, autoOfficialCheckedUserId]);

  return (
    <SidebarProvider>
      <div 
        className="dashboard-root relative z-[1] overflow-x-hidden"
        style={{
          height: containerHeight,
          minHeight: containerHeight,
          width: '100%',
        }}
      >
        <Sidebar userRole={user?.accessType} />
        <MainContent />
      </div>
      <Dialog
        open={autoOfficialOpen}
        onOpenChange={(open) => {
          setAutoOfficialOpen(open);
          if (!open) setAutoOfficialStatement(null);
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{autoOfficialStatement?.title || 'Comunicado Oficial'}</DialogTitle>
            <DialogDescription>
              Este comunicado oficial foi aberto automaticamente por estar pendente de leitura.
            </DialogDescription>
          </DialogHeader>
          {autoOfficialStatement?.imageUrl ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-border/60 bg-muted/30">
              <img
                src={autoOfficialStatement.imageUrl}
                alt={autoOfficialStatement.title}
                className="max-h-[280px] w-full object-cover"
              />
            </div>
          ) : null}
          {autoOfficialStatement?.caption ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
              {autoOfficialStatement.caption}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setAutoOfficialOpen(false)}>Entendi</Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
