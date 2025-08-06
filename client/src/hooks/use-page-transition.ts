import { useCallback } from "react";

export function usePageTransition() {
  const triggerTransition = useCallback(() => {
    const body = document.body;
    body.style.opacity = "0";
    
    setTimeout(() => {
      body.style.opacity = "1";
    }, 300);
  }, []);

  return { triggerTransition };
}
