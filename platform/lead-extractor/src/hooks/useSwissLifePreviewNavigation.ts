import { useState, useEffect } from 'react';

export function useSwissLifePreviewNavigation(totalConverted: number, open: boolean) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Réinitialiser l'index quand le modal s'ouvre
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalConverted - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return {
    currentIndex,
    hasPrevious,
    hasNext,
    goToPrevious,
    goToNext,
  };
}