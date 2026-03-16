import { useState, useEffect } from 'react';

/**
 * Lê o zoom atual aplicado no #root.
 * Retorna um número decimal (ex: 0.8 para 80%).
 */
export const useRootZoom = () => {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) {
      setZoom(1);
      return;
    }

    const update = () => {
      const inline = root.style.zoom;
      if (inline) {
        const v = parseFloat(inline);
        if (!isNaN(v) && v > 0) {
          setZoom(v);
          return;
        }
      }

      const computed = getComputedStyle(root).zoom;
      if (computed && computed !== 'normal') {
        const v = parseFloat(computed);
        if (!isNaN(v) && v > 0) {
          setZoom(v);
          return;
        }
      }

      const cssVar = getComputedStyle(root).getPropertyValue('--app-zoom');
      if (cssVar) {
        const v = parseFloat(cssVar);
        if (!isNaN(v) && v > 0) {
          setZoom(v);
          return;
        }
      }

      setZoom(1);
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['style'] });

    const interval = setInterval(update, 100);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return zoom;
};
