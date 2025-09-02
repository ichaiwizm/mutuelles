import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TableHeader } from '@/components/table/TableHeader';
import { TableBody } from '@/components/table/TableBody';
import { PaginationControls } from '@/components/table/PaginationControls';
import { FloatingSelectionToolbar } from '@/components/table/FloatingSelectionToolbar';
import { useLeadsTable } from '@/hooks/useLeadsTable';
import { getEmptyMessage } from '@/utils/table-utils';
import { CheckSquare } from 'lucide-react';
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
  onReplaceSelection?: (leadIds: string[]) => void;
  onSendToExtension?: () => void;
  onClearSelection?: () => void;
  onRetrySingleLead?: (lead: Lead) => void;
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
  onReplaceSelection,
  onSendToExtension,
  onClearSelection,
  onRetrySingleLead,
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
    onRetrySingleLead,
    isAllSelected,
  });

  const emptyMessage = getEmptyMessage(activeTab);

  // Calculer les leads éligibles (pending + error, exclure success et processing)
  const untreatedLeads = allSortedAndFilteredData.filter(lead => {
    const status = lead.processingStatus?.status;
    return status === 'pending' || status === 'error' || !status;
  });

  const untreatedCount = untreatedLeads.length;

  // Handler pour sélectionner tous les leads non traités
  const handleSelectUntreated = () => {
    if (untreatedCount === 0) return;
    const ids = untreatedLeads.map(l => l.id);
    if (onReplaceSelection) {
      onReplaceSelection(ids);
    } else {
      // Fallback: désélectionner puis toggler un par un
      if (onDeselectAll) onDeselectAll();
      if (onToggleSelect) ids.forEach(id => onToggleSelect(id));
    }
  };

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

      {/* Bouton de sélection rapide */}
      <div className="mb-4 flex justify-start">
        <Button
          onClick={handleSelectUntreated}
          variant="outline"
          size="sm"
          disabled={untreatedCount === 0}
          className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title={untreatedCount === 0 ? "Aucun lead éligible (tous traités ou en cours)" : `Sélectionner ${untreatedCount} leads non traités`}
        >
          <CheckSquare className="h-4 w-4" />
          Sélectionner non traités ({untreatedCount})
        </Button>
        
        {untreatedCount === 0 && allSortedAndFilteredData.length > 0 && (
          <span className="ml-3 text-sm text-gray-500 flex items-center">
            Tous les leads sont déjà traités ou en cours
          </span>
        )}
      </div>
      
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