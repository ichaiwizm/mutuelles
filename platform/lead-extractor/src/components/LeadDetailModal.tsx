import { useState } from 'react';
import type { Lead } from '@/types/lead';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, Code, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LeadDetailModalProps {
  lead: Lead | null;
  leads: Lead[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadChange?: (lead: Lead, newIndex: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function LeadDetailModal({ lead, leads, currentIndex, open, onOpenChange, onLeadChange }: LeadDetailModalProps) {
  const [showParsingDetails, setShowParsingDetails] = useState(false);
  const [parsingResult, setParsingResult] = useState(null);
  const [parsing, setParsing] = useState(false);
  
  if (!lead) return null;

  // Utiliser l'index fourni directement
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < leads.length - 1;

  const goToPrevious = () => {
    if (hasPrevious && onLeadChange) {
      const previousLead = leads[currentIndex - 1];
      onLeadChange(previousLead, currentIndex - 1);
      setShowParsingDetails(false); // Reset parsing details
    }
  };

  const goToNext = () => {
    if (hasNext && onLeadChange) {
      const nextLead = leads[currentIndex + 1];
      onLeadChange(nextLead, currentIndex + 1);
      setShowParsingDetails(false); // Reset parsing details
    }
  };

  const parseCurrentLead = async () => {
    if (showParsingDetails && parsingResult) {
      // Si déjà ouvert, on ferme
      setShowParsingDetails(false);
      return;
    }

    // Sinon on lance le parsing
    setParsing(true);
    try {
      const response = await fetch(`${API_URL}/api/ingest/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: lead.fullContent || lead.rawSnippet || '',
          subject: lead.emailSubject || '',
          date: lead.emailDate || lead.extractedAt,
          from: (lead as any).emailFrom || '',
          sourceHint: lead.source || ''
        })
      });

      if (!response.ok) {
        throw new Error('Parsing failed');
      }

      const data = await response.json();
      setParsingResult(data.parsingDetails);
      setShowParsingDetails(true);
      toast.success('Parsing réalisé avec succès');
    } catch (error) {
      console.error('Parsing error:', error);
      toast.error('Erreur lors du parsing');
    } finally {
      setParsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Overlay plus opaque */}
      <div 
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-200 ${
          open ? 'opacity-70' : 'opacity-0 pointer-events-none'
        }`} 
      />
      <DialogContent className="sm:max-w-6xl max-w-6xl w-[95vw] max-h-[90vh] p-0 z-50"
        style={{ 
          backgroundColor: 'white',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header avec navigation - sticky */}
        <DialogHeader className="sticky top-0 z-10 bg-white p-6 pb-4 border-b shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-xl">
                {lead.contact.prenom} {lead.contact.nom}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant={lead.score >= 4 ? 'default' : lead.score >= 3 ? 'secondary' : 'destructive'}>
                  {lead.score}/5
                </Badge>
                <Badge variant="outline">{lead.source}</Badge>
                {lead.isDuplicate && <Badge variant="destructive">Doublon</Badge>}
              </div>
            </div>
            
            {/* Navigation et actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={parseCurrentLead}
                disabled={parsing}
                className="flex items-center gap-2"
              >
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Code className="h-4 w-4" />}
                {parsing ? 'Parsing...' : (showParsingDetails ? 'Masquer' : 'Parser')}
              </Button>
              
              <div className="flex items-center gap-1 border-l pl-2 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={!hasPrevious}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                
                <span className="text-sm text-gray-500 px-2">
                  {currentIndex + 1} / {leads.length}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNext}
                  disabled={!hasNext}
                  className="flex items-center gap-1"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 mt-2">
            Extrait le {new Date(lead.extractedAt).toLocaleDateString()} à {new Date(lead.extractedAt).toLocaleTimeString()}
            {lead.notes?.parserUsed && (
              <span className="ml-2">• Parser: {lead.notes.parserUsed.replace('Parser', '')}</span>
            )}
          </div>
        </DialogHeader>

        {/* Zone scrollable avec hauteur fixe */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="p-6">
          <div className="space-y-6">
            {/* Détails de parsing */}
            {showParsingDetails && parsingResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Résultat du parsing en temps réel
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-blue-800">Parser utilisé:</span>
                      <p className="text-blue-700">{parsingResult.notes?.parserUsed || 'GmailParser'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Score calculé:</span>
                      <p className="text-blue-700">{parsingResult.score || 0}/5</p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-blue-800">Éléments détectés:</span>
                    <div className="mt-2 space-y-1 text-blue-700">
                      <div>• Nom: {parsingResult.contact?.nom || 'Non détecté'}</div>
                      <div>• Email: {parsingResult.contact?.email || 'Non détecté'}</div>
                      <div>• Téléphone: {parsingResult.contact?.telephone || 'Non détecté'}</div>
                      <div>• Ville: {parsingResult.contact?.ville || 'Non détecté'}</div>
                      <div>• Profession: {parsingResult.souscripteur?.profession || 'Non détectée'}</div>
                      <div>• Date effet: {parsingResult.besoins?.dateEffet || 'Non détectée'}</div>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-blue-800">Score de confiance:</span>
                    <div className="mt-1 space-y-1 text-blue-700 ml-4">
                      <div>• Contact: {parsingResult.contact?.nom && parsingResult.contact?.email ? '✅ Complet' : '⚠️ Incomplet'}</div>
                      <div>• Besoins: {parsingResult.besoins?.dateEffet ? '✅ Identifiés' : '⚠️ Non identifiés'}</div>
                      <div>• Contexte: {parsingResult.conjoint || (parsingResult.enfants && parsingResult.enfants.length > 0) ? '✅ Familial détecté' : '⚠️ Contexte limité'}</div>
                    </div>
                  </div>
                  
                  {parsingResult.rawSnippet && (
                    <div>
                      <span className="font-medium text-blue-800">Extrait analysé:</span>
                      <div className="mt-1 p-2 bg-blue-100 rounded text-blue-600 text-xs max-h-20 overflow-y-auto">
                        {parsingResult.rawSnippet.substring(0, 200)}...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-gray-900">Informations de contact</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  {lead.contact.civilite && <div><span className="font-medium">Civilité:</span> {lead.contact.civilite}</div>}
                  {lead.contact.nom && <div><span className="font-medium">Nom:</span> {lead.contact.nom}</div>}
                  {lead.contact.prenom && <div><span className="font-medium">Prénom:</span> {lead.contact.prenom}</div>}
                  {lead.contact.email && <div><span className="font-medium">Email:</span> {lead.contact.email}</div>}
                </div>
                <div className="space-y-2">
                  {lead.contact.telephone && <div><span className="font-medium">Téléphone:</span> {lead.contact.telephone}</div>}
                  {lead.contact.adresse && <div><span className="font-medium">Adresse:</span> {lead.contact.adresse}</div>}
                  {lead.contact.codePostal && <div><span className="font-medium">Code postal:</span> {lead.contact.codePostal}</div>}
                  {lead.contact.ville && <div><span className="font-medium">Ville:</span> {lead.contact.ville}</div>}
                </div>
              </div>
            </div>

            {/* Souscripteur */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-gray-900">Souscripteur</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {lead.souscripteur.dateNaissance && <div><span className="font-medium">Date de naissance:</span> {lead.souscripteur.dateNaissance}</div>}
                {lead.souscripteur.profession && <div><span className="font-medium">Profession:</span> {lead.souscripteur.profession}</div>}
                {lead.souscripteur.regimeSocial && <div><span className="font-medium">Régime social:</span> {lead.souscripteur.regimeSocial}</div>}
                {lead.souscripteur.nombreEnfants !== undefined && <div><span className="font-medium">Nombre d'enfants:</span> {lead.souscripteur.nombreEnfants}</div>}
              </div>
            </div>

            {/* Conjoint */}
            {lead.conjoint && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-gray-900">Conjoint</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {lead.conjoint.dateNaissance && <div><span className="font-medium">Date de naissance:</span> {lead.conjoint.dateNaissance}</div>}
                  {lead.conjoint.profession && <div><span className="font-medium">Profession:</span> {lead.conjoint.profession}</div>}
                  {lead.conjoint.regimeSocial && <div><span className="font-medium">Régime social:</span> {lead.conjoint.regimeSocial}</div>}
                </div>
              </div>
            )}

            {/* Enfants */}
            {lead.enfants.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-gray-900">Enfants</h3>
                <div className="space-y-2 text-sm">
                  {lead.enfants.map((enfant, index) => (
                    <div key={index}>
                      <span className="font-medium">Enfant {index + 1}:</span> 
                      {enfant.dateNaissance || 'Date non spécifiée'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Besoins */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-gray-900">Besoins en assurance</h3>
              <div className="space-y-3 text-sm">
                {lead.besoins.dateEffet && <div><span className="font-medium">Date d'effet souhaitée:</span> {lead.besoins.dateEffet}</div>}
                {lead.besoins.assureActuellement !== undefined && (
                  <div><span className="font-medium">Assuré actuellement:</span> {lead.besoins.assureActuellement ? 'Oui' : 'Non'}</div>
                )}
                {lead.besoins.niveaux && (
                  <div>
                    <div className="font-medium mb-2">Niveaux de garantie souhaités:</div>
                    <div className="grid grid-cols-2 gap-2 ml-4">
                      {lead.besoins.niveaux.soinsMedicaux && <div>• Soins médicaux: {lead.besoins.niveaux.soinsMedicaux}</div>}
                      {lead.besoins.niveaux.hospitalisation && <div>• Hospitalisation: {lead.besoins.niveaux.hospitalisation}</div>}
                      {lead.besoins.niveaux.optique && <div>• Optique: {lead.besoins.niveaux.optique}</div>}
                      {lead.besoins.niveaux.dentaire && <div>• Dentaire: {lead.besoins.niveaux.dentaire}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Email original */}
            {(lead.fullContent || lead.rawSnippet) && (
              <div className="bg-gray-50 border rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-gray-900">Email original</h3>
                
                {lead.emailSubject && (
                  <div className="mb-3">
                    <div className="font-medium text-sm text-gray-700 mb-1">Sujet:</div>
                    <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400 text-sm break-words">
                      {lead.emailSubject}
                    </div>
                  </div>
                )}
                
                {lead.emailDate && (
                  <div className="mb-3">
                    <div className="font-medium text-sm text-gray-700 mb-1">Date:</div>
                    <div className="text-sm text-gray-600">
                      {new Date(lead.emailDate).toLocaleString('fr-FR')}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="font-medium text-sm text-gray-700 mb-1">Contenu:</div>
                  <div className="max-h-64 bg-white border rounded p-3 text-sm overflow-y-auto break-words whitespace-pre-wrap">
                    {lead.fullContent || lead.rawSnippet}
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}