import { useMemo, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { Lead } from '@/types/lead';

interface UseTableColumnsProps {
  selectedLeadIds?: Set<string>;
  onToggleSelect?: (leadId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  isAllSelected?: boolean;
}

export function useTableColumns({
  selectedLeadIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  isAllSelected = false
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
      size: 48,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'contact',
      header: 'Contact',
      accessorFn: (row) => `${row.contact.civilite || ''} ${row.contact.prenom || ''} ${row.contact.nom || ''}`.trim(),
      cell: ({ row }) => (
        <div>
          <div className="font-medium flex items-center gap-2">
            {row.original.contact.civilite} {row.original.contact.prenom} {row.original.contact.nom}
            {row.original.signature?.numeroOrias && (
              <Badge variant="secondary" className="text-xs">PRO</Badge>
            )}
          </div>
          <div className="text-sm text-gray-500">{row.original.contact.email}</div>
          <div className="text-sm text-gray-500">{row.original.contact.telephone}</div>
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
      id: 'source',
      header: 'Source',
      accessorKey: 'source',
      cell: ({ row }) => <Badge variant="outline">{row.original.source}</Badge>,
    },
    {
      id: 'processing-status',
      header: 'Statut',
      cell: ({ row }) => {
        const status = row.original.processingStatus;
        if (!status) return <Badge variant="outline">Non traité</Badge>;
        
        const getStatusBadge = () => {
          switch (status.status) {
            case 'success':
              return <Badge variant="default" className="bg-green-500 hover:bg-green-600">✅ Traité</Badge>;
            case 'error':
              return <Badge variant="destructive" title={status.errorMessage}>❌ Erreur</Badge>;
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
            {status.timestamp && (
              <div className="text-xs text-gray-500">
                {new Date(status.timestamp).toLocaleString('fr-FR', {
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
  ], [selectedLeadIds, stableToggleSelect, stableSelectAll, stableDeselectAll, isAllSelected]);
}