import { useEffect, useState, type RefObject } from "react";

export const useResizeObserver = (ref: RefObject<HTMLElement | null>) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      requestAnimationFrame(() => {
        setDimensions({ width, height });
      });
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return dimensions;
};
