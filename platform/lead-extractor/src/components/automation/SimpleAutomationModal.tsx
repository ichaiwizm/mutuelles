import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar, Settings2, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { Lead } from '@/types/lead';
import { convertLeadsToSwissLife } from '@/utils/swisslife-converter';
import { SwissLifeStorageManager } from '@/utils/localStorage-manager';
import { StorageManager } from '@/lib/storage';
import { ExportSuccessModal } from './ExportSuccessModal';

interface SimpleAutomationModalProps {
  leads: Lead[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimpleAutomationModal({
  leads,
  open,
  onOpenChange,
}: SimpleAutomationModalProps) {
  const [periodFilter, setPeriodFilter] = useState('7days');
  const [scoreFilter, setScoreFilter] = useState('0');
  const [selectedService, setSelectedService] = useState('swisslife');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [exportResult, setExportResult] = useState<{
    successful: number;
    failed: number;
    warnings: string[];
    service: string;
  } | null>(null);

  // Filtrer les leads selon les critères
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    // Filtre par période
    if (periodFilter !== 'all') {
      const now = new Date();
      const daysAgo = periodFilter === 'today' ? 1 : 
                     periodFilter === '7days' ? 7 : 
                     periodFilter === '30days' ? 30 : 0;
      
      if (daysAgo > 0) {
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(lead => 
          new Date(lead.extractedAt) >= cutoffDate
        );
      }
    }

    // Filtre par score
    if (scoreFilter !== '0') {
      const minScore = parseInt(scoreFilter);
      filtered = filtered.filter(lead => (lead.score ?? 0) >= minScore);
    }



    return filtered;
  }, [leads, periodFilter, scoreFilter]);

  // Sélectionner automatiquement tous les leads filtrés
  useEffect(() => {
    if (filteredLeads.length > 0) {
      const newSelection = new Set<string>();
      filteredLeads.forEach(lead => newSelection.add(lead.id));
      setSelectedLeadIds(newSelection);
    }
  }, [filteredLeads]);

  // Leads sélectionnés (intersection entre filtrés et sélectionnés)
  const selectedLeads = useMemo(() => {
    return filteredLeads.filter(lead => selectedLeadIds.has(lead.id));
  }, [filteredLeads, selectedLeadIds]);

  // Gestion de la sélection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelection = new Set(selectedLeadIds);
      filteredLeads.forEach(lead => newSelection.add(lead.id));
      setSelectedLeadIds(newSelection);
    } else {
      const newSelection = new Set(selectedLeadIds);
      filteredLeads.forEach(lead => newSelection.delete(lead.id));
      setSelectedLeadIds(newSelection);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelection = new Set(selectedLeadIds);
    if (checked) {
      newSelection.add(leadId);
    } else {
      newSelection.delete(leadId);
    }
    setSelectedLeadIds(newSelection);
  };

  // État de "Tout sélectionner"
  const allFilteredSelected = filteredLeads.length > 0 && 
    filteredLeads.every(lead => selectedLeadIds.has(lead.id));
  const someFilteredSelected = filteredLeads.some(lead => selectedLeadIds.has(lead.id));

  // Export des leads
  const handleExport = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Aucun lead sélectionné');
      return;
    }

    setIsExporting(true);
    
    try {
      if (selectedService === 'swisslife') {
        const conversionResults = convertLeadsToSwissLife(selectedLeads);
        
        if (conversionResults.successful.length === 0) {
          setExportResult({
            successful: 0,
            failed: conversionResults.failed.length,
            warnings: ['Aucun lead n\'a pu être converti avec succès'],
            service: 'SwissLife'
          });
          setSuccessModalOpen(true);
          onOpenChange(false);
          return;
        }

        SwissLifeStorageManager.replaceLeads(conversionResults.successful);
        
        // Préparer le résultat pour le modal de succès
        setExportResult({
          successful: conversionResults.successful.length,
          failed: conversionResults.failed.length,
          warnings: conversionResults.totalWarnings,
          service: 'SwissLife'
        });
        
        // Fermer le modal principal et ouvrir le modal de succès
        onOpenChange(false);
        setSuccessModalOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  // Réinitialiser l'état à l'ouverture
  useEffect(() => {
    if (open) {
      // Récupérer la période du dashboard depuis le localStorage
      const settings = StorageManager.getSettings();
      const dashboardDays = settings.days;
      
      // Convertir les jours en format de filtre
      const periodValue = dashboardDays === 1 ? 'today' :
                         dashboardDays === 7 ? '7days' :
                         dashboardDays === 30 ? '30days' : 'all';
      
      setPeriodFilter(periodValue);
      setScoreFilter('4'); // Score par défaut ≥ 4
      setSelectedService('swisslife');
      setSelectedLeadIds(new Set());
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Export d'automation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Filtres */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Filtres</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Période */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Période
                </Label>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="7days">7 derniers jours</SelectItem>
                    <SelectItem value="30days">30 derniers jours</SelectItem>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Score */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Score minimum
                </Label>
                <Select value={scoreFilter} onValueChange={setScoreFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tous les scores</SelectItem>
                    <SelectItem value="3">≥ 3 étoiles</SelectItem>
                    <SelectItem value="4">≥ 4 étoiles</SelectItem>
                    <SelectItem value="5">5 étoiles uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Service */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Service d'export</h3>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="swisslife"
                  name="service"
                  value="swisslife"
                  checked={selectedService === 'swisslife'}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="h-4 w-4"
                />
                <label htmlFor="swisslife" className="text-sm cursor-pointer">
                  SwissLife (disponible)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="other"
                  name="service"
                  value="other"
                  disabled
                  className="h-4 w-4"
                />
                <label htmlFor="other" className="text-sm text-gray-400 cursor-not-allowed">
                  Autres services (bientôt...)
                </label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Sélection des leads */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Leads disponibles ({filteredLeads.length} trouvés)
              </h3>
              <Badge variant="outline">
                {selectedLeads.length} sélectionnés
              </Badge>
            </div>

            {filteredLeads.length > 0 && (
              <div className="flex items-center space-x-2 pb-2 cursor-pointer" onClick={() => handleSelectAll(!allFilteredSelected)}>
                <Checkbox
                  checked={allFilteredSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                  }}
                  onCheckedChange={handleSelectAll}
                />
                <label className="text-sm cursor-pointer">
                  Tout sélectionner ({filteredLeads.length} leads)
                </label>
              </div>
            )}

            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredLeads.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucun lead ne correspond aux critères
                  </div>
                ) : (
                  filteredLeads.map(lead => (
                    <div
                      key={lead.id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                    >
                      <Checkbox
                        checked={selectedLeadIds.has(lead.id)}
                        onCheckedChange={(checked) => 
                          handleSelectLead(lead.id, checked as boolean)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {lead.contact.prenom} {lead.contact.nom}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {lead.score}/5
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {lead.contact.email || lead.contact.telephone || 'Pas de contact'}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {lead.source}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedLeads.length === 0 || isExporting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Export en cours...
              </>
            ) : (
              `Exporter les sélectionnés (${selectedLeads.length})`
            )}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportSuccessModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        result={exportResult}
      />
    </>
  );
}