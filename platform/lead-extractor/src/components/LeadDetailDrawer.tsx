import type { Lead } from '@/types/lead';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailDrawer({ lead, open, onOpenChange }: LeadDetailDrawerProps) {
  if (!lead) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            Détails du lead - {lead.contact.prenom} {lead.contact.nom}
          </DrawerTitle>
          <DrawerDescription>
            Source: {lead.source} | Score: {lead.score}/5 | Extrait le: {new Date(lead.extractedAt).toLocaleDateString()}
            {lead.notes?.parserUsed && (
              <span className="ml-2 text-xs text-slate-500">
                • Parser: {lead.notes.parserUsed.replace('Parser', '')}
              </span>
            )}
          </DrawerDescription>
        </DrawerHeader>
        
        <ScrollArea className="h-[80vh] p-6">
          <div className="space-y-6">
            {/* Contact */}
            <div>
              <h3 className="font-semibold mb-2">Contact</h3>
              <div className="space-y-1 text-sm">
                {lead.contact.civilite && <p>Civilité: {lead.contact.civilite}</p>}
                {lead.contact.nom && <p>Nom: {lead.contact.nom}</p>}
                {lead.contact.prenom && <p>Prénom: {lead.contact.prenom}</p>}
                {lead.contact.telephone && <p>Téléphone: {lead.contact.telephone}</p>}
                {lead.contact.email && <p>Email: {lead.contact.email}</p>}
                {lead.contact.adresse && <p>Adresse: {lead.contact.adresse}</p>}
                {lead.contact.codePostal && <p>Code postal: {lead.contact.codePostal}</p>}
                {lead.contact.ville && <p>Ville: {lead.contact.ville}</p>}
              </div>
            </div>
            
            <Separator />
            
            {/* Souscripteur */}
            <div>
              <h3 className="font-semibold mb-2">Souscripteur</h3>
              <div className="space-y-1 text-sm">
                {lead.souscripteur.dateNaissance && <p>Date de naissance: {lead.souscripteur.dateNaissance}</p>}
                {lead.souscripteur.profession && <p>Profession: {lead.souscripteur.profession}</p>}
                {lead.souscripteur.regimeSocial && <p>Régime social: {lead.souscripteur.regimeSocial}</p>}
                {lead.souscripteur.nombreEnfants !== undefined && <p>Nombre d'enfants: {lead.souscripteur.nombreEnfants}</p>}
              </div>
            </div>
            
            {lead.conjoint && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Conjoint</h3>
                  <div className="space-y-1 text-sm">
                    {lead.conjoint.dateNaissance && <p>Date de naissance: {lead.conjoint.dateNaissance}</p>}
                    {lead.conjoint.profession && <p>Profession: {lead.conjoint.profession}</p>}
                    {lead.conjoint.regimeSocial && <p>Régime social: {lead.conjoint.regimeSocial}</p>}
                  </div>
                </div>
              </>
            )}
            
            {lead.enfants.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Enfants</h3>
                  <div className="space-y-1 text-sm">
                    {lead.enfants.map((enfant, index) => (
                      <p key={index}>Enfant {index + 1}: {enfant.dateNaissance || 'N/A'}</p>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <Separator />
            
            {/* Besoins */}
            <div>
              <h3 className="font-semibold mb-2">Besoins</h3>
              <div className="space-y-1 text-sm">
                {lead.besoins.dateEffet && <p>Date d'effet: {lead.besoins.dateEffet}</p>}
                {lead.besoins.assureActuellement !== undefined && (
                  <p>Assuré actuellement: {lead.besoins.assureActuellement ? 'Oui' : 'Non'}</p>
                )}
                {lead.besoins.niveaux && (
                  <div className="mt-2">
                    <p className="font-medium">Niveaux de garantie:</p>
                    <div className="ml-4">
                      {lead.besoins.niveaux.soinsMedicaux && <p>Soins médicaux: {lead.besoins.niveaux.soinsMedicaux}</p>}
                      {lead.besoins.niveaux.hospitalisation && <p>Hospitalisation: {lead.besoins.niveaux.hospitalisation}</p>}
                      {lead.besoins.niveaux.optique && <p>Optique: {lead.besoins.niveaux.optique}</p>}
                      {lead.besoins.niveaux.dentaire && <p>Dentaire: {lead.besoins.niveaux.dentaire}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {lead.fullContent && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Contenu complet de l'email</h3>
                  {lead.emailSubject && (
                    <div className="mb-3">
                      <h4 className="font-medium text-sm text-slate-600 mb-1">Sujet :</h4>
                      <div className="bg-blue-50 p-2 rounded text-sm border-l-4 border-blue-400">
                        {lead.emailSubject}
                      </div>
                    </div>
                  )}
                  {lead.emailDate && (
                    <div className="mb-3">
                      <h4 className="font-medium text-sm text-slate-600 mb-1">Date :</h4>
                      <div className="text-sm text-slate-700">
                        {new Date(lead.emailDate).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  )}
                  <div className="mb-3">
                    <h4 className="font-medium text-sm text-slate-600 mb-1">Contenu :</h4>
                    <div className="bg-slate-50 p-4 rounded border max-h-96 overflow-y-auto text-sm whitespace-pre-wrap">
                      {lead.fullContent}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {lead.rawSnippet && !lead.fullContent && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Extrait du message</h3>
                  <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                    {lead.rawSnippet}
                  </div>
                </div>
              </>
            )}
            
            {lead.isDuplicate && (
              <Badge variant="destructive">Doublon potentiel</Badge>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}