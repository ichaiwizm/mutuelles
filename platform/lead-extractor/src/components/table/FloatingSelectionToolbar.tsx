import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Send, Download, MoreHorizontal, Filter } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
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
  onSelectByStatus?: (status: 'pending' | 'processing' | 'success' | 'error') => void;
  statusCounts?: {
    pending: number;
    processing: number;
    success: number;
    error: number;
    undefined: number;
  };
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
  onSelectByStatus,
  statusCounts,
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

        {/* Sélection par statut */}
        {onSelectByStatus && statusCounts && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Filter className="h-4 w-4 mr-1" />
                Sélectionner par statut
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sélectionner les leads</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statusCounts.pending > 0 && (
                <DropdownMenuItem onClick={() => onSelectByStatus('pending')}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    En attente ({statusCounts.pending})
                  </div>
                </DropdownMenuItem>
              )}
              {statusCounts.processing > 0 && (
                <DropdownMenuItem onClick={() => onSelectByStatus('processing')}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    En cours ({statusCounts.processing})
                  </div>
                </DropdownMenuItem>
              )}
              {statusCounts.success > 0 && (
                <DropdownMenuItem onClick={() => onSelectByStatus('success')}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Réussi ({statusCounts.success})
                  </div>
                </DropdownMenuItem>
              )}
              {statusCounts.error > 0 && (
                <DropdownMenuItem onClick={() => onSelectByStatus('error')}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Erreur ({statusCounts.error})
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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