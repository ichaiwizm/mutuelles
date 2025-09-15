import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface NextSectionButtonProps {
  onClick?: () => void;
  show?: boolean;
}

export function NextSectionButton({ onClick, show = true }: NextSectionButtonProps) {
  if (!show) return null;
  return (
    <div className="flex justify-end mt-4">
      <Button variant="ghost" size="sm" onClick={onClick} className="text-slate-600">
        Section suivante <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

