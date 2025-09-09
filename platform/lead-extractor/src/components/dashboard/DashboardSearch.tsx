import { Input } from '@/components/ui/input';

interface DashboardSearchProps {
  globalFilter: string;
  onFilterChange: (filter: string) => void;
}

export function DashboardSearch({ globalFilter, onFilterChange }: DashboardSearchProps) {
  return (
    <div className="mb-4 mt-6">
      <Input
        placeholder="Rechercher par nom, prénom, email, téléphone ou ville..."
        value={globalFilter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="max-w-sm border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
      />
    </div>
  );
}