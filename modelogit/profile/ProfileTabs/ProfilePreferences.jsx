// src/components/views/ProfileView/ProfileTabs/ProfilePreferences.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext.jsx';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { useUserPreferences } from '@/contexts/UserPreferencesContext.jsx';
import { supabase } from '@/lib/customSupabaseClient.js';
import { SlidersHorizontal, Sun, Palette, Moon, LayoutTemplate, Diamond, Sparkle, Languages, Timer, Box, Boxes } from 'lucide-react';
import { ViewButtonTabs } from '@/components/ui/ViewButtonTabs';
import ReactCountryFlag from 'react-country-flag';

const BRAND_COLOR = '#1A9386';

export default function ProfilePreferences() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme(); // mesmo hook do Header
  const { updatePreferences } = useUserPreferences();

  const [layout, setLayout] = useState('modern'); // 'minimal' | 'modern'
  const [language, setLanguage] = useState('pt'); // 'pt' | 'en'
  const [chronometerType, setChronometerType] = useState('block'); // 'block' | 'task'
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Buscar preferências da tabela users primeiro
    const loadPreferencesFromDB = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('thema, layout, chronometer, language')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setLayout(data.layout || 'modern');
          setLanguage(data.language || 'pt');
          setChronometerType(data.chronometer || 'block');
          return;
        }
      } catch (err) {
        console.error('Erro ao carregar preferências do banco:', err);
      }

      // Fallback para user_metadata se não encontrar no banco
      const meta = user.user_metadata || {};
      setLayout(meta.pref_layout || 'modern');
      setLanguage(meta.pref_language || 'pt');
      setChronometerType(meta.pref_chronometer_type || 'block');
    };

    loadPreferencesFromDB();
  }, [user]);

  const isLight = useMemo(() => theme === 'light', [theme]);
  const isDark = useMemo(() => theme === 'dark', [theme]);

  const persistPreferences = async (patch = {}) => {
    if (!user) return;
    setSaving(true);
    try {
      // Preparar valores para salvar na tabela users
      const themeValue = patch.theme ?? theme;
      const layoutValue = patch.layout ?? layout;
      const languageValue = patch.language ?? language;
      const chronometerValue = patch.chronometerType ?? chronometerType;

      // Atualizar a tabela users diretamente (campos do banco)
      const { error: dbError } = await supabase
        .from('users')
        .update({
          thema: themeValue,
          layout: layoutValue,
          language: languageValue,
          chronometer: chronometerValue,
        })
        .eq('id', user.id);

      if (dbError) throw dbError;
      
      // Atualizar preferências no contexto
      updatePreferences({
        layout: layoutValue,
        theme: themeValue,
        chronometer: chronometerValue,
        language: languageValue,
      });
      
      // Aplicar o tema imediatamente se foi alterado
      if (patch.theme && patch.theme !== theme) {
        toggleTheme();
      }

      toast({ title: 'Preferências salvas', description: 'Suas escolhas foram aplicadas.' });
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      toast({
        title: 'Não foi possível salvar agora',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Seu ThemeContext expõe toggleTheme. Para setar explicitamente:
  const setThemeExplicit = async (next) => {
    if (next !== theme) toggleTheme(); // alterna light <-> dark
    await persistPreferences({ theme: next });
  };

  const handleLayout = async (nextLayout) => {
    if (nextLayout === layout) return;
    setLayout(nextLayout);
    await persistPreferences({ layout: nextLayout });
  };

  const handleLanguage = async (nextLang) => {
    if (nextLang === language) return;
    setLanguage(nextLang);
    await persistPreferences({ language: nextLang });
  };

  const handleChronometerType = async (nextType) => {
    if (nextType === chronometerType) return;
    setChronometerType(nextType);
    await persistPreferences({ chronometerType: nextType });
  };

  // Containers individuais com borda 1px e fundo ajustado por tema
  const sectionBoxClass =
    'border rounded-md p-4 bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600';

  // Tabs com o MESMO componente/estilo do header de ProfileView
  const themeTabs = [
    { mode: 'light', label: 'Claro', Icon: Sun },
    { mode: 'dark', label: 'Escuro', Icon: Moon },
  ];

  const layoutTabs = [
    { mode: 'minimal', label: 'Minimalista', Icon: Diamond },
    { mode: 'modern', label: 'Moderno', Icon: Sparkle },
  ];

  // Componente personalizado para bandeiras com tamanho consistente
  const CountryFlagIcon = ({ countryCode, className = "" }) => (
    <ReactCountryFlag
      countryCode={countryCode}
      svg
      style={{
        width: '1.2rem',
        height: '0.9rem',
        display: 'block'
      }}
      className={className}
    />
  );

  const languageTabs = [
    { 
      mode: 'pt', 
      label: 'Português', 
      Icon: (props) => (
        <div className={props.className}>
          <CountryFlagIcon countryCode="BR" />
        </div>
      )
    },
    { 
      mode: 'en', 
      label: 'Inglês', 
      Icon: (props) => (
        <div className={props.className}>
          <CountryFlagIcon countryCode="US" />
        </div>
      )
    },
  ];

  const chronometerTabs = [
    { mode: 'block', label: 'Bloco', Icon: Box },
    { mode: 'total', label: 'Total', Icon: Boxes },
  ];

  return (
    <Card className="bg-gray-300 dark:bg-slate-900/30 border border-slate-400 dark:border-slate-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal style={{ color: BRAND_COLOR }} />
          Preferências
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* TEMA */}
        <section className={sectionBoxClass}>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Palette className="w-4 h-4 opacity-80" />
            Tema
          </h4>
          <p className="text-sm opacity-80 mb-3">
            Alterar aqui é equivalente ao atalho do cabeçalho. A mudança é imediata e fica salva no seu perfil.
          </p>

          <div className="flex items-center justify-between">
            <ViewButtonTabs
              tabs={themeTabs}
              currentView={isLight ? 'light' : 'dark'}
              onViewChange={(val) => !saving && setThemeExplicit(val)}
            />
          </div>
        </section>

        {/* LAYOUT */}
        <section className={sectionBoxClass}>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 opacity-80" />
            Layout
          </h4>
          <p className="text-sm opacity-80 mb-3">
            Define o estilo dos cabeçalhos das telas principais.
          </p>

          <div className="flex items-center justify-between">
            <ViewButtonTabs
              tabs={layoutTabs}
              currentView={layout}
              onViewChange={(val) => !saving && handleLayout(val)}
            />
          </div>
        </section>

        {/* CRONÔMETRO */}
        <section className={sectionBoxClass}>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Timer className="w-4 h-4 opacity-80" />
            Cronômetro
          </h4>
          <p className="text-sm opacity-80 mb-3">
            Escolha entre visualizar o tempo do bloco ou o tempo total da tarefa em andamento.
          </p>

          <div className="flex items-center justify-between">
            <ViewButtonTabs
              tabs={chronometerTabs}
              currentView={chronometerType}
              onViewChange={(val) => !saving && handleChronometerType(val)}
            />
          </div>
        </section>

        {/* IDIOMA */}
        <section className={sectionBoxClass}>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Languages className="w-4 h-4 opacity-80" />
            Idioma (em breve...)
          </h4>
          <p className="text-sm opacity-80 mb-3">
            Seleciona o idioma da interface. Já salvamos sua preferência no perfil.
          </p>

          <div className="flex items-center justify-between">
            <ViewButtonTabs
              tabs={languageTabs}
              currentView={language}
              onViewChange={(val) => !saving && handleLanguage(val)}
            />
          </div>
        </section>
      </CardContent>
    </Card>
  );
}