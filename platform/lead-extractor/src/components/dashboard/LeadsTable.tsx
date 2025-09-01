import { Table } from '@/components/ui/table';
import { TableHeader } from '@/components/table/TableHeader';
import { TableBody } from '@/components/table/TableBody';
import { PaginationControls } from '@/components/table/PaginationControls';
import { FloatingSelectionToolbar } from '@/components/table/FloatingSelectionToolbar';
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
  selectedLeadIds?: Set<string>;
  onToggleSelect?: (leadId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onSendToExtension?: () => void;
  onClearSelection?: () => void;
  isAllSelected?: boolean;
  onSelectByStatus?: (status: 'pending' | 'processing' | 'success' | 'error') => void;
  statusCounts?: {
    pending: number;
    processing: number;
    success: number;
    error: number;
    undefined: number;
  };
}

export function LeadsTable({ 
  data, 
  globalFilter, 
  onRowClick, 
  activeTab,
  pageSize,
  currentPage,
  onPageSizeChange,
  onPageChange,
  selectedLeadIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onSendToExtension,
  onClearSelection,
  isAllSelected = false,
  onSelectByStatus,
  statusCounts
}: LeadsTableProps) {
  const { table, allSortedAndFilteredData, columns } = useLeadsTable({
    data,
    globalFilter,
    pageSize,
    currentPage,
    onPageChange,
    selectedLeadIds,
    onToggleSelect,
    onSelectAll,
    onDeselectAll,
    isAllSelected,
  });

  const emptyMessage = getEmptyMessage(activeTab);

  return (
    <div>
      {/* Floating Selection Toolbar */}
      <FloatingSelectionToolbar
        selectedCount={selectedLeadIds?.size || 0}
        totalCount={data.length}
        onSelectAll={onSelectAll || (() => {})}
        onDeselectAll={onDeselectAll || (() => {})}
        onSendToExtension={onSendToExtension || (() => {})}
        onClearSelection={onClearSelection || (() => {})}
        isAllSelected={isAllSelected}
        onSelectByStatus={onSelectByStatus}
        statusCounts={statusCounts}
      />
      
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
            selectedLeadIds={selectedLeadIds}
            onToggleSelect={onToggleSelect}
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