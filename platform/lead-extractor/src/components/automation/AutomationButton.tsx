import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimpleAutomationModal } from './SimpleAutomationModal';
import type { Lead } from '@/types/lead';

interface AutomationButtonProps {
  leads: Lead[];
  disabled?: boolean;
}

export function AutomationButton({ leads, disabled }: AutomationButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setModalOpen(true)}
        disabled={disabled || leads.length === 0}
        className="flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700"
      >
        <Settings2 className="h-4 w-4" />
        Automation
      </Button>

      <SimpleAutomationModal
        leads={leads}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}