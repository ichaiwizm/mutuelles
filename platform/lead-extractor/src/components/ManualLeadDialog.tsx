import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ManualLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualLeadDialog({ open, onOpenChange }: ManualLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-3xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Ajout manuel de leads</DialogTitle>
          <DialogDescription>
            Interface visuelle uniquement pour l'instant. Les actions seront activées prochainement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button disabled title="Bientôt disponible">Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
