import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Plus, ChevronDown, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PeriodSelector } from '@/components/PeriodSelector';
import type { DateRange } from 'react-day-picker';

interface ControlsPanelProps {
  onOpenManual: (tab: 'form' | 'csv') => void;
  onExtractNow: () => void;
  days: number;
  setDays: (days: number) => void;
  dateRange?: DateRange | null;
  setDateRange?: (range: DateRange | undefined) => void;
  filterMode?: 'predefined' | 'custom';
  onClearAll: () => void;
  busy: boolean;
  lastSyncGmail?: string | null;
  runActive?: boolean;
  onStopRun?: () => void;
  stopping?: boolean;
  isolatedActive?: boolean;
  isolatedCount?: number;
  onStopIsolated?: () => void;
  stoppingIsolated?: boolean;
}

export function ControlsPanel({
  onOpenManual,
  onExtractNow,
  days,
  setDays,
  dateRange,
  setDateRange,
  filterMode = 'predefined',
  onClearAll,
  busy,
  lastSyncGmail,
  runActive = false,
  onStopRun,
  stopping = false,
  isolatedActive = false,
  isolatedCount = 0,
  onStopIsolated,
  stoppingIsolated = false
}: ControlsPanelProps) {
  const [gmailOpen, setGmailOpen] = useState(false);
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Ajouter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onSelect={() => onOpenManual('form')} title="UI seulement">
              Formulaire (UI)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenManual('csv')} title="UI seulement">
              Import CSV (UI)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Gmail + résumé période + dernière synchro */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex rounded-md shadow-sm border border-slate-300 overflow-hidden">
            <Button
              variant="ghost"
              onClick={onExtractNow}
              disabled={busy}
              className="flex items-center gap-2 rounded-none px-3"
              title="Extraire les nouveaux leads (merge)"
            >
              <Mail className="h-4 w-4" />
              Extraire Gmail
            </Button>
            <Popover open={gmailOpen} onOpenChange={setGmailOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="rounded-none border-l border-slate-300 px-3 text-slate-700"
                  title="Changer la période"
                >
                  {/* Affiche un résumé concis */}
                  {filterMode === 'custom' && dateRange?.from && dateRange?.to
                    ? `${dateRange.from.toLocaleDateString('fr-FR')} – ${dateRange.to.toLocaleDateString('fr-FR')}`
                    : `${days} jours`}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <PeriodSelector
                  embedded
                  days={days}
                  setDays={setDays}
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  filterMode={filterMode || 'predefined'}
                  onClose={() => setGmailOpen(false)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Actions à droite */}
        <div className="ml-auto flex items-center gap-3">
          {isolatedActive && onStopIsolated && (
            <Button
              onClick={onStopIsolated}
              variant="outline"
              disabled={stoppingIsolated}
              className={`flex items-center gap-2 ${stoppingIsolated ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={isolatedCount > 1 ? `${isolatedCount} retries isolés actifs` : '1 retry isolé actif'}
            >
              {stoppingIsolated ? 'Arrêt retry...' : `Stop retry${isolatedCount > 1 ? ` (${isolatedCount})` : ''}`}
            </Button>
          )}
          {runActive && onStopRun && (
            <Button
              onClick={onStopRun}
              variant="outline"
              disabled={stopping}
              className={`flex items-center gap-2 ${stopping ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {stopping ? 'Arrêt en cours...' : 'Stop run'}
            </Button>
          )}
          <Button 
            onClick={onClearAll} 
            variant="destructive" 
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer tout
          </Button>
        </div>
      </div>
    </div>
  );
}
