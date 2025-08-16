import { type Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Lead } from '@/types/lead';

interface PaginationControlsProps {
  table: Table<Lead>;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ 
  table, 
  pageSize, 
  onPageSizeChange, 
  onPageChange 
}: PaginationControlsProps) {
  const { pagination } = table.getState();

  return (
    <div className="flex items-center justify-between space-x-2 py-4">
      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-600">
          Affichage {pagination.pageIndex * pagination.pageSize + 1} à {Math.min((pagination.pageIndex + 1) * pagination.pageSize, table.getFilteredRowModel().rows.length)} sur {table.getFilteredRowModel().rows.length} entrée(s)
        </div>
        {/* Sélecteur de taille de page */}
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            table.setPageIndex(0);
            onPageChange(0);
          }}
          disabled={!table.getCanPreviousPage()}
          className="border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          ««
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            table.previousPage();
            onPageChange(pagination.pageIndex - 1);
          }}
          disabled={!table.getCanPreviousPage()}
          className="border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          ‹ Précédent
        </Button>
        
        <span className="text-sm text-slate-600 px-2">
          Page {pagination.pageIndex + 1} sur {table.getPageCount()}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            table.nextPage();
            onPageChange(pagination.pageIndex + 1);
          }}
          disabled={!table.getCanNextPage()}
          className="border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          Suivant ›
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const lastPage = table.getPageCount() - 1;
            table.setPageIndex(lastPage);
            onPageChange(lastPage);
          }}
          disabled={!table.getCanNextPage()}
          className="border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          »»
        </Button>
      </div>
    </div>
  );
}