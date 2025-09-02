import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProcessingStatus } from '@/hooks/useProcessingStatus';
import { Download, Trash2, RefreshCw } from 'lucide-react';

export function ProcessingStatusDebug() {
  const { 
    getStorageStats, 
    clearAllStatuses, 
    exportStatuses, 
    isLoaded,
    statusMap 
  } = useProcessingStatus();
  
  const [stats, setStats] = useState(getStorageStats());

  const refreshStats = () => {
    setStats(getStorageStats());
  };

  const handleClearAll = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer tous les statuts de traitement ?')) {
      clearAllStatuses();
      refreshStats();
    }
  };

  const handleExport = () => {
    const data = exportStatuses();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processing-statuses-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isLoaded) {
    return <div className="text-sm text-gray-500">Chargement des statuts...</div>;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Debug Statuts</CardTitle>
        <CardDescription className="text-xs">
          Gestion des statuts de traitement (localStorage)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span>Total:</span>
            <Badge variant="outline">{stats.total}</Badge>
          </div>
          <div className="flex justify-between">
            <span>En attente:</span>
            <Badge variant="secondary">{stats.pending}</Badge>
          </div>
          <div className="flex justify-between">
            <span>En cours:</span>
            <Badge variant="default" className="bg-blue-500">{stats.processing}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Succès:</span>
            <Badge variant="default" className="bg-green-500">{stats.success}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Erreurs:</span>
            <Badge variant="destructive">{stats.error}</Badge>
          </div>
          <div className="flex justify-between">
            <span>En mémoire:</span>
            <Badge variant="outline">{Object.keys(statusMap).length}</Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={refreshStats}
            className="flex-1"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Actualiser
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleExport}
            disabled={stats.total === 0}
          >
            <Download className="w-3 h-3" />
          </Button>
          
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={handleClearAll}
            disabled={stats.total === 0}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {stats.total === 0 && (
          <p className="text-xs text-gray-500 text-center py-2">
            Aucun statut en mémoire
          </p>
        )}
      </CardContent>
    </Card>
  );
}
