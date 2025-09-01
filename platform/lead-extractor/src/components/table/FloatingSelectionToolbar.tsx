import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Send, Download, MoreHorizontal } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface FloatingSelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSendToExtension: () => void;
  onExport?: () => void;
  onClearSelection: () => void;
  isAllSelected: boolean;
  className?: string;
}

export function FloatingSelectionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onSendToExtension,
  onExport,
  onClearSelection,
  isAllSelected,
  className = ''
}: FloatingSelectionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={`
      fixed top-20 left-1/2 -translate-x-1/2 z-50 
      bg-white border border-gray-200 rounded-lg shadow-lg 
      px-4 py-3 flex items-center gap-4
      animate-in slide-in-from-top-2 duration-300
      ${className}
    `}>
      {/* Sélection toggle */}
      <div className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={isAllSelected ? onDeselectAll : onSelectAll}
          aria-label={isAllSelected ? "Désélectionner tout" : "Sélectionner tout"}
        />
        <span className="text-gray-700 font-medium">
          {selectedCount} sur {totalCount} sélectionné{selectedCount > 1 ? 's' : ''}
        </span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-200" />

      {/* Actions principales */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onSendToExtension}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Send className="h-4 w-4 mr-1" />
          Envoyer à l'extension
        </Button>

        {onExport && (
          <Button
            onClick={onExport}
            size="sm"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-1" />
            Exporter
          </Button>
        )}

        {/* Menu actions supplémentaires */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExport} disabled={!onExport}>
              <Download className="h-4 w-4 mr-2" />
              Exporter la sélection
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClearSelection}>
              <X className="h-4 w-4 mr-2" />
              Vider la sélection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bouton fermer */}
      <Button
        onClick={onClearSelection}
        size="sm"
        variant="ghost"
        className="ml-2 p-1 h-auto text-gray-500 hover:text-gray-700"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}