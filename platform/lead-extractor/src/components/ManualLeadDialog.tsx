import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ManualLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'form' | 'csv';
}

export function ManualLeadDialog({ open, onOpenChange, initialTab = 'form' }: ManualLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-3xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Ajout manuel de leads</DialogTitle>
          <DialogDescription>
            Interface visuelle uniquement pour l'instant. Les actions seront activées prochainement.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={initialTab} className="mt-2">
          <TabsList>
            <TabsTrigger value="form">Formulaire</TabsTrigger>
            <TabsTrigger value="csv">Import CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Prénom</Label>
                <Input placeholder="Prénom" disabled />
              </div>
              <div>
                <Label>Nom</Label>
                <Input placeholder="Nom" disabled />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="ex: jean.dupont@email.com" disabled />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input placeholder="ex: 06 12 34 56 78" disabled />
              </div>
              <div>
                <Label>Date de naissance</Label>
                <Input placeholder="ex: 1990-05-20" disabled />
              </div>
              <div>
                <Label>Ville</Label>
                <Input placeholder="ex: Paris" disabled />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-3 mt-4">
            <div className="border border-dashed rounded-lg p-6 text-center text-slate-500 bg-slate-50">
              Déposez un fichier CSV ici (UI uniquement — traitement à venir)
            </div>
            <div className="text-sm text-slate-500">
              Le mapping des colonnes et l'aperçu seront proposés ici.
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button disabled title="Bientôt disponible">Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
