import { flexRender, type Table } from '@tanstack/react-table';
import { TableBody as UITableBody, TableCell, TableRow } from '@/components/ui/table';
import type { Lead } from '@/types/lead';

interface TableBodyProps {
  table: Table<Lead>;
  allSortedAndFilteredData: Lead[];
  onRowClick: (lead: Lead, allSortedData: Lead[], leadIndex: number) => void;
  emptyMessage: string;
  columnsLength: number;
}

export function TableBody({ 
  table, 
  allSortedAndFilteredData, 
  onRowClick, 
  emptyMessage, 
  columnsLength 
}: TableBodyProps) {
  return (
    <UITableBody>
      {table.getRowModel().rows?.length ? (
        table.getRowModel().rows.map((row) => (
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
          <TableCell colSpan={columnsLength} className="h-24 text-center">
            {emptyMessage}
          </TableCell>
        </TableRow>
      )}
    </UITableBody>
  );
}