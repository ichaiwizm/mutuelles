import { useState, useEffect, useMemo } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import type { Lead } from '@/types/lead';
import { StorageManager } from '@/lib/storage';
import { DeduplicationService } from '@/lib/deduplication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LeadDetailDrawer } from '@/components/LeadDetailDrawer';
import { toast } from 'sonner';
import axios from 'axios';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = 'http://localhost:3001';

export function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [gmailEnabled, setGmailEnabled] = useState(true);
  const [calendarEnabled, setCalendarEnabled] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'score', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/status`);
      console.log('🔐 État authentification:', response.data);
      setIsAuthenticated(response.data.authenticated);
      return response.data.authenticated;
    } catch (error) {
      console.error('❌ Erreur vérification auth:', error);
      setIsAuthenticated(false);
      return false;
    }
  };

  useEffect(() => {
    // Vérifier l'authentification au chargement
    checkAuthStatus();

    // Charger les leads depuis localStorage
    const storedLeads = StorageManager.getLeads();
    setLeads(storedLeads);

    // Charger les paramètres
    const settings = StorageManager.getSettings();
    setDays(settings.days);
    setGmailEnabled(settings.sources.gmail);
    setCalendarEnabled(settings.sources.calendar);
  }, []);

  const columns: ColumnDef<Lead>[] = useMemo(() => [
    {
      id: 'contact',
      header: 'Contact',
      accessorFn: (row) => `${row.contact.civilite || ''} ${row.contact.prenom || ''} ${row.contact.nom || ''}`.trim(),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.contact.civilite} {row.original.contact.prenom} {row.original.contact.nom}
          </div>
          <div className="text-sm text-gray-500">
            {row.original.contact.email}
          </div>
          <div className="text-sm text-gray-500">
            {row.original.contact.telephone}
          </div>
        </div>
      ),
    },
    {
      id: 'location',
      header: 'Localisation',
      accessorFn: (row) => `${row.contact.ville || ''} ${row.contact.codePostal || ''}`.trim(),
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.contact.ville && (
            <div>{row.original.contact.ville}</div>
          )}
          {row.original.contact.codePostal && (
            <div>{row.original.contact.codePostal}</div>
          )}
        </div>
      ),
    },
    {
      id: 'souscripteur',
      header: 'Souscripteur',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.souscripteur.dateNaissance && (
            <div>Né le: {row.original.souscripteur.dateNaissance}</div>
          )}
          {row.original.souscripteur.profession && (
            <div>{row.original.souscripteur.profession}</div>
          )}
          {row.original.souscripteur.regimeSocial && (
            <div>{row.original.souscripteur.regimeSocial}</div>
          )}
        </div>
      ),
    },
    {
      id: 'enfants',
      header: 'Enfants',
      accessorFn: (row) => row.enfants.length,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.enfants.length > 0 && (
            <Badge variant="secondary">{row.original.enfants.length}</Badge>
          )}
        </div>
      ),
    },
    {
      id: 'besoins',
      header: 'Besoins',
      cell: ({ row }) => (
        <div className="text-sm space-y-1">
          {row.original.besoins.dateEffet && (
            <div>Effet: {row.original.besoins.dateEffet}</div>
          )}
          {row.original.besoins.assureActuellement !== undefined && (
            <Badge variant={row.original.besoins.assureActuellement ? 'default' : 'secondary'}>
              {row.original.besoins.assureActuellement ? 'Assuré' : 'Non assuré'}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'source',
      header: 'Source',
      accessorKey: 'source',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.source}</Badge>
      ),
    },
    {
      id: 'score',
      header: 'Score',
      accessorKey: 'score',
      enableSorting: true,
      cell: ({ row }) => (
        <Badge variant={
          row.original.score >= 4 ? 'default' : 
          row.original.score >= 3 ? 'secondary' : 
          row.original.score >= 2 ? 'outline' : 
          'destructive'
        }>
          {row.original.score}/5
        </Badge>
      ),
    },
    {
      id: 'duplicate',
      header: 'Statut',
      cell: ({ row }) => (
        row.original.isDuplicate && (
          <Badge variant="destructive">Doublon?</Badge>
        )
      ),
    },
    {
      id: 'extractedAt',
      header: 'Date extraction',
      accessorKey: 'extractedAt',
      cell: ({ row }) => (
        <div className="text-sm">
          {new Date(row.original.extractedAt).toLocaleDateString()}
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  const handleExtractGmail = async () => {
    console.log('📧 Début extraction Gmail...', { days });
    setLoading(true);
    
    try {
      // Vérifier l'authentification avant d'appeler l'API
      const authStatus = await checkAuthStatus();
      if (!authStatus) {
        console.log('❌ Non authentifié, redirection vers login...');
        toast.error('Authentification requise. Redirection...');
        window.location.href = `${API_URL}/auth/google/start`;
        return;
      }

      const response = await axios.post(`${API_URL}/api/ingest/gmail`, { days });
      const newLeads = response.data;
      console.log('✅ Gmail extraction réussie:', { count: newLeads.length, leads: newLeads });
      
      // Fusionner avec les leads existants et dédupliquer
      const allLeads = [...leads, ...newLeads];
      const dedupedLeads = DeduplicationService.deduplicateLeads(allLeads);
      
      setLeads(dedupedLeads);
      StorageManager.saveLeads(dedupedLeads);
      StorageManager.updateLastSync('gmail');
      
      toast.success(`${newLeads.length} leads extraits de Gmail`);
    } catch (error) {
      console.error('❌ Erreur extraction Gmail:', error);
      if (error.response?.status === 401) {
        console.log('🔐 Token expiré, redirection vers login...');
        toast.error('Session expirée. Redirection...');
        window.location.href = `${API_URL}/auth/google/start`;
      } else {
        toast.error('Erreur lors de l\'extraction Gmail');
      }
    } finally {
      setLoading(false);
      console.log('📧 Fin extraction Gmail');
    }
  };

  const handleExtractCalendar = async () => {
    console.log('📅 Début extraction Calendar...', { days });
    setLoading(true);
    
    try {
      // Vérifier l'authentification avant d'appeler l'API
      const authStatus = await checkAuthStatus();
      if (!authStatus) {
        console.log('❌ Non authentifié, redirection vers login...');
        toast.error('Authentification requise. Redirection...');
        window.location.href = `${API_URL}/auth/google/start`;
        return;
      }

      const response = await axios.post(`${API_URL}/api/ingest/calendar`, { days });
      const newLeads = response.data;
      console.log('✅ Calendar extraction réussie:', { count: newLeads.length, leads: newLeads });
      
      // Fusionner avec les leads existants et dédupliquer
      const allLeads = [...leads, ...newLeads];
      const dedupedLeads = DeduplicationService.deduplicateLeads(allLeads);
      
      setLeads(dedupedLeads);
      StorageManager.saveLeads(dedupedLeads);
      StorageManager.updateLastSync('calendar');
      
      toast.success(`${newLeads.length} leads extraits de Calendar`);
    } catch (error) {
      console.error('❌ Erreur extraction Calendar:', error);
      if (error.response?.status === 401) {
        console.log('🔐 Token expiré, redirection vers login...');
        toast.error('Session expirée. Redirection...');
        window.location.href = `${API_URL}/auth/google/start`;
      } else {
        toast.error('Erreur lors de l\'extraction Calendar');
      }
    } finally {
      setLoading(false);
      console.log('📅 Fin extraction Calendar');
    }
  };

  const handleCollectAll = async () => {
    console.log('🚀 Début collecte globale...', { gmail: gmailEnabled, calendar: calendarEnabled });
    setLoading(true);
    try {
      if (gmailEnabled) await handleExtractGmail();
      if (calendarEnabled) await handleExtractCalendar();
      console.log('✅ Collecte globale terminée');
    } catch (error) {
      console.error('❌ Erreur collecte globale:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const saveSettings = () => {
    console.log('💾 Sauvegarde des paramètres...', { days, gmail: gmailEnabled, calendar: calendarEnabled });
    StorageManager.saveSettings({
      days,
      sources: {
        gmail: gmailEnabled,
        calendar: calendarEnabled,
      },
    });
    toast.success('Paramètres sauvegardés');
    console.log('✅ Paramètres sauvegardés');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Tableau de bord - Extraction de leads</h1>
          <div className="flex items-center gap-2">
            {isAuthenticated === null ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Vérification...</span>
              </div>
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Connecté</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium">Non connecté</span>
                </div>
                <Button 
                  onClick={() => window.location.href = `${API_URL}/auth/google/start`}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Se connecter
                </Button>
              </div>
            )}
          </div>
        </div>
      
        {/* Contrôles */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Label className="text-slate-700 font-medium">Derniers</Label>
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="60">60 jours</SelectItem>
                <SelectItem value="90">90 jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="gmail"
              checked={gmailEnabled}
              onCheckedChange={setGmailEnabled}
            />
            <Label htmlFor="gmail" className="text-slate-700 font-medium">Gmail</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="calendar"
              checked={calendarEnabled}
              onCheckedChange={setCalendarEnabled}
            />
            <Label htmlFor="calendar" className="text-slate-700 font-medium">Calendar</Label>
          </div>
          
          <Button onClick={saveSettings} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
            Sauvegarder
          </Button>
          
          <div className="flex gap-2 ml-auto">
            <Button 
              onClick={handleExtractGmail} 
              disabled={loading || !gmailEnabled}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Récupérer Gmail
            </Button>
            <Button 
              onClick={handleExtractCalendar} 
              disabled={loading || !calendarEnabled}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Récupérer Agenda
            </Button>
            <Button 
              onClick={handleCollectAll} 
              disabled={loading || (!gmailEnabled && !calendarEnabled)}
              className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Collecter maintenant
            </Button>
          </div>
        </div>
      </div>
      
        {/* Barre de recherche */}
        <div className="mb-6">
          <Input
            placeholder="Rechercher par nom, prénom, email, téléphone ou ville..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      
        {/* Table */}
        <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-slate-50 border-b">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-slate-700 font-semibold"
                  >
                    {header.isPlaceholder ? null : (
                      <div 
                        className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer hover:text-slate-900' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <div className="flex flex-col">
                            {header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <div className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row.original)}
                  className="cursor-pointer odd:bg-white even:bg-slate-50/40 hover:bg-slate-100 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Aucun lead trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-slate-600">
            {table.getFilteredRowModel().rows.length} lead(s) trouvé(s)
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Suivant
            </Button>
          </div>
      </div>
      
        {/* Drawer de détail */}
        <LeadDetailDrawer
          lead={selectedLead}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>
    </div>
  );
}