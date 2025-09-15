import { useState, useCallback, useEffect } from 'react';
import { type ManualLeadForm, type StatutOption, type ProfessionOption, DEFAULT_MANUAL_LEAD, REGIME_OPTIONS } from '@/types/manual-lead';
import { useGlobalConfig } from './useGlobalConfig';

const STORAGE_KEY = 'manual_lead_draft';

export function useManualLead() {
  const [form, setForm] = useState<ManualLeadForm>(DEFAULT_MANUAL_LEAD);
  const [isValid, setIsValid] = useState(false);
  const { config: globalConfig } = useGlobalConfig();

  // Charger le brouillon depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ManualLeadForm;
        setForm({ ...DEFAULT_MANUAL_LEAD, ...parsed });
      }
    } catch (error) {
      console.warn('Erreur chargement brouillon:', error);
    }
  }, []);

  // Sauvegarder automatiquement les changements
  const saveToLocalStorage = useCallback((data: ManualLeadForm) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Erreur sauvegarde brouillon:', error);
    }
  }, []);

  // Valider le formulaire
  const validateForm = useCallback((data: ManualLeadForm) => {
    // Champs de configuration requis
    const hasProjectName = !!(data.projectNameValue && data.projectNameValue.trim().length > 0);
    const hasSimulationType = data.simulationType === 'individuel' || data.simulationType === 'couple';
    const hasMadelin = data.loiMadelin === 'oui' || data.loiMadelin === 'non';

    // Champs assuré principal
    const isBasicValid: boolean =
      !!data.souscripteur.dateNaissance &&
      !!data.souscripteur.codePostal &&
      /^\d{2,5}$/.test(data.souscripteur.codePostal) &&
      !!data.souscripteur.regimeSocial &&
      !!data.souscripteur.statut;

    // Profession requise si le statut du régime a une liste non vide
    const regimeOption = REGIME_OPTIONS.find(r => r.value === data.souscripteur.regimeSocial);
    const statutOption = regimeOption?.statuts.find(s => s.value === data.souscripteur.statut);
    const professionRequired = !!(statutOption && Array.isArray(statutOption.professions) && statutOption.professions.length > 0);
    const hasSouscripteurProfession = professionRequired ? !!data.souscripteur.profession : true;

    // Conjoint
    const isConjointValid: boolean =
      data.simulationType !== 'couple' ||
      (
        !!data.conjoint?.dateNaissance &&
        !!data.conjoint?.regimeSocial &&
        !!data.conjoint?.statut &&
        // Profession requise si applicable
        (() => {
          const reg = REGIME_OPTIONS.find(r => r.value === data.conjoint!.regimeSocial);
          const st = reg?.statuts.find(s => s.value === data.conjoint!.statut);
          const profReq = !!(st && Array.isArray(st.professions) && st.professions.length > 0);
          return profReq ? !!data.conjoint!.profession : true;
        })()
      );

    // Enfants
    const areEnfantsValid: boolean =
      data.souscripteur.nombreEnfants === 0 ||
      (data.enfants.length === data.souscripteur.nombreEnfants &&
        data.enfants.every((enfant) => !!enfant.dateNaissance && !!enfant.ayantDroit));

    return Boolean(
      hasProjectName && hasSimulationType && hasMadelin &&
      isBasicValid && hasSouscripteurProfession && isConjointValid && areEnfantsValid
    );
  }, []);

  // Mettre à jour le formulaire
  const updateForm = useCallback((updates: Partial<ManualLeadForm>) => {
    setForm(prev => {
      const newForm = { ...prev, ...updates };
      setIsValid(validateForm(newForm));
      saveToLocalStorage(newForm);
      return newForm;
    });
  }, [validateForm, saveToLocalStorage]);

  // Mettre à jour le souscripteur
  const updateSouscripteur = useCallback((updates: Partial<ManualLeadForm['souscripteur']>) => {
    setForm(prev => {
      const mergedSouscripteur = { ...prev.souscripteur, ...updates } as ManualLeadForm['souscripteur'];
      // Aide: Loi Madelin activée automatiquement pour TNS
      const autoMadelin =
        mergedSouscripteur.regimeSocial === 'TNS' || mergedSouscripteur.statut === 'TNS' ? 'oui' : 'non';
      const newForm = {
        ...prev,
        souscripteur: mergedSouscripteur,
        loiMadelin: autoMadelin,
      } as ManualLeadForm;
      setIsValid(validateForm(newForm));
      saveToLocalStorage(newForm);
      return newForm;
    });
  }, [validateForm, saveToLocalStorage]);

  // Mettre à jour le conjoint
  const updateConjoint = useCallback((updates: Partial<ManualLeadForm['conjoint']>) => {
    setForm(prev => {
      const newForm = {
        ...prev,
        conjoint: { ...prev.conjoint, ...updates }
      } as ManualLeadForm;
      setIsValid(validateForm(newForm));
      saveToLocalStorage(newForm);
      return newForm;
    });
  }, [validateForm, saveToLocalStorage]);

  // Mettre à jour un enfant
  const updateEnfant = useCallback((index: number, updates: Partial<ManualLeadForm['enfants'][0]>) => {
    setForm(prev => {
      const newEnfants = [...prev.enfants];
      newEnfants[index] = { ...newEnfants[index], ...updates };
      const newForm = { ...prev, enfants: newEnfants } as ManualLeadForm;
      setIsValid(validateForm(newForm));
      saveToLocalStorage(newForm);
      return newForm;
    });
  }, [validateForm, saveToLocalStorage]);

  // Ajuster le nombre d'enfants
  const setNombreEnfants = useCallback((nombre: number) => {
    setForm(prev => {
      const clampedNombre = Math.max(0, Math.min(10, nombre));
      let newEnfants = [...prev.enfants];
      if (newEnfants.length < clampedNombre) {
        while (newEnfants.length < clampedNombre) {
          newEnfants.push({ dateNaissance: '', ayantDroit: 'souscripteur' });
        }
      } else if (newEnfants.length > clampedNombre) {
        newEnfants = newEnfants.slice(0, clampedNombre);
      }
      const newForm = {
        ...prev,
        souscripteur: { ...prev.souscripteur, nombreEnfants: clampedNombre },
        enfants: newEnfants
      } as ManualLeadForm;
      setIsValid(validateForm(newForm));
      saveToLocalStorage(newForm);
      return newForm;
    });
  }, [validateForm, saveToLocalStorage]);

  // Obtenir les statuts disponibles pour un régime
  const getAvailableStatuts = useCallback((regime: string): StatutOption[] => {
    const regimeOption = REGIME_OPTIONS.find(r => r.value === regime);
    return regimeOption?.statuts || [];
  }, []);

  // Obtenir les professions disponibles pour un statut
  const getAvailableProfessions = useCallback((regime: string, statut: string): ProfessionOption[] => {
    const regimeOption = REGIME_OPTIONS.find(r => r.value === regime);
    const statutOption = regimeOption?.statuts.find(s => s.value === statut);
    return statutOption?.professions || [];
  }, []);

  // Obtenir le département depuis le code postal
  const getDepartmentFromCodePostal = useCallback((codePostal: string): string => {
    if (!/^\d{2,5}$/.test(codePostal)) return '';
    
    // Si c'est un code à 2 chiffres, c'est directement le département
    if (codePostal.length === 2) return codePostal;
    
    const dept = codePostal.slice(0, 2);
    
    // Cas spéciaux pour les codes à 5 chiffres
    if (codePostal.length === 5) {
      if (codePostal.startsWith('97')) return codePostal.slice(0, 3); // DOM-TOM
      if (codePostal.startsWith('20')) return codePostal.startsWith('200') || codePostal.startsWith('201') ? '2A' : '2B'; // Corse
    }
    
    return dept;
  }, []);

  // Réinitialiser le formulaire
  const resetForm = useCallback(() => {
    setForm(DEFAULT_MANUAL_LEAD);
    setIsValid(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Erreur suppression brouillon:', error);
    }
  }, []);

  // Générer le lead final
  const generateLead = useCallback(() => {
    if (!isValid) return null;

    const leadId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: leadId,
      projectName: (form.projectNameValue || '').trim() || undefined,
      contact: {
        codePostal: form.souscripteur.codePostal
      },
      souscripteur: {
        dateNaissance: form.souscripteur.dateNaissance,
        profession: form.souscripteur.profession || 'AUTRE',
        regimeSocial: form.souscripteur.regimeSocial,
        nombreEnfants: form.souscripteur.nombreEnfants
      },
      conjoint: form.simulationType === 'couple' && form.conjoint ? {
        dateNaissance: form.conjoint.dateNaissance,
        profession: form.conjoint.profession || 'AUTRE',
        regimeSocial: form.conjoint.regimeSocial
      } : undefined,
      enfants: form.enfants.map(enfant => ({
        dateNaissance: enfant.dateNaissance,
        sexe: 'M' // Valeur par défaut
      })),
      besoins: {
        dateEffet: globalConfig.dateEffet || 'start_next_month',
        assureActuellement: false,
        gammes: 'SwissLife Santé',
        madelin: form.loiMadelin === 'oui',
        niveaux: {
          soinsMedicaux: 100,
          hospitalisation: 200,
          optique: 150,
          dentaire: 300
        }
      },
      signature: {},
      source: 'manual' as const,
      extractedAt: new Date().toISOString(),
      score: 5,
      isDuplicate: false
    };
  }, [form, isValid, globalConfig]);

  return {
    form,
    isValid,
    updateForm,
    updateSouscripteur,
    updateConjoint,
    updateEnfant,
    setNombreEnfants,
    getAvailableStatuts,
    getAvailableProfessions,
    getDepartmentFromCodePostal,
    resetForm,
    generateLead
  };
}
