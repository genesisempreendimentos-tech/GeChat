import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/store/settingsStore';
import {
  Settings as SettingsIcon,
  Palette,
  Type,
  Monitor,
  Moon,
  Sun,
  Sparkles,
  RotateCcw,
  Check,
} from 'lucide-react';
import { FullDarkEclipseIcon } from '@/components/icons/FullDarkEclipseIcon';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';

export default function SettingsPage() {
  const {
    themeMode,
    fontSize,
    accentColor,
    compactMode,
    animations,
    setThemeMode,
    setFontSize,
    setAccentColor,
    setCompactMode,
    setAnimations,
    resetSettings,
  } = useSettingsStore();

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const themes = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Escuro', icon: Moon },
    { value: 'full-dark' as const, label: 'Full Dark', icon: FullDarkEclipseIcon },
    { value: 'system' as const, label: 'Sistema', icon: Monitor },
  ];

  const fontSizes = [
    { value: 'small' as const, label: 'Pequena', size: '14px' },
    { value: 'medium' as const, label: 'Média', size: '16px' },
    { value: 'large' as const, label: 'Grande', size: '18px' },
  ];

  const colors = [
    { value: 'teal' as const, label: 'Teal', color: '#14b8a6' },
    { value: 'blue' as const, label: 'Azul', color: '#3b82f6' },
    { value: 'purple' as const, label: 'Roxo', color: '#a855f7' },
    { value: 'green' as const, label: 'Verde', color: '#22c55e' },
    { value: 'orange' as const, label: 'Laranja', color: '#f97316' },
    { value: 'red' as const, label: 'Vermelho', color: '#ef4444' },
  ];

  return (
    <MainViewFluidShell>
      <div className="space-y-6">
        <MainViewHeader
          icon={<SettingsIcon className="h-6 w-6" />}
          title="Configurações"
          description="Personalize a experiência no mock"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coluna esquerda: Tema, Cor de Destaque */}
        <div className="space-y-6">
      {/* Tema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Tema
          </CardTitle>
          <CardDescription>
            Claro, escuro, full dark (quase tudo preto) ou automático
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {themes.map((theme) => (
              <button
                key={theme.value}
                onClick={() => setThemeMode(theme.value)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                  themeMode === theme.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <theme.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{theme.label}</span>
                {themeMode === theme.value && (
                  <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cor de Destaque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Cor de Destaque
          </CardTitle>
          <CardDescription>
            Personalize a cor principal do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-3">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => setAccentColor(color.value)}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                  accentColor === color.value
                    ? 'border-primary'
                    : 'border-border'
                }`}
                title={color.label}
              >
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: color.color }}
                />
                <span className="text-xs font-medium">{color.label}</span>
                {accentColor === color.value && (
                  <Check className="absolute top-1 right-1 w-3 h-3 text-primary" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
        </div>

        {/* Coluna direita: Tamanho da Fonte, Preferências, Restaurar */}
        <div className="space-y-6">
      {/* Tamanho da Fonte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Tamanho da Fonte
          </CardTitle>
          <CardDescription>
            Ajuste o tamanho do texto para melhor legibilidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {fontSizes.map((size) => (
              <button
                key={size.value}
                onClick={() => setFontSize(size.value)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                  fontSize === size.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <span style={{ fontSize: size.size }} className="font-semibold">
                  Aa
                </span>
                <span className="text-sm font-medium">{size.label}</span>
                {fontSize === size.value && (
                  <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Outras Opções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Preferências Adicionais
          </CardTitle>
          <CardDescription>
            Ajustes finos para sua experiência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Modo Compacto */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <h4 className="font-medium">Modo Compacto</h4>
              <p className="text-sm text-muted-foreground">
                Reduz os espaçamentos para exibir mais conteúdo
              </p>
            </div>
            <button
              onClick={() => setCompactMode(!compactMode)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                compactMode ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform border border-gray-200/50 dark:border-gray-600/50 ${
                  compactMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Animações */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <h4 className="font-medium">Animações</h4>
              <p className="text-sm text-muted-foreground">
                Ativa transições e efeitos visuais
              </p>
            </div>
            <button
              onClick={() => setAnimations(!animations)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                animations ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform border border-gray-200/50 dark:border-gray-600/50 ${
                  animations ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Restaurar Padrões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Restaurar Configurações
          </CardTitle>
          <CardDescription>
            Voltar para as configurações padrão do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showResetConfirm ? (
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(true)}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar Padrões
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja restaurar todas as configurações para os valores padrão?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
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
  );
}

