import { useState, useEffect } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { rankItem } from '@tanstack/match-sorter-utils';
import type { Lead } from '@/types/lead';
import { useTableColumns } from './useTableColumns';

interface UseLeadsTableProps {
  data: Lead[];
  globalFilter: string;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  selectedLeadIds?: Set<string>;
  onToggleSelect?: (leadId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onRetrySingleLead?: (lead: Lead) => void;
  isAllSelected?: boolean;
}

export function useLeadsTable({
  data,
  globalFilter,
  pageSize,
  currentPage,
  onPageChange,
  selectedLeadIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onRetrySingleLead,
  isAllSelected,
}: UseLeadsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'score', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  const columns = useTableColumns({
    selectedLeadIds,
    onToggleSelect,
    onSelectAll,
    onDeselectAll,
    onRetrySingleLead,
    isAllSelected,
  });

  const globalFilterFn = (row: any, _columnId: string, filterValue: string) => {
    const haystack = [
      row.original.contact?.prenom,
      row.original.contact?.nom,
      row.original.contact?.email,
      row.original.contact?.telephone,
      row.original.contact?.ville,
      row.original.contact?.codePostal,
      row.original.signature?.nomEntreprise,
      row.original.signature?.numeroOrias,
      row.original.signature?.siren,
    ].filter(Boolean).join(' ');
    return rankItem(haystack, filterValue).passed;
  };

  const table = useReactTable({
    data,
    columns,
    state: { 
      sorting, 
      columnFilters, 
      globalFilter,
      pagination: {
        pageIndex: currentPage,
        pageSize: pageSize
      }
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn,
    manualPagination: false,
    pageCount: Math.ceil(data.length / pageSize)
  });

  // Synchroniser les changements de page avec le hook parent
  useEffect(() => {
    if (table.getState().pagination.pageIndex !== currentPage) {
      onPageChange(table.getState().pagination.pageIndex);
    }
  }, [table.getState().pagination.pageIndex, currentPage, onPageChange]);

  // Obtenir les données dans l'ordre EXACT du tableau final (trié + filtré)
  const allSortedAndFilteredData = table.getPrePaginationRowModel().rows.map(row => row.original);
  

  return {
    table,
    allSortedAndFilteredData,
    columns,
  };
}