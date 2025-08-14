import { useState, useMemo } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { rankItem } from '@tanstack/match-sorter-utils';
import type { Lead } from '@/types/lead';

interface LeadsTableProps {
  data: Lead[];
  globalFilter: string;
  onRowClick: (lead: Lead, allSortedData: Lead[], leadIndex: number) => void;
  activeTab: 'leads' | 'nonleads' | 'all';
}

export function LeadsTable({ data, globalFilter, onRowClick, activeTab }: LeadsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'score', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns: ColumnDef<Lead>[] = useMemo(() => [
    {
      id: 'contact',
      header: 'Contact',
      accessorFn: (row) => `${row.contact.civilite || ''} ${row.contact.prenom || ''} ${row.contact.nom || ''}`.trim(),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.contact.civilite} {row.original.contact.prenom} {row.original.contact.nom}
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

  const globalFilterFn = (row: any, _columnId: string, filterValue: string) => {
    const haystack = [
      row.original.contact?.prenom,
      row.original.contact?.nom,
      row.original.contact?.email,
      row.original.contact?.telephone,
      row.original.contact?.ville,
      row.original.contact?.codePostal,
    ].filter(Boolean).join(' ');
    return rankItem(haystack, filterValue).passed;
  };

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn,
  });

  // Obtenir les données dans l'ordre EXACT du tableau final (trié + filtré)
  // La méthode la plus fiable : utiliser getPrePaginationRowModel qui a tout sauf la pagination
  const allSortedAndFilteredData = table.getPrePaginationRowModel().rows.map(row => row.original);
  
  // Pour la cohérence, on va passer les données dans l'ordre exact où elles apparaissent
  // c'est-à-dire en respectant la pagination et l'ordre de tri

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'leads': return 'Aucun lead qualifié';
      case 'nonleads': return 'Aucun non-lead';
      case 'all': return 'Aucun lead trouvé';
      default: return 'Aucun lead trouvé';
    }
  };

  return (
    <div>
      {/* Table */}
      <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-slate-50 border-b">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-slate-700 font-semibold">
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-1 ${
                          header.column.getCanSort() ? 'cursor-pointer hover:text-slate-900' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <div className="flex flex-col">
                            {header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <div className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, pageIndex) => (
                <TableRow
                  key={row.id}
                  onClick={() => {
                    // L'index doit correspondre à la position exacte dans allSortedAndFilteredData
                    const realIndex = allSortedAndFilteredData.findIndex(l => 
                      l.id === row.original.id && 
                      l.extractedAt === row.original.extractedAt
                    );
                    onRowClick(row.original, allSortedAndFilteredData, realIndex);
                  }}
                  className="cursor-pointer odd:bg-white even:bg-slate-50/40 hover:bg-slate-100 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {getEmptyMessage()}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-slate-600">
          Affichage {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} à {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} sur {table.getFilteredRowModel().rows.length} entrée(s)
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            ««
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            ‹ Précédent
          </Button>
          
          <span className="text-sm text-slate-600 px-2">
            Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Suivant ›
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            »»
          </Button>
        </div>
      </div>
    </div>
  );
}