// src/components/views/profile/ProfileBanner/ProfileRandomImages.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BANNER_CATEGORIES } from '@/components/views/profile/ProfileBanner/ProfileBannerImages';

/**
 * Componente responsável pelo botão de randomização do banner
 * Permite que o usuário escolha uma imagem aleatória do banner (exceto Futebol)
 * 
 * @param {function} persistBanner - Função callback chamada para salvar o banner no Supabase
 * @param {boolean} savingBanner - Flag que indica se está salvando o banner
 */
export default function ProfileRandomImages({ persistBanner, savingBanner }) {
  const [rotation, setRotation] = useState(0);

  const handleRandomize = () => {
    // Coletar todas as imagens das categorias, excluindo "Futebol" (soccer)
    const allImages = [];
    Object.entries(BANNER_CATEGORIES).forEach(([key, category]) => {
      if (key !== 'soccer') {
        allImages.push(...category.images);
      }
    });

    // Selecionar uma imagem aleatória
    if (allImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * allImages.length);
      const randomImageUrl = allImages[randomIndex];
      
      // Atualizar o banner no Supabase (false = não fecha o popup)
      persistBanner(randomImageUrl, false);
      
      // Incrementar rotação do ícone em 180°
      setRotation(prev => prev + 180);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRandomize}
            disabled={savingBanner}
            className={cn(
              // Estilos base do botão
              'h-9 w-9 rounded-full',
              'transition-all duration-200',
              
              // Borda mais grossa
              'border-2',
              
              // borda-claro: borda slate-300 no modo claro
              'border-slate-100',
              
              // borda-escuro: borda slate-900 no modo escuro
              'dark:border-slate-800',
              
              // bg-claro: fundo padrão para modo claro
              'bg-slate-100/90',
              
              // bg-escuro: fundo padrão para modo escuro  
              'dark:bg-slate-800',
              
              // bg-hover-claro: fundo ao passar o mouse no modo claro
              'hover:bg-slate-300',
              
              // bg-hover-escuro: fundo ao passar o mouse no modo escuro
              'dark:hover:bg-slate-700',
              
              // Desabilitado
              'disabled:opacity-60'
            )}
            aria-label="Randomizar imagem do banner"
          >
            <Shuffle 
              className={cn(
                // Tamanho base do ícone
                'w-5 h-5',
                
                // Transição suave para rotação
                'transition-transform duration-200',
                
                // icone-claro: cor do ícone no modo claro
                'text-slate-700',
                
                // icone-escuro: cor do ícone no modo escuro
                'dark:text-slate-200'
              )}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Randomizar imagem do banner</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}