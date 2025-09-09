import { Button } from '@/components/ui/button';
import { X, Send, Download, Filter, Edit3, Trash, MoreHorizontal } from 'lucide-react';
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
  onUpdateStatus?: (status: 'pending' | 'processing' | 'success' | 'error') => void;
  onDeleteSelected?: () => void;
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
  onUpdateStatus,
  onDeleteSelected,
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
        <input
          type="checkbox"
          aria-label={isAllSelected ? 'Désélectionner tout' : 'Sélectionner tout'}
          checked={isAllSelected}
          onChange={(e) => {
            if (e.target.checked) onSelectAll(); else onDeselectAll();
          }}
          className="h-4 w-4 accent-indigo-600"
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

        {/* Modifier le statut des leads sélectionnés */}
        {onUpdateStatus && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="text-indigo-700 border-indigo-200 hover:bg-indigo-50">
                <Edit3 className="h-4 w-4 mr-1" />
                Modifier le statut
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Définir le statut</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpdateStatus('pending')}>
                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                En attente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus('processing')}>
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                En cours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus('success')}>
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                Réussi
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus('error')}>
                <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                Erreur
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Menu "plus" discret */}
      {onDeleteSelected && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="p-1">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeleteSelected} className="text-red-600 focus:text-red-700">
              <Trash className="h-4 w-4 mr-2" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

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
