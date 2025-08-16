import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Lead } from '@/types/lead';

export function useTableColumns(): ColumnDef<Lead>[] {
  return useMemo(() => [
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
      id: 'duplicate',
      header: 'Statut',
      cell: ({ row }) => row.original.isDuplicate && <Badge variant="destructive">Doublon?</Badge>,
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
  ], []);
}