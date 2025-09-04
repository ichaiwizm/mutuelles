import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';

interface AutomationFabProps {
  onClick: () => void;
}

export function AutomationFab({ onClick }: AutomationFabProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 rounded-full h-12 w-12 p-0 shadow-lg bg-indigo-600 hover:bg-indigo-700"
      title="Automatisation"
    >
      <Settings2 className="h-6 w-6 text-white" />
    </Button>
  );
}

