import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabsNavigationProps {
  activeTab: 'leads' | 'nonleads' | 'all';
  onTabChange: (tab: 'leads' | 'nonleads' | 'all') => void;
  qualifiedCount: number;
  nonLeadsCount: number;
  totalCount: number;
}

export function TabsNavigation({
  activeTab,
  onTabChange,
  qualifiedCount,
  nonLeadsCount,
  totalCount
}: TabsNavigationProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="mb-4">
      <TabsList>
        <TabsTrigger value="leads">
          Leads ({qualifiedCount})
        </TabsTrigger>
        <TabsTrigger value="nonleads">
          Non-leads ({nonLeadsCount})
        </TabsTrigger>
        <TabsTrigger value="all">
          Tous ({totalCount})
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}