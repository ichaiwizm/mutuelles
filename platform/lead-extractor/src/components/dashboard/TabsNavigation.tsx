import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabsNavigationProps {
  activeTab: 'leads' | 'all';
  onTabChange: (tab: 'leads' | 'all') => void;
  qualifiedCount: number;
  totalCount: number;
}

export function TabsNavigation({
  activeTab,
  onTabChange,
  qualifiedCount,
  totalCount
}: TabsNavigationProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'leads' | 'all')} className="mb-4">
      <TabsList>
        <TabsTrigger value="leads">
          Leads ({qualifiedCount})
        </TabsTrigger>
        <TabsTrigger value="all">
          Tous ({totalCount})
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}