// Logique de remplissage automatique des formulaires SwissLife One
window.SwissLifeFormFiller = {
  
  // Sélecteurs et helpers DOM pour l'iframe
  getDOMHelpers: () => {
    const q = s => document.querySelector(s);
    const qa = s => [...document.querySelectorAll(s)];
    const ev = (el, type) => el && el.dispatchEvent(new Event(type, { bubbles: true }));
    
    return { q, qa, ev };
  },

  // Attendre qu'un élément soit disponible et prêt
  waitForElement: (selector, timeout = 5000) => {
    return new Promise((resolve) => {
      const { q } = SwissLifeFormFiller.getDOMHelpers();
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = q(selector);
        if (element && element.offsetParent !== null) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          console.warn(`Timeout: élément ${selector} non trouvé après ${timeout}ms`);
          resolve(null);
          return;
        }
        
        setTimeout(checkElement, 100);
      };
      
      checkElement();
    });
  },

  // Attendre que les options d'un select soient disponibles
  waitForSelectOptions: (selector, minOptions = 2, timeout = 5000) => {
    return new Promise((resolve) => {
      const { q } = SwissLifeFormFiller.getDOMHelpers();
      const startTime = Date.now();
      
      const checkOptions = () => {
        const element = q(selector);
        if (element && element.options && element.options.length >= minOptions) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          console.warn(`Timeout: options pour ${selector} non disponibles après ${timeout}ms`);
          resolve(null);
          return;
        }
        
        setTimeout(checkOptions, 150);
      };
      
      checkOptions();
    });
  },

  // Normalisation de texte pour comparaisons
  normalizeText: (text) => 
    (text || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim(),

  // Vérifie le texte actuellement sélectionné dans un <select>
  getSelectedText: (selectEl) => {
    if (!selectEl) return '';
    const opt = selectEl.options[selectEl.selectedIndex];
    return (opt && (opt.textContent || '').trim()) || '';
  },

  // Sélectionne par texte avec vérification et retries (gère le remplacement du nœud)
  setSelectByTextWithRetry: async function(selector, targetText, {
    tries = 6, interval = 300, contains = false, logLabel = 'select'
  } = {}) {
    const { q, ev } = this.getDOMHelpers();
    const norm = this.normalizeText;

    for (let i = 0; i < tries; i++) {
      let el = q(selector);
      if (!el || !el.options || el.options.length === 0) {
        await new Promise(r => setTimeout(r, interval));
        continue; // le select n'est pas encore prêt (ou vient d'être remplacé)
      }

      // Tente la sélection
      const hit = [...el.options].find(o => {
        const t = this.normalizeText(o.textContent || '');
        return contains ? t.includes(norm(targetText)) : t === norm(targetText);
      });
      if (hit) {
        el.value = hit.value;
        ev(el, 'input');
        ev(el, 'change');
      }

      // Vérifie après un court délai (pour laisser un éventuel recalc réécrire le DOM)
      await new Promise(r => setTimeout(r, Math.max(150, interval / 2)));

      // Si le select a été remplacé, on repartira au prochain tour (q(selector) != el)
      const fresh = q(selector);
      const ok = fresh && this.normalizeText(this.getSelectedText(fresh)) === norm(targetText);
      if (ok) {
        return true; // sélection persistante
      }
      // sinon, on réessaie (le serveur/DOM a probablement réécrit le select)
      await new Promise(r => setTimeout(r, interval));
    }
    console.warn(`❌ ${logLabel}: impossible de fixer « ${targetText} » après ${tries} tentatives`);
    return false;
  },

  // Gestion centralisée des sélecteurs (chargés depuis selectors.json)
  selectors: null,

  loadSelectors: async function () {
    if (this.selectors) return this.selectors;

    try {
      let url;
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        url = chrome.runtime.getURL('selectors.json');
      } else if (document.currentScript) {
        // Construit une URL relative au script courant (contexte page)
        url = new URL('selectors.json', document.currentScript.src).href;
      } else {
        throw new Error('chrome.runtime.getURL indisponible');
      }

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      // On complète avec les sélecteurs dynamiques qui ne peuvent pas être décrits en JSON
      this.selectors = {
        ...data,
        enfantDateNaissance: (index) => `#enfants-${index}-dateNaissance`
      };
      return this.selectors;
    } catch (err) {
      console.warn('⚠️ Sélecteurs JSON non chargés, utilisation du mapping legacy.', err);
      // On laisse this.selectors à null, pour permettre le fallback
      return null;
    }
  },

  ensureSelectorsLoaded: async function () {
    if (!this.selectors) {
      await this.loadSelectors();
    }
    return this.selectors;
  },

  // Définition des champs et sélecteurs
  getFieldSelectors: function () {
    if (this.selectors) return this.selectors; // mapping JSON chargé
    return {
    // Projet
    nomProjet: '#nom-projet',
    santeOui: '#projet-sante-individuelle-oui',
    confortNon: '#projet-confort-hospitalisation-non',
    simulationIndividuelle: '#simulation-individuelle',
    simulationCouple: '#simulation-couple',
    
    // Assuré principal
    dateNaissancePrincipal: '#date-naissance-assure-principal',
    departementPrincipal: '#departement-assure-principal',
    regimeSocialPrincipal: '#regime-social-assure-principal',
    statutPrincipal: '#statut-assure-principal',
    professionPrincipal: '#profession-assure-principal',
    
    // Enfants
    nombreEnfants: '#sante-nombre-enfant-assures',
    enfantDateNaissance: (index) => `#enfants-${index}-dateNaissance`,
    
    // Conjoint
    dateNaissanceConjoint: '#date-naissance-assure-conjoint',
    regimeSocialConjoint: '#regime-social-assure-conjoint',
    statutConjoint: '#statut-assure-conjoint',
    
    // Produit et options
    gamme: '#selection-produit-sante',
    dateEffet: '#contratSante-dateEffet',
    loiMadelinCheckbox: '#loi-madelin-checkbox',
    resiliationNon: '#resiliation-contrat-non'
  };},

  // Fonctions de manipulation des champs
  setInputValue: (selector, value, { change = true, blur = false } = {}) => {
    const { q, ev } = SwissLifeFormFiller.getDOMHelpers();
    const el = q(selector);
    
    if (!el) {
      console.warn('Champ manquant:', selector);
      return false;
    }
    
    el.focus();
    el.value = value;
    ev(el, 'input');
    if (change) ev(el, 'change');
    if (blur) el.blur();                 // ⬅️ on ne "blur" plus par défaut
    return true;
  },

  clickElement: (selector) => {
    const { q, ev } = SwissLifeFormFiller.getDOMHelpers();
    const el = q(selector);
    
    if (!el) {
      console.warn('Élément manquant:', selector);
      return false;
    }
    
    el.click();
    // radios/checkbox/selects : force les events réactifs
    ev(el, 'input');
    ev(el, 'change');
    return true;
  },

  setSelectByText: (selector, targetText, options = {}) => {
    const { q, ev } = SwissLifeFormFiller.getDOMHelpers();
    const { contains = false } = options;
    const el = q(selector);
    
    if (!el) {
      console.warn('Select manquant:', selector);
      return false;
    }
    
    const hit = [...el.options].find(option => {
      const text = option.textContent || '';
      const normalizedTarget = SwissLifeFormFiller.normalizeText(targetText);
      const normalizedText = SwissLifeFormFiller.normalizeText(text);
      
      return contains ? normalizedText.includes(normalizedTarget) : normalizedText === normalizedTarget;
    });
    
    if (hit) {
      el.value = hit.value;
      ev(el, 'change');
      return true;
    }
    
    console.warn('Option introuvable pour', selector, '→', targetText);
    return false;
  },

  setSelectByRegex: (selector, regex, options = {}) => {
    const { q, ev } = SwissLifeFormFiller.getDOMHelpers();
    const { startsWith = null } = options;
    const el = q(selector);
    
    if (!el) return false;
    
    const hit = [...el.options].find(option => {
      const text = option.textContent || '';
      if (startsWith) {
        return SwissLifeFormFiller.normalizeText(text).startsWith(SwissLifeFormFiller.normalizeText(startsWith));
      }
      return regex.test(text);
    });
    
    if (hit) {
      el.value = hit.value;
      ev(el, 'change');
      return true;
    }
    
    return false;
  },

  // Génération de la date d'effet (1er du mois suivant)
  generateEffectDate: () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(nextMonth.getDate())}/${pad(nextMonth.getMonth() + 1)}/${nextMonth.getFullYear()}`;
  },

  // Remplissage par étapes avec délais
  fillProjectSection: (leadData) => {
    const selectors = SwissLifeFormFiller.getFieldSelectors();
    const { q, ev } = SwissLifeFormFiller.getDOMHelpers();
    
    SwissLifeFormFiller.setInputValue(selectors.nomProjet, leadData.projetNom, { blur: false });
    SwissLifeFormFiller.clickElement(selectors.santeOui);
    SwissLifeFormFiller.clickElement(selectors.confortNon);
    
    if (leadData.simulationType === 'couple') {
      SwissLifeFormFiller.clickElement(selectors.simulationCouple);
      
      // Vérifier que le radio "couple" est bien coché
      const rc = q('#simulation-couple');
      if (rc && !rc.checked) {
        rc.checked = true;
        ev(rc, 'input');
        ev(rc, 'change');
      }
    } else {
      SwissLifeFormFiller.clickElement(selectors.simulationIndividuelle);
    }
  },

  fillMainInsured: async (leadData) => {
    const selectors = SwissLifeFormFiller.getFieldSelectors();
    
    SwissLifeFormFiller.setInputValue(selectors.dateNaissancePrincipal, leadData.principalDOB, { blur: false });
    
    // Département depuis le code postal
    const dept = (leadData.cp || '').slice(0, 2);
    if (dept) {
      SwissLifeFormFiller.setSelectByRegex(selectors.departementPrincipal, /.*/, { startsWith: dept });
    }
    
    // Régime social - chercher TNS
    const tnsRegex = /tns|ind[eé]pend/i;
    if (!SwissLifeFormFiller.setSelectByRegex(selectors.regimeSocialPrincipal, tnsRegex)) {
      SwissLifeFormFiller.setSelectByText(selectors.regimeSocialPrincipal, "Régime Général pour TNS (CPAM)");
    }
    
    // Statut
    SwissLifeFormFiller.setSelectByText(selectors.statutPrincipal, leadData.statutTexte);
    
    // Attendre que la liste des professions soit mise à jour après changement de statut
    console.log('⏳ Attente mise à jour liste des professions...');
    const professionSelect = await SwissLifeFormFiller.waitForSelectOptions(selectors.professionPrincipal, 3, 6000);
    
    if (professionSelect) {
      console.log('✅ Liste des professions disponible');
      SwissLifeFormFiller.setSelectByText(selectors.professionPrincipal, leadData.profTexte);
    } else {
      console.warn('❌ Impossible d\'attendre la liste des professions, tentative immédiate');
      setTimeout(() => {
        SwissLifeFormFiller.setSelectByText(selectors.professionPrincipal, leadData.profTexte);
      }, 500);
      // 2e passe si le serveur recharge encore
      setTimeout(() => {
        SwissLifeFormFiller.setSelectByText(selectors.professionPrincipal, leadData.profTexte);
      }, 1500);
    }
  },

  fillChildren: (leadData) => {
    const selectors = SwissLifeFormFiller.getFieldSelectors();
    const { q, ev } = SwissLifeFormFiller.getDOMHelpers();
    
    const childrenCount = (leadData.enfantsDOB || []).length;
    const selectElement = q(selectors.nombreEnfants);
    
    if (selectElement) {
      selectElement.value = String(childrenCount);
      ev(selectElement, 'change');
    }
    
    // Remplir les dates après création des champs
    setTimeout(() => {
      (leadData.enfantsDOB || []).forEach((dob, index) => {
        SwissLifeFormFiller.setInputValue(selectors.enfantDateNaissance(index), dob, { blur: false });
      });
    }, 400);
  },

  fillSpouse: async function(leadData) {
    if (!leadData.conjointDOB) return;

    console.log('⏳ Attente des champs conjoint (avec recalc ciblé)...');
    const el = await this.ensureConjointFields();
    if (!el) {
      console.warn('❌ Champs conjoint non disponibles après tentatives');
      return;
    }

    console.log('✅ Champs conjoint disponibles');

    // 1) DOB conjoint
    el.focus();
    el.value = leadData.conjointDOB;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    // petit délai pour laisser partir l'appel serveur
    await new Promise(r => setTimeout(r, 250));

    // 2) Régime conjoint (d'abord) — TNS CPAM
    const regimeSel = await this.waitForSelectOptions('#regime-social-assure-conjoint', 3, 4000);
    if (regimeSel) {
      const { ev } = this.getDOMHelpers();
      const hit = [...regimeSel.options].find(o => /Régime Général pour TNS \(CPAM\)/i.test(o.textContent || ''));
      if (hit) { regimeSel.value = hit.value; ev(regimeSel, 'input'); ev(regimeSel, 'change'); }
    }

    // petit délai car la mise à jour du régime peut recharger le statut
    await new Promise(r => setTimeout(r, 300));

    // 3) Statut conjoint (en dernier) — robuste avec retry
    await this.waitForSelectOptions('#statut-assure-conjoint', 3, 5000); // attente un peu plus longue
    await this.setSelectByTextWithRetry('#statut-assure-conjoint', leadData.statutTexte, {
      tries: 6, interval: 300, logLabel: 'Statut conjoint'
    });

    // Optionnel : validation finale (re-assert) 500ms plus tard
    await new Promise(r => setTimeout(r, 500));
    await this.setSelectByTextWithRetry('#statut-assure-conjoint', leadData.statutTexte, {
      tries: 2, interval: 200, logLabel: 'Statut conjoint (validation)'
    });
  },

  fillProductAndOptions: (leadData) => {
    const selectors = SwissLifeFormFiller.getFieldSelectors();
    const { q } = SwissLifeFormFiller.getDOMHelpers();
    
    // Gamme
    SwissLifeFormFiller.setSelectByText(selectors.gamme, leadData.gammeTexte);
    
    // Date d'effet
    const effectDate = SwissLifeFormFiller.generateEffectDate();
    SwissLifeFormFiller.setInputValue(selectors.dateEffet, effectDate, { blur: false });
    
    // Loi Madelin
    const madelinCheckbox = q(selectors.loiMadelinCheckbox);
    if (madelinCheckbox && !madelinCheckbox.checked) {
      madelinCheckbox.click();
    }
    
    // Résiliation
    SwissLifeFormFiller.clickElement(selectors.resiliationNon);
  },

  // Déclencher un recalcul ciblé sur l'assuré principal pour faire apparaître les champs conjoint
  triggerRecalcOnPrincipal: async () => {
    const { q } = SwissLifeFormFiller.getDOMHelpers();
    const el = q('#date-naissance-assure-principal') || q('#statut-assure-principal') || q('#regime-social-assure-principal');
    if (!el) return;
    el.focus();
    await new Promise(r => setTimeout(r, 60));
    el.blur();
    await new Promise(r => setTimeout(r, 250)); // laisse répondre le serveur
  },

  // Trouve l'input de date de naissance conjoint avec fallback
  findConjointDOBInput: () => {
    const { qa } = SwissLifeFormFiller.getDOMHelpers();
    const norm = SwissLifeFormFiller.normalizeText;
    const inputs = qa('input[type="text"], input[type="date"]');
    for (const el of inputs) {
      const id = norm(el.id), nm = norm(el.name);
      const lbl = (() => {
        if (el.id) {
          const l = document.querySelector(`label[for="${el.id}"]`);
          if (l) return norm(l.textContent || '');
        }
        const near = el.closest('.form-group, .row, fieldset, section, .bloc')?.querySelector('label, legend, .label, .titre, .title');
        return norm(near?.textContent || '');
      })();
      const hay = `${id} ${nm} ${lbl}`;
      if (/conjoint|epoux|epouse|partenaire/.test(hay) && /(naiss|date)/.test(hay)) {
        return el;
      }
    }
    return null;
  },

  // Assure l'apparition des champs conjoint avec recalculs ciblés
  ensureConjointFields: async () => {
    // ré-essaye 6 fois: (1) recalc, (2) chercher l'input Conjoint
    for (let i = 0; i < 6; i++) {
      // 1) déclenche un recalcul propre sur le principal
      await SwissLifeFormFiller.triggerRecalcOnPrincipal();

      // 2) essaye de trouver l'input de DOB conjoint
      const direct = document.querySelector('#date-naissance-assure-conjoint');
      const fallback = SwissLifeFormFiller.findConjointDOBInput();
      const el = direct || fallback;

      if (el) {
        return el; // prêt
      }
      await new Promise(r => setTimeout(r, 400)); // on patiente un peu entre deux tentatives
    }
    return null;
  },

  // Déclencher un seul recalcul à la fin
  triggerSingleRecalc: () => {
    const { q } = SwissLifeFormFiller.getDOMHelpers();
    // on privilégie la date de naissance principal (celle qui lance le bon workflow)
    const el = q('#date-naissance-assure-principal') || q('#contratSante-dateEffet');
    if (!el) return;
    el.focus();
    // petit délai pour s'assurer que tout est en place
    setTimeout(() => el.blur(), 80);
  },

  // Fonction principale de remplissage - LEGACY (utilise maintenant le runner)
  fillFormComplete: async (leadData) => {
    SwissLifeAPI.info('🔄 Début du remplissage dans l\'iframe (via runner)', { project: leadData.projetNom });

    // Validation des données d'entrée
    const validation = SwissLifeAPI.ValidationEngine.validateLeadData(leadData);
    if (!validation.valid) {
      SwissLifeAPI.error('Données de lead invalides', { errors: validation.errors });
      return false;
    }

    try {
      // Utiliser le nouveau runner avec le plugin swisslife-sante
      const success = await SwissLifeAPI.runPlugin('swisslife-sante', leadData);
      
      if (success) {
        SwissLifeAPI.info('✅ Remplissage terminé avec succès via runner');
        return true;
      } else {
        throw new Error('Le runner a échoué');
      }
    } catch (error) {
      SwissLifeAPI.error('❌ Erreur lors du remplissage via runner, fallback vers méthode legacy', { error: error.message });
      
      // Fallback vers l'ancienne méthode
      return SwissLifeFormFiller.fillFormCompleteLegacy(leadData);
    }
  },

  // Ancienne méthode de remplissage (conservée en fallback)
  fillFormCompleteLegacy: async (leadData) => {
    SwissLifeAPI.warn('🔄 Utilisation de la méthode legacy pour le remplissage');

    // Assurer que les sélecteurs JSON sont disponibles
    await SwissLifeFormFiller.ensureSelectorsLoaded();
    
    try {
      // 0) Projet et portées (immédiat)
      SwissLifeFormFiller.fillProjectSection(leadData);
      
      // Petit délai pour laisser le DOM se stabiliser
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 1) Assuré principal (avec attente async des professions)
      await SwissLifeFormFiller.fillMainInsured(leadData);
      
      // 2) Enfants (avec délai)
      await new Promise(resolve => setTimeout(resolve, 200));
      SwissLifeFormFiller.fillChildren(leadData);
      
      // 🔴 NOUVEAU : si couple, on déclenche un recalc pour faire "naître" le conjoint
      if (leadData.simulationType === 'couple') {
        await SwissLifeFormFiller.triggerRecalcOnPrincipal();
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      
      // 3) Conjoint (avec attente async des champs)
      await new Promise(resolve => setTimeout(resolve, 200));
      await SwissLifeFormFiller.fillSpouse(leadData);
      
      // 4) Gamme et options (avec délai)
      await new Promise(resolve => setTimeout(resolve, 300));
      SwissLifeFormFiller.fillProductAndOptions(leadData);
      
      // 5) Finalisation
      await new Promise(resolve => setTimeout(resolve, 120));  // petite respiration
      SwissLifeFormFiller.triggerSingleRecalc();               // ⬅️ un seul blur global
      await new Promise(resolve => setTimeout(resolve, 400));  // laisse le serveur répondre
      console.log('✅ Remplissage terminé dans l\'iframe:', leadData.projetNom);
      SwissLifeAPI.info(`Formulaire rempli avec succès: ${leadData.projetNom}`);
      
    } catch (error) {
      console.error('❌ Erreur pendant le remplissage:', error);
      SwissLifeAPI.error(`Erreur remplissage: ${error.message}`);
      
      // Tentative de récupération avec les anciennes méthodes
      console.log('🔄 Tentative de récupération avec délais fixes...');
      SwissLifeFormFiller.fillFormCompleteFallback(leadData);
    }
  },

  // Méthode de fallback avec les anciens délais fixes
  fillFormCompleteFallback: (leadData) => {
    setTimeout(() => {
      SwissLifeFormFiller.setSelectByText('#profession-assure-principal', leadData.profTexte);
    }, 800);
    
    setTimeout(() => {
      if (leadData.conjointDOB) {
        SwissLifeFormFiller.setInputValue('#date-naissance-assure-conjoint', leadData.conjointDOB, { blur: false });
        SwissLifeFormFiller.setSelectByText('#statut-assure-conjoint', leadData.statutTexte);
      }
    }, 1200);
    
    setTimeout(() => {
      SwissLifeFormFiller.triggerSingleRecalc();  // Un seul blur à la fin
    }, 1600);
    
    setTimeout(() => {
      console.log('✅ Remplissage de récupération terminé');
    }, 1800);
  },

  // Listener pour les messages postMessage
  setupMessageListener: () => {
    window.addEventListener('message', (event) => {
      if (!event.data || event.data.type !== 'SL_EXT_FILL') return;
      
      console.log('📥 Message reçu dans iframe:', event.data.payload.projetNom);
      SwissLifeFormFiller.fillFormComplete(event.data.payload);
    });
    
    console.log('🎧 Iframe prête à recevoir les messages de remplissage');
  }
};