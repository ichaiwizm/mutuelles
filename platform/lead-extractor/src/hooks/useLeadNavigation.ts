import type { Lead } from '@/types/lead';

export function useLeadNavigation(
  leads: Lead[], 
  currentIndex: number, 
  onLeadChange?: (lead: Lead, newIndex: number) => void
) {
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < leads.length - 1;

  const goToPrevious = () => {
    if (hasPrevious && onLeadChange) {
      const previousLead = leads[currentIndex - 1];
      onLeadChange(previousLead, currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (hasNext && onLeadChange) {
      const nextLead = leads[currentIndex + 1];
      onLeadChange(nextLead, currentIndex + 1);
    }
  };

  return {
    hasPrevious,
    hasNext,
    goToPrevious,
    goToNext
  };
}