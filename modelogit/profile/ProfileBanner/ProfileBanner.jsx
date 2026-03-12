// src/components/views/profile/ProfileBanner/ProfileBanner.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ImageIcon,
  Home,
  Building,
  Leaf,
  Clapperboard,
  Palette,
  Satellite,
  Shapes,
  Puzzle,
  MapPinned,
  Circle,
} from "lucide-react";
import { soccerPitch } from "@lucide/lab"; // 👈 iconNode do lab
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ViewButtonTabs } from "@/components/ui/ViewButtonTabs";
import {
  BANNER_CATEGORIES,
  BANNER_ORDER,
} from "@/components/views/profile/ProfileBanner/ProfileBannerImages";
import ProfileRandomImages from "@/components/views/profile/ProfileBanner/ProfileRandomImages";
import { supabase } from "@/lib/customSupabaseClient";
// ✅ Estado global e pré-carregamento
import { useProfileStore } from "@/imagesperformance/ProfileStore";
import { preloadImage } from "@/imagesperformance/PreloadImage";

// ============================================================
// Ícones das tabs (sem emojis)
// ============================================================

// 👇 Transformamos o iconNode `soccerPitch` em um componente React
// O iconNode é um array de arrays: [[tagName, attributes], ...]
const SoccerPitch = ({ className, size = 24, color = "currentColor", strokeWidth = 2, ...props }) => {
  if (!soccerPitch || !Array.isArray(soccerPitch)) {
    // Fallback se soccerPitch não estiver disponível
    return <Circle className={className} size={size} color={color} {...props} />;
  }
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {soccerPitch.map((element, idx) => {
        if (Array.isArray(element) && element.length >= 2) {
          const [tagName, attributes] = element;
          // Remove a propriedade 'key' se existir (é apenas para React)
          const { key, ...attrs } = attributes || {};
          return React.createElement(tagName, { key: idx, ...attrs });
        }
        return null;
      })}
    </svg>
  );
};

const TAB_META = {
  genesis: { label: "Gênesis", Icon: Home },
  nature: { label: "Natureza", Icon: Leaf },
  urban: { label: "Urbano", Icon: Building },
  cinema: { label: "Cinema", Icon: Clapperboard },
  soccer: { label: "Futebol", Icon: SoccerPitch }, // 👈 aqui usamos o componente
  cities: { label: "Cidades", Icon: MapPinned },
  art: { label: "Arte", Icon: Palette },
  universe: { label: "Universo", Icon: Satellite },
  abstract: { label: "Abstrato", Icon: Shapes },
  hobbies: { label: "Hobbies", Icon: Puzzle },
};

// ============================================================
// Componente principal
// ============================================================
const ProfileBanner = ({ userId: userIdProp, editable = true, userData = null }) => {
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(BANNER_ORDER[0]);
  const [userId, setUserId] = useState(userIdProp || null);
  const [loadingBanner, setLoadingBanner] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  
  // Estado local para banner de outro usuário (quando userData é fornecido)
  const [externalBannerUrl, setExternalBannerUrl] = useState(null);

  // ✅ Global banner state (com persistência local) - apenas para próprio usuário
  const globalBannerUrl = useProfileStore((s) => s.bannerUrl);
  const setBannerUrl = useProfileStore((s) => s.setBannerUrl);
  
  // Determinar qual banner usar: se userData existe, usar externalBannerUrl, senão usar globalBannerUrl
  const bannerUrl = userData ? externalBannerUrl : globalBannerUrl;

  // Buscar userId se não for passado
  useEffect(() => {
    // Se userData for fornecido (outro usuário), usar o id dele
    if (userData?.id) {
      setUserId(userData.id);
      return;
    }
    
    // Se userIdProp for fornecido, usar ele
    if (userIdProp) {
      setUserId(userIdProp);
      return;
    }
    
    // Caso contrário, buscar o usuário logado
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Erro ao obter usuário:", error);
        return;
      }
      if (data?.user?.id) setUserId(data.user.id);
    };
    fetchUser();
  }, [userIdProp, userData]);

  // Resetar banner externo quando userData mudar
  useEffect(() => {
    if (userData) {
      setExternalBannerUrl(null); // Resetar para forçar busca
    }
  }, [userData?.id]); // Resetar quando o ID do usuário mudar

  // Buscar banner atual do Supabase
  useEffect(() => {
    const fetchBanner = async () => {
      if (!userId) return;
      
      // Se for outro usuário (userData fornecido), buscar e armazenar em estado local
      if (userData) {
        setLoadingBanner(true);
        const { data, error } = await supabase
          .from("users")
          .select("banners")
          .eq("id", userId)
          .single();
        setLoadingBanner(false);
        if (error) {
          console.error("Erro ao buscar banner:", error);
          setExternalBannerUrl(null);
          return;
        }
        if (data?.banners) {
          setExternalBannerUrl(data.banners);
          preloadImage(data.banners);
        } else {
          setExternalBannerUrl(null);
        }
        return;
      }
      
      // Se for próprio usuário, sempre buscar do banco para garantir sincronia
      setLoadingBanner(true);
      const { data, error } = await supabase
        .from("users")
        .select("banners")
        .eq("id", userId)
        .single();
      setLoadingBanner(false);
      if (error) {
        console.error("Erro ao buscar banner:", error);
        return;
      }
      // Atualizar o store com o valor do banco (pode ser null ou diferente do store)
      const bannerFromDb = data?.banners || null;
      if (bannerFromDb) {
        setBannerUrl(bannerFromDb);
        preloadImage(bannerFromDb);
      } else {
        // Se não houver banner no banco, limpar o store também
        setBannerUrl(null);
      }
    };
    fetchBanner();
  }, [userId, userData, globalBannerUrl, setBannerUrl]);

  // Atualiza o Supabase e o store
  const persistBanner = async (url, shouldClose = true) => {
    if (!userId) {
      console.warn("Sem userId para salvar banner.");
      return;
    }
    setSavingBanner(true);
    const previous = bannerUrl;

    // Atualiza local e pré-carrega
    setBannerUrl(url);
    preloadImage(url);

    const { error } = await supabase
      .from("users")
      .update({
        banners: url,
      })
      .eq("id", userId);

    setSavingBanner(false);

    if (error) {
      console.error("Erro ao salvar banner:", error);
      // rollback local
      setBannerUrl(previous);
    } else {
      // Verificar se o banco realmente foi atualizado para garantir sincronia
      const { data: verifyData } = await supabase
        .from("users")
        .select("banners")
        .eq("id", userId)
        .single();
      if (verifyData?.banners && verifyData.banners !== url) {
        // Se o banco tem valor diferente, atualizar com o valor do banco
        setBannerUrl(verifyData.banners);
      }
      // fecha o picker só quando salva com sucesso e shouldClose for true
      if (shouldClose) {
        setBannerPickerOpen(false);
      }
    }
  };

  const selectBanner = (url) => {
    // Apenas dispara persistência; fechamento vai ocorrer no sucesso
    persistBanner(url);
  };

  const currentImages = useMemo(() => {
    const imgs = BANNER_CATEGORIES[activeCategory]?.images ?? [];
    return imgs.slice(0, 9);
  }, [activeCategory]);

  const tabs = useMemo(
    () =>
      BANNER_ORDER.map((key) => {
        const meta = TAB_META[key] ?? { label: key, Icon: ImageIcon };
        return { mode: key, label: meta.label, Icon: meta.Icon };
      }),
    []
  );

  return (
    <>
      {/* === Banner principal === */}
      <div className="w-full rounded-xl overflow-hidden relative">
        <div
          className={
            bannerUrl
              ? "w-full h-40 sm:h-48 md:h-56 lg:h-64 bg-cover bg-center"
              : "w-full h-40 sm:h-48 md:h-56 lg:h-64 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500"
          }
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
        />
        {editable && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <ProfileRandomImages persistBanner={persistBanner} savingBanner={savingBanner} />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    disabled={loadingBanner || savingBanner}
                    className="rounded-lg h-10 w-10 bg-white/90 hover:bg-white text-slate-800 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-white transition-colors disabled:opacity-60"
                    onClick={() => setBannerPickerOpen(true)}
                  >
                    <ImageIcon className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {loadingBanner
                    ? "Carregando..."
                    : savingBanner
                    ? "Salvando..."
                    : "Alterar imagem do banner"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* === Popup de seleção === */}
      <Dialog open={bannerPickerOpen} onOpenChange={setBannerPickerOpen}>
        <DialogContent className="sm:max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col px-2">
          <DialogHeader>
            <DialogTitle>Escolha uma imagem de capa</DialogTitle>
            {/* A11y: adiciona descrição para remover o warning */}
            <DialogDescription className="sr-only">
              Selecione uma imagem para o banner do seu perfil e confirme clicando nela.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs centralizadas */}
          <div className="flex-1 flex flex-col">
            <div className="flex justify-center mb-3">
              <ViewButtonTabs
                tabs={tabs}
                currentView={activeCategory}
                onViewChange={setActiveCategory}
              />
            </div>

            {/* Grid 3x3 */}
            <div className="grid grid-cols-3 gap-3 py-4 overflow-y-auto overflow-x-hidden flex-1">
              {currentImages.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => selectBanner(url)}
                  disabled={savingBanner}
                  className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1A9386]/40 transition-all duration-200 hover:scale-105 disabled:opacity-60"
                  title={`Imagem ${idx + 1}`}
                >
                  <div className="relative w-full pb-[20%]">
                    <img
                      src={url}
                      alt={`Banner ${idx + 1} - ${
                        TAB_META[activeCategory]?.label ?? activeCategory
                      }`}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileBanner;
