import { useMemo, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RotateCcw } from 'lucide-react';
import type { Lead } from '@/types/lead';

interface UseTableColumnsProps {
  selectedLeadIds?: Set<string>;
  onToggleSelect?: (leadId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  isAllSelected?: boolean;
  onRetrySingleLead?: (lead: Lead) => void;
}

export function useTableColumns({
  selectedLeadIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  isAllSelected = false,
  onRetrySingleLead
}: UseTableColumnsProps = {}): ColumnDef<Lead>[] {
  
  // Stabiliser les callbacks
  const stableToggleSelect = useCallback((leadId: string) => {
    onToggleSelect?.(leadId);
  }, [onToggleSelect]);
  
  const stableSelectAll = useCallback(() => {
    onSelectAll?.();
  }, [onSelectAll]);
  
  const stableDeselectAll = useCallback(() => {
    onDeselectAll?.();
  }, [onDeselectAll]);

  const stableRetrySingleLead = useCallback((lead: Lead) => {
    onRetrySingleLead?.(lead);
  }, [onRetrySingleLead]);
  return useMemo(() => [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={(checked) => {
            if (checked) {
              stableSelectAll();
            } else {
              stableDeselectAll();
            }
          }}
          aria-label="Sélectionner toutes les lignes"
          className="mx-auto"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedLeadIds.has(row.original.id)}
          onCheckedChange={() => stableToggleSelect(row.original.id)}
          aria-label="Sélectionner cette ligne"
          className="mx-auto"
        />
      ),
      size: 40,
      maxSize: 40,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'contact',
      header: 'Contact',
      accessorFn: (row) => `${row.contact.civilite || ''} ${row.contact.prenom || ''} ${row.contact.nom || ''}`.trim(),
      size: 280,
      cell: ({ row }) => (
        <div className="max-w-xs">
          <div className="font-medium flex items-center gap-1 text-sm">
            {row.original.contact.civilite} {row.original.contact.prenom} {row.original.contact.nom}
            {row.original.signature?.numeroOrias && (
              <Badge variant="secondary" className="text-xs px-1">PRO</Badge>
            )}
          </div>
          <div className="text-xs text-gray-500 truncate">{row.original.contact.email}</div>
          <div className="text-xs text-gray-500">{row.original.contact.telephone}</div>
        </div>
      ),
    },
    {
      id: 'location',
      header: 'Localisation',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.contact.ville && <div>{row.original.contact.ville}</div>}
          {row.original.contact.codePostal && <div>{row.original.contact.codePostal}</div>}
        </div>
      ),
    },
    {
      id: 'processing-status',
      header: 'Statut',
      enableSorting: true,
      cell: ({ row }) => {
        const s = row.original.processingStatus;
        if (!s) return <Badge variant="outline">⏸️ En attente</Badge>;
        
        const getStatusBadge = () => {
          switch (s.status) {
            case 'success':
              return <Badge variant="default" className="bg-green-500 hover:bg-green-600">✅ Succès</Badge>;
            case 'error':
              return (
                <div className="flex items-center gap-1">
                  <Badge variant="destructive" title={s.errorMessage}>❌ Erreur</Badge>
                  {onRetrySingleLead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation(); // Éviter d'ouvrir le modal du lead
                        stableRetrySingleLead(row.original);
                      }}
                      title="Réessayer ce lead"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            case 'processing':
              return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white">⏳ En cours</Badge>;
            case 'pending':
            default:
              return <Badge variant="outline">⏸️ En attente</Badge>;
          }
        };
        
        return (
          <div className="flex flex-col gap-1">
            {getStatusBadge()}
            {(s.status === 'processing' && s.currentStep && s.totalSteps) && (
              <div className="text-xs text-gray-600">Étape {s.currentStep}/{s.totalSteps}</div>
            )}
            {s.timestamp && (
              <div className="text-xs text-gray-500">
                {new Date(s.timestamp).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
          </div>
        );
      },
      // Tri par priorité de statut: error > processing > pending > success
      sortingFn: (rowA, rowB) => {
        const order = { error: 0, processing: 1, pending: 2, success: 3 } as Record<string, number>;
        const a = order[rowA.original.processingStatus?.status || 'pending'];
        const b = order[rowB.original.processingStatus?.status || 'pending'];
        return a - b;
      },
    },
    {
      id: 'score',
      header: 'Score',
      accessorKey: 'score',
      enableSorting: true,
      cell: ({ row }) => (
        <Badge variant={
          row.original.score >= 4 ? 'default' :
          row.original.score >= 3 ? 'secondary' :
          row.original.score >= 2 ? 'outline' : 'destructive'
        }>
          {row.original.score}/5
        </Badge>
      ),
    },
    {
      id: 'extractedAt',
      header: 'Date',
      accessorKey: 'extractedAt',
      cell: ({ row }) => (
        <div className="text-sm">
          {new Date(row.original.extractedAt).toLocaleDateString()}
        </div>
      ),
    },
  ], [selectedLeadIds, stableToggleSelect, stableSelectAll, stableDeselectAll, isAllSelected, stableRetrySingleLead]);
}