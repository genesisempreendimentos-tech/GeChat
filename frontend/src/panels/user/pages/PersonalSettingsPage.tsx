import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Settings,
  Shield,
  Sun,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { FullDarkEclipseIcon } from '@/components/icons/FullDarkEclipseIcon';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';
import { getChatWallpaperById } from '@/modules/gechat/lib/chat-wallpapers';
import { ChatWallpaperSettingsDialog } from '@/modules/gechat/components/ChatWallpaperSettingsDialog';
import { gechatApi } from '@/modules/gechat/services/gechat-api';
import { useGeChatStore } from '@/store/gechatStore';
import type { PrivacySettings } from '@/modules/gechat/types';
import { toast } from 'sonner';

interface PrivacyToggleProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

function PrivacyToggle({ checked, disabled, onChange, id }: PrivacyToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-muted',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

interface SettingRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

function SettingRow({ title, description, checked, disabled, onChange, id }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-medium leading-snug">
          {title}
        </label>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <PrivacyToggle id={id} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

const themes = [
  { value: 'light' as const, label: 'Claro', icon: Sun },
  { value: 'dark' as const, label: 'Escuro', icon: Moon },
  { value: 'full-dark' as const, label: 'Full Dark', icon: FullDarkEclipseIcon },
  { value: 'system' as const, label: 'Sistema', icon: Monitor },
];

const colors = [
  { value: 'teal' as const, label: 'Teal', color: '#14b8a6' },
  { value: 'blue' as const, label: 'Azul', color: '#3b82f6' },
  { value: 'purple' as const, label: 'Roxo', color: '#a855f7' },
  { value: 'green' as const, label: 'Verde', color: '#22c55e' },
  { value: 'orange' as const, label: 'Laranja', color: '#f97316' },
  { value: 'red' as const, label: 'Vermelho', color: '#ef4444' },
];

export default function PersonalSettingsPage() {
  const navigate = useNavigate();
  const {
    themeMode,
    accentColor,
    chatWallpaperId,
    chatWallpaperIntensity,
    setThemeMode,
    setAccentColor,
    resetSettings,
  } = useSettingsStore();

  const [wallpaperDialogOpen, setWallpaperDialogOpen] = useState(false);
  const currentWallpaper = getChatWallpaperById(chatWallpaperId);

  const privacy = useGeChatStore((s) => s.privacy);
  const setPrivacy = useGeChatStore((s) => s.setPrivacy);
  const setPresence = useGeChatStore((s) => s.setPresence);
  const conversations = useGeChatStore((s) => s.conversations);

  const [draft, setDraft] = useState<PrivacySettings>(privacy);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    gechatApi
      .getPrivacy()
      .then((settings) => {
        setPrivacy(settings);
        setDraft(settings);
      })
      .catch(() => {
        toast.error('Não foi possível carregar suas preferências de privacidade.');
      })
      .finally(() => setLoading(false));
  }, [setPrivacy]);

  const refreshPresence = useCallback(async () => {
    const presenceIds = conversations
      .filter((c) => c.type === 'direct' && c.otherMemberId)
      .map((c) => c.otherMemberId as string);
    if (!presenceIds.length) return;
    const presence = await gechatApi.getPresence(presenceIds);
    for (const [id, state] of Object.entries(presence)) {
      setPresence(id, state);
    }
  }, [conversations, setPresence]);

  const savePrivacy = useCallback(
    async (next: PrivacySettings) => {
      setSaving(true);
      try {
        const saved = await gechatApi.updatePrivacy(next);
        setPrivacy(saved);
        setDraft(saved);
        await refreshPresence();
      } catch {
        setDraft(privacy);
        toast.error('Não foi possível atualizar suas configurações.');
      } finally {
        setSaving(false);
      }
    },
    [privacy, refreshPresence, setPrivacy],
  );

  const updateDraft = (patch: Partial<PrivacySettings>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    void savePrivacy(next);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <MainViewFluidShell className="pb-8">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <MainViewHeader
              className="flex-1"
              icon={<Settings className="h-6 w-6" />}
              title="Configurações"
              description="Aparência, papel de parede e privacidade do GêChat"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Tema
                  </CardTitle>
                  <CardDescription>
                    Claro, escuro, full dark (quase tudo preto) ou automático
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {themes.map((theme) => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => setThemeMode(theme.value)}
                        className={cn(
                          'relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary/50',
                          themeMode === theme.value ? 'border-primary bg-primary/5' : 'border-border',
                        )}
                      >
                        <theme.icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{theme.label}</span>
                        {themeMode === theme.value && (
                          <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Cor de destaque
                  </CardTitle>
                  <CardDescription>Personalize a cor principal do sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setAccentColor(color.value)}
                        className={cn(
                          'relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:scale-105',
                          accentColor === color.value ? 'border-primary' : 'border-border',
                        )}
                        title={color.label}
                      >
                        <div
                          className="h-8 w-8 rounded-full"
                          style={{ backgroundColor: color.color }}
                        />
                        <span className="text-xs font-medium">{color.label}</span>
                        {accentColor === color.value && (
                          <Check className="absolute right-1 top-1 h-3 w-3 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Papel de parede do chat
                  </CardTitle>
                  <CardDescription>
                    Personalize o fundo da área de mensagens nas suas conversas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-sm font-medium">{currentWallpaper.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {chatWallpaperId === 'none'
                        ? 'Sem imagem de fundo'
                        : `Intensidade em ${chatWallpaperIntensity}%`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setWallpaperDialogOpen(true)}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Alterar papel de parede
                  </Button>
                </CardContent>
              </Card>

              <ChatWallpaperSettingsDialog
                open={wallpaperDialogOpen}
                onOpenChange={setWallpaperDialogOpen}
              />
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacidade
                  </CardTitle>
                  <CardDescription>
                    Controle o que os outros veem sobre sua atividade, no estilo WhatsApp.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <SettingRow
                    id="read-receipts"
                    title="Confirmação de leitura"
                    description="Se desativar, você não envia nem recebe o visto azul nas mensagens."
                    checked={draft.readReceiptsEnabled}
                    disabled={loading || saving}
                    onChange={(checked) => updateDraft({ readReceiptsEnabled: checked })}
                  />

                  <div className="border-t border-border pt-6">
                    <SettingRow
                      id="last-seen"
                      title="Última visualização"
                      description="Se ocultar, ninguém vê quando você esteve online e você também não vê a dos outros."
                      checked={draft.lastSeenVisible}
                      disabled={loading || saving}
                      onChange={(checked) => updateDraft({ lastSeenVisible: checked })}
                    />
                  </div>

                  {!draft.readReceiptsEnabled && (
                    <p className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Com a confirmação de leitura desativada, suas mensagens enviadas mostram no máximo
                      dois tiques cinza.
                    </p>
                  )}

                  {!draft.lastSeenVisible && (
                    <p className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Com a última visualização oculta, o status online e &quot;visto há…&quot; deixam de
                      aparecer para todos.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Restaurar configurações
                  </CardTitle>
                  <CardDescription>Voltar para as configurações padrão do sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  {!showResetConfirm ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restaurar padrões
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Tem certeza que deseja restaurar tema, cor e papel de parede para os valores padrão?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowResetConfirm(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            resetSettings();
                            setShowResetConfirm(false);
                          }}
                          className="flex-1"
                        >
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainViewFluidShell>
    </div>
  );
}
