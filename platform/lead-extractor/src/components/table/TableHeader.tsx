import { flexRender, type Header } from '@tanstack/react-table';
import { TableHead, TableHeader as UITableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Lead } from '@/types/lead';

interface TableHeaderProps {
  headerGroups: any[];
}

export function TableHeader({ headerGroups }: TableHeaderProps) {
  return (
    <UITableHeader>
      {headerGroups.map((headerGroup) => (
        <TableRow key={headerGroup.id} className="bg-slate-50 border-b">
          {headerGroup.headers.map((header: Header<Lead, unknown>) => (
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
    </UITableHeader>
  );
}