import { flexRender, type Table } from '@tanstack/react-table';
import { TableBody as UITableBody, TableCell, TableRow } from '@/components/ui/table';
import type { Lead } from '@/types/lead';

interface TableBodyProps {
  table: Table<Lead>;
  allSortedAndFilteredData: Lead[];
  onRowClick: (lead: Lead, allSortedData: Lead[], leadIndex: number) => void;
  emptyMessage: string;
  columnsLength: number;
  selectedLeadIds?: Set<string>;
  onToggleSelect?: (leadId: string) => void;
}

export function TableBody({ 
  table, 
  allSortedAndFilteredData, 
  onRowClick, 
  emptyMessage, 
  columnsLength,
  selectedLeadIds = new Set(),
}: TableBodyProps) {
  return (
    <UITableBody>
      {table.getRowModel().rows?.length ? (
        table.getRowModel().rows.map((row) => {
          const isSelected = selectedLeadIds.has(row.original.id);
          return (
            <TableRow
              key={row.id}
              onClick={(e) => {
                // Ne pas ouvrir le modal si on clique sur la checkbox
                const target = e.target as HTMLElement;
                if (target.closest('[data-slot="checkbox"]') || target.closest('[role="checkbox"]')) {
                  return;
                }
                // L'index doit correspondre à la position exacte dans allSortedAndFilteredData
                const realIndex = allSortedAndFilteredData.findIndex(l => 
                  l.id === row.original.id && 
                  l.extractedAt === row.original.extractedAt
                );
                onRowClick(row.original, allSortedAndFilteredData, realIndex);
              }}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'bg-indigo-50 hover:bg-indigo-100' 
                  : 'odd:bg-white even:bg-slate-50/40 hover:bg-slate-100'
              }`}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          );
        })
      ) : (
        <TableRow>
          <TableCell colSpan={columnsLength} className="h-24 text-center">
            {emptyMessage}
          </TableCell>
        </TableRow>
      )}
    </UITableBody>
  );
}