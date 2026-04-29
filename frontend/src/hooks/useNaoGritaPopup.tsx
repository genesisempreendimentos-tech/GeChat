import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Hook para ativar popup "Não Grita" com CTRL + SHIFT + B
 */
export function useNaoGritaPopup() {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // CTRL + SHIFT + B
      if (event.ctrlKey && event.shiftKey && event.key === 'B') {
        event.preventDefault();
        console.log('🖼️ Popup "Não Grita" ativado!');
        setShowPopup(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { showPopup, setShowPopup };
}

/**
 * Componente do Popup "Não Grita"
 */
export function NaoGritaPopup({ show, onClose }: { show: boolean; onClose: () => void }) {
  useEffect(() => {
    if (show) {
      // Bloquear scroll do body quando popup está aberto
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative bg-background rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
              {/* Botão fechar */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-colors group"
              >
                <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </button>

              {/* Imagem */}
              <div className="relative">
                <img
                  src="/src/assets/não grita.jpeg"
                  alt="Não Grita"
                  className="w-full h-auto"
                />
                
                {/* Badge opcional */}
                <div className="absolute bottom-4 left-4 right-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-black/60 backdrop-blur-md rounded-lg px-4 py-2 text-center"
                  >
                    <p className="text-white text-sm font-medium">
                      🤫 Não Grita!
                    </p>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
