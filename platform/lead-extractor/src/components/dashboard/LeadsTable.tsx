import { Table } from '@/components/ui/table';
import { TableHeader } from '@/components/table/TableHeader';
import { TableBody } from '@/components/table/TableBody';
import { PaginationControls } from '@/components/table/PaginationControls';
import { useLeadsTable } from '@/hooks/useLeadsTable';
import { getEmptyMessage } from '@/utils/table-utils';
import type { Lead } from '@/types/lead';

interface LeadsTableProps {
  data: Lead[];
  globalFilter: string;
  onRowClick: (lead: Lead, allSortedData: Lead[], leadIndex: number) => void;
  activeTab: 'leads' | 'all';
  pageSize: number;
  currentPage: number;
  onPageSizeChange: (pageSize: number) => void;
  onPageChange: (page: number) => void;
}

export function LeadsTable({ 
  data, 
  globalFilter, 
  onRowClick, 
  activeTab,
  pageSize,
  currentPage,
  onPageSizeChange,
  onPageChange
}: LeadsTableProps) {
  const { table, allSortedAndFilteredData, columns } = useLeadsTable({
    data,
    globalFilter,
    pageSize,
    currentPage,
    onPageChange,
  });

  const emptyMessage = getEmptyMessage(activeTab);

  return (
    <div>
      {/* Table */}
      <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader headerGroups={table.getHeaderGroups()} />
          <TableBody 
            table={table}
            allSortedAndFilteredData={allSortedAndFilteredData}
            onRowClick={onRowClick}
            emptyMessage={emptyMessage}
            columnsLength={columns.length}
          />
        </Table>
      </div>

      {/* Pagination */}
      <PaginationControls
        table={table}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        onPageChange={onPageChange}
      />
    </div>
  );
}