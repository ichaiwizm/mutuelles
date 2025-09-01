import { flexRender, type Table } from '@tanstack/react-table';
import { TableBody as UITableBody, TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
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
  onToggleSelect
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
              className={`group cursor-pointer transition-all duration-200 relative ${
                isSelected 
                  ? 'bg-indigo-50 hover:bg-indigo-100 border-l-2 border-l-indigo-500' 
                  : 'odd:bg-white even:bg-slate-50/40 hover:bg-slate-100'
              }`}
            >
              {/* Checkbox qui apparaît au hover/selection */}
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-all duration-200 ${
                isSelected 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
              }`}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => {
                    if (onToggleSelect) {
                      onToggleSelect(row.original.id);
                    }
                  }}
                  className="bg-white shadow-sm"
                  aria-label="Sélectionner cette ligne"
                />
              </div>
              {row.getVisibleCells().map((cell, index) => (
                <TableCell 
                  key={cell.id}
                  className={index === 0 ? 'pl-16' : ''} // Padding pour la première cellule pour laisser place au checkbox
                >
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