/*
==============================================================================
                          📝 SECTION 1: NOM DU PROJET
==============================================================================
*/

// ==== SLS1 - Nom du projet (champ seul) ====
// À coller dans la console DU FRAME qui contient le formulaire SwissLife (oav-pool2…)

(() => {
    const T = s => (s||"").toString().replace(/\s+/g," ").trim();
    const q = sel => { try { return document.querySelector(sel); } catch { return null; } };
    const qa = sel => { try { return [...document.querySelectorAll(sel)]; } catch { return []; } };
    const vis = el => !!el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const fire = (el, type) => el && el.dispatchEvent(new Event(type, { bubbles: true }));
  
    // Trouve la zone portant un libellé "Nom du projet"
    const findZoneByLabel = (labelRegex) => {
      const nodes = qa("label, legend, h1, h2, h3, .label, [role='label'], .form-group, .row, .col, section, fieldset, .panel, .card, div, span");
      let best=null, bestScore=1e9;
      for (const n of nodes) {
        const txt = T(n.innerText||"");
        if (!txt || !labelRegex.test(txt)) continue;
        const score = (n.matches("label,legend,h1,h2,h3")?0:3) + (txt.length>120?2:0);
        if (score < bestScore) { best=n; bestScore=score; }
      }
      return best;
    };
  
    // Localisation robuste du champ "Nom du projet"
    function findNomProjetInput() {
      // 1) id connu (vu dans tes exports)
      const direct = q("#nom-projet");
      if (direct) return direct;
  
      // 2) chercher une carte/section contenant "Votre nom de projet"
      const card = qa("section, fieldset, .panel, .card, .box, .bloc, div")
        .find(n => /votre\s+nom\s+de\s+projet/i.test(T(n.innerText||"")));
      if (card) {
        const inp = card.querySelector("input[type='text']") || card.querySelector("input");
        if (inp) return inp;
      }
  
      // 3) libellé générique
      const zone = findZoneByLabel(/nom.*projet/i);
      if (zone) {
        const inp = zone.querySelector("input[type='text']") || zone.querySelector("input");
        if (inp) return inp;
        const sibling = zone.nextElementSibling?.querySelector?.("input, textarea");
        if (sibling) return sibling;
      }
  
      // 4) fallback très prudent : meilleur input texte visible du 1er écran
      const fallback = qa("input[type='text']").find(el => vis(el));
      return fallback || null;
    }
  
    function setNomProjet(value) {
      const el = findNomProjetInput();
      if (!el) return { ok:false, reason:"element_not_found", hint:"Vérifie que tu es BIEN dans le frame oav-pool2… et que la section 'Nom du projet' est visible." };
      if (!vis(el)) return { ok:false, reason:"hidden", hint:"Déplie/affiche la section contenant 'Nom du projet'." };
      if (el.disabled || el.readOnly) return { ok:false, reason:"disabled_or_readonly", hint:"Le champ semble verrouillé par une autre saisie (ex: type). Renseigne le reste puis réessaie." };
  
      try {
        el.focus();
        el.value = value;
        fire(el,"input"); fire(el,"change"); fire(el,"blur");
        return { ok:true };
      } catch(e) {
        return { ok:false, reason:"exception", detail:String(e) };
      }
    }
  
    function readNomProjet() {
      const el = findNomProjetInput();
      if (!el) return null;
      return el.value ?? "";
    }
  
    function checkNomProjet(expected) {
      const got = readNomProjet();
      const ok  = (got !== null) && (T(got) === T(expected));
      const res = { champ:"projet.nom", ok, got, expected };
      console.table([res]);
      return res;
    }
  
    function diagnoseNomProjet(expected) {
      const el = findNomProjetInput();
      const got = el ? (el.value ?? "") : null;
  
      if (!el) return {
        champ: "projet.nom",
        got, expected,
        why: "Champ introuvable. Tu n’es peut-être pas dans le BON frame (oav-pool2…), ou la section n’est pas chargée/visible."
      };
      if (!vis(el)) return {
        champ: "projet.nom",
        got, expected,
        why: "Champ présent mais MASQUÉ. Ouvre/affiche la section contenant « Nom du projet »."
      };
      if (el.disabled || el.readOnly) return {
        champ: "projet.nom",
        got, expected,
        why: "Champ désactivé/readonly. Le site bloque la saisie (choix conditionnel manquant)."
      };
      if (T(got) !== T(expected)) return {
        champ: "projet.nom",
        got, expected,
        why: "La valeur n’a pas été appliquée correctement (masque/événement). Essaie de cliquer dans le champ, retaper, puis sortir du champ."
      };
      return { champ:"projet.nom", got, expected, why:"OK" };
    }
  
    // Expose petite API
    window.SLS1 = window.SLS1 || {};
    window.SLS1.nomProjet = {
      set: setNomProjet,
      read: readNomProjet,
      check: checkNomProjet,
      diagnose: diagnoseNomProjet
    };
  
    console.log("✅ SLS1.nomProjet prêt. Exemples :\nSLS1.nomProjet.set('Projet Boulangerie 001');\nSLS1.nomProjet.check('Projet Boulangerie 001');\nSLS1.nomProjet.diagnose('Projet Boulangerie 001');");
  })();
  
  

/*
==============================================================================
            🏥 SECTION 2: CONFORT HOSPITALISATION (INDEMNITÉS JOURNALIÈRES)
==============================================================================
*/

  // ==== SLS3 — Vérif précise IJ (Confort Hospitalisation) + sondes ====
  // Cible exacte : #projet-confort-hospitalisation-oui / -non
  
  (() => {
    const ID_OUI = 'projet-confort-hospitalisation-oui';
    const ID_NON = 'projet-confort-hospitalisation-non';
  
    // ---------- utils ----------
    const T = s => (s||"").toString().replace(/\s+/g," ").trim();
    const q  = sel => { try { return document.querySelector(sel); } catch { return null; } };
    const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
    const isVisible = (el) => {
      if (!el || !el.isConnected) return false;
      let p = el;
      while (p) {
        if (p.hidden || p.getAttribute?.('aria-hidden')==='true') return false;
        const st = getComputedStyle(p);
        if (st.display==='none' || st.visibility==='hidden' || st.opacity==='0') return false;
        p = p.parentElement;
      }
      const r = el.getBoundingClientRect();
      return (r.width>0 && r.height>0);
    };
    async function waitStable({minQuiet=300, maxWait=5000}={}) {
      let last = Date.now();
      const mo = new MutationObserver(()=>{ last = Date.now(); });
      mo.observe(document.body, {subtree:true, childList:true, attributes:true});
      const start = Date.now();
      while (Date.now()-start < maxWait) {
        if (Date.now()-last >= minQuiet) { mo.disconnect(); return true; }
        await wait(80);
      }
      mo.disconnect();
      return false;
    }
  
    // ---------- état “Santé” (onglet/CTA/zone) ----------
    function nodeNavSante(){ return q('#link-nav-sante'); }
    function navSanteEnabled(){
      const n = nodeNavSante(); if (!n) return null;
      return !/\bdesactive\b/.test(n.className||'');
    }
    function ctaSante(){ // CTA “Proposez Swiss Life Santé” (texte variable)
      const candidates = [...document.querySelectorAll('a,button,[role="button"]')];
      return candidates.find(n => /proposez\s*swiss\s*life\s*sant[ée]/i.test(n.innerText||''));
    }
  
    // ---------- lecture exacte IJ ----------
    function readIJExact() {
      const inOui = document.getElementById(ID_OUI);
      const inNon = document.getElementById(ID_NON);
      const labOui = inOui ? document.querySelector(`label[for="${CSS.escape(ID_OUI)}"]`) : null;
      const labNon = inNon ? document.querySelector(`label[for="${CSS.escape(ID_NON)}"]`) : null;
      const any = inOui || inNon;
  
      let value = null;
      if (inOui?.checked) value = 'oui';
      if (inNon?.checked) value = 'non';
  
      return {
        present: !!any,
        radios: {
          oui: { present: !!inOui, visible: isVisible(inOui||labOui), disabled: !!(inOui?.disabled), id: ID_OUI },
          non: { present: !!inNon, visible: isVisible(inNon||labNon), disabled: !!(inNon?.disabled), id: ID_NON }
        },
        value,
        sante: {
          navEnabled: navSanteEnabled(),         // true|false|null (pas d’onglet)
          ctaVisible: !!(ctaSante() && isVisible(ctaSante()))
        }
      };
    }
  
    // ---------- sondes (événements + réseau), à déclencher AVANT ton clic manuel ----------
    function installProbes() {
      // log structure
      const bag = { ev: [], net: [], start: Date.now() };
  
      // listen radios + labels
      const inOui = document.getElementById(ID_OUI);
      const inNon = document.getElementById(ID_NON);
      const labOui = inOui ? document.querySelector(`label[for="${CSS.escape(ID_OUI)}"]`) : null;
      const labNon = inNon ? document.querySelector(`label[for="${CSS.escape(ID_NON)}"]`) : null;
      const targets = [inOui, inNon, labOui, labNon].filter(Boolean);
  
      const evTypes = ['pointerdown','mousedown','mouseup','click','input','change'];
      const handler = (e) => {
        bag.ev.push({
          t: Date.now()-bag.start,
          type: e.type,
          targetId: e.target.id || null,
          targetTag: e.target.tagName?.toLowerCase() || null
        });
      };
      targets.forEach(el => evTypes.forEach(t => el.addEventListener(t, handler, { capture:true })));
  
      // network probe
      const origFetch = window.fetch;
      window.fetch = async function(input, init={}) {
        let url = ""; try { url = (input?.url || input || "").toString(); } catch {}
        bag.net.push({ kind:'fetch', url, t: Date.now()-bag.start, method:(init.method||'GET') });
        const res = await origFetch.apply(this, arguments);
        bag.net.push({ kind:'fetch:resp', url: res.url, status: res.status, t: Date.now()-bag.start });
        return res;
      };
      const XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(m,u){ this.__m=m; this.__u=u; return XO.apply(this, arguments); };
      XMLHttpRequest.prototype.send = function(b){ bag.net.push({kind:'xhr',   method:this.__m, url:this.__u, t: Date.now()-bag.start}); this.addEventListener('load',()=>bag.net.push({kind:'xhr:resp',url:this.responseURL||this.__u,status:this.status,t:Date.now()-bag.start})); return XS.apply(this, arguments); };
  
      // expose reader
      window.SLS3Probe = {
        read() {
          const s = readIJExact();
          return { state: s, events: bag.ev.slice(-50), net: bag.net.slice(-20) };
        }
      };
      return true;
    }
  
    // ---------- test automatique : cliquer NON (séquence “réaliste”) ----------
    async function tryClickNon() {
      const inNon = document.getElementById(ID_NON);
      const labNon = inNon ? document.querySelector(`label[for="${CSS.escape(ID_NON)}"]`) : null;
      const before = readIJExact();
  
      if (!inNon) return { ok:false, reason:'no_input', before };
      const target = (labNon && isVisible(labNon)) ? labNon : inNon;
  
      // séquence d’événements proche d’un clic utilisateur
      const mk = (type) => new MouseEvent(type, { bubbles:true, cancelable:true, view:window });
      target.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}));
      target.dispatchEvent(mk('mousedown'));
      target.dispatchEvent(mk('mouseup'));
      target.dispatchEvent(mk('click'));
  
      await wait(60);
      await waitStable({minQuiet:400, maxWait:6000});
  
      const after = readIJExact();
      return {
        ok: after.value === 'non',
        before, after
      };
    }
  
    // ---------- API ----------
    window.SLS3 = {
      state: readIJExact,       // lecture immédiate sans rien toucher
      installProbes,            // installe les sondes (ensuite clique toi-même)
      tryClickNon               // ESSAI (clic NON + attente stabilité)
    };
  
    console.log("✅ SLS3 prêt. Exemples :\nSLS3.state();\nSLS3.installProbes(); // puis clique manuellement sur \"non\"\nSLS3Probe.read();     // lire événements + réseau\nawait SLS3.tryClickNon(); // test auto non intrusif");
  })();
  
  
  
  
  
  
/*
==============================================================================
                    👥 SECTION 3: TYPE DE SIMULATION
==============================================================================
*/

  // ==== SLS1 - Type de simulation (Individuel / Pour le couple) ====
  // A coller dans l’iFrame tarificateur (oav-pool2…)
  
  (() => {
    const T = s => (s||"").toString().replace(/\s+/g," ").trim();
    const q  = sel => { try { return document.querySelector(sel); } catch { return null; } };
    const qa = sel => { try { return [...document.querySelectorAll(sel)]; } catch { return []; } };
    const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
    const isVisible = (el) => {
      if (!el || !el.isConnected) return false;
      let p = el;
      while (p) {
        if (p.hidden || p.getAttribute?.('aria-hidden')==='true') return false;
        const st = getComputedStyle(p);
        if (st.display==='none' || st.visibility==='hidden' || st.opacity==='0') return false;
        p = p.parentElement;
      }
      const r = el.getBoundingClientRect();
      return (r.width>0 && r.height>0);
    };
    async function waitStable({minQuiet=300, maxWait=5000}={}) {
      let last = Date.now();
      const mo = new MutationObserver(()=>{ last = Date.now(); });
      mo.observe(document.body, {subtree:true, childList:true, attributes:true});
      const start = Date.now();
      while (Date.now()-start < maxWait) {
        if (Date.now()-last >= minQuiet) { mo.disconnect(); return true; }
        await wait(80);
      }
      mo.disconnect(); return false;
    }
    const norm = (v) => {
      const s = T(v).toLowerCase();
      if (/couple/.test(s)) return "couple";
      if (/pour\s+le\s+couple/.test(s)) return "couple";
      return "individuel"; // défaut
    };
  
    // --- Recherche du groupe "Type de simulation" ---
    // 1) radios avec labels "Individuel" ET ("Couple" ou "Pour le couple")
    function findRadioGroup() {
      const radios = qa('input[type="radio"][name]');
      const byName = new Map();
      for (const r of radios) {
        const name = r.name;
        (byName.get(name) || byName.set(name, []).get(name)).push(r);
      }
      for (const [name, list] of byName.entries()) {
        const labels = list.map(r => {
          const lab = r.id ? q(`label[for="${CSS.escape(r.id)}"]`) : r.closest("label");
          return T((lab?.innerText) || r.value || "");
        }).map(s => s.toLowerCase());
        const hasIndiv  = labels.some(t => /individu/.test(t));
        const hasCouple = labels.some(t => /(couple|pour\s+le\s+couple)/.test(t));
        if (hasIndiv && hasCouple) {
          // vérifier visibilité d’au moins un
          if (list.some(r => isVisible(r) || isVisible(r.id && q(`label[for="${CSS.escape(r.id)}"]`)))) {
            return { name, inputs: list };
          }
        }
      }
      return null;
    }
  
    // 2) select voisin d’un libellé “Type de simulation / Individuel / Pour le couple”
    function findSelectVariant() {
      // heuristique : chercher un libellé contenant les mots-clés
      const nodes = qa("label, legend, h1, h2, h3, .label, [role='label'], .form-group, .row, .col, section, fieldset, .panel, .card, div, span");
      for (const n of nodes) {
        const txt = T(n.innerText||"").toLowerCase();
        if (!txt) continue;
        if (/type.*simulation/.test(txt) || (/individu/.test(txt) && /couple/.test(txt))) {
          const sel = n.querySelector?.("select") || n.nextElementSibling?.querySelector?.("select");
          if (sel && isVisible(sel)) return sel;
        }
      }
      // fallback : premier select dont les options contiennent Individuel/Couple
      const sels = qa("select");
      for (const s of sels) {
        const texts = [...s.options].map(o => T(o.textContent||"").toLowerCase());
        if (texts.some(t=>/individu/.test(t)) && texts.some(t=>/couple/.test(t)) && isVisible(s)) return s;
      }
      return null;
    }
  
    function readFromRadio(grp) {
      const checked = grp.inputs.find(r => r.checked);
      if (!checked) return null;
      const lab = checked.id ? q(`label[for="${CSS.escape(checked.id)}"]`) : checked.closest("label");
      const txt = T((lab?.innerText) || checked.value || "");
      return norm(txt);
    }
    function readFromSelect(sel) {
      const opt = sel.selectedOptions?.[0] || sel.options?.[sel.selectedIndex];
      const txt = T(opt?.text || sel.value || "");
      return norm(txt);
    }
  
    function readSimulation() {
      const grp = findRadioGroup();
      if (grp) return readFromRadio(grp);
      const sel = findSelectVariant();
      if (sel) return readFromSelect(sel);
      return null;
    }
  
    // --- SET (radios : clic réaliste / select : assignation + events) ---
    async function setSimulation(value /* 'individuel' | 'couple' */) {
      const want = norm(value);
      const grp = findRadioGroup();
      if (grp) {
        // choisir le bouton correspondant
        const target = grp.inputs.find(r => {
          const lab = r.id ? q(`label[for="${CSS.escape(r.id)}"]`) : r.closest("label");
          const txt = T((lab?.innerText) || r.value || "").toLowerCase();
          return (want === "individuel") ? /individu/.test(txt) : /(couple|pour\s+le\s+couple)/.test(txt);
        });
        if (!target) return { ok:false, reason:"radio_option_not_found" };
        const clickable = target.id ? q(`label[for="${CSS.escape(target.id)}"]`) : target;
        if (!isVisible(clickable)) return { ok:false, reason:"hidden", hint:"La section semble repliée/inactive." };
  
        // séquence de clic “humaine” sur le label/input
        const mk = (type) => new MouseEvent(type, { bubbles:true, cancelable:true, view:window });
        clickable.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}));
        clickable.dispatchEvent(mk('mousedown'));
        clickable.dispatchEvent(mk('mouseup'));
        clickable.dispatchEvent(mk('click'));
  
        await wait(80);
        await waitStable({minQuiet:350, maxWait:5000});
        return { ok: readSimulation() === want };
      }
  
      const sel = findSelectVariant();
      if (sel) {
        // essaye par texte d’abord, sinon par value
        const opts = [...sel.options];
        let idx = opts.findIndex(o => norm(T(o.text)) === want);
        if (idx < 0) idx = opts.findIndex(o => norm(o.value||"") === want);
        if (idx < 0) return { ok:false, reason:"select_option_not_found", options: opts.map(o=>T(o.text)||o.value) };
  
        sel.selectedIndex = idx;
        sel.dispatchEvent(new Event("input", {bubbles:true}));
        sel.dispatchEvent(new Event("change",{bubbles:true}));
        await wait(50);
        await waitStable({minQuiet:250, maxWait:4000});
        return { ok: readSimulation() === want };
      }
  
      return { ok:false, reason:"control_not_found", hint:"Ni radios, ni select détecté (vérifie la section/onglet)." };
    }
  
    function checkSimulation(expected) {
      const got = readSimulation();
      const ok  = T(got) === T(norm(expected));
      const res = { champ: "simulation.type", ok, got, expected: norm(expected) };
      console.table([res]);
      return res;
    }
  
    function diagnoseSimulation(expected) {
      const want = norm(expected);
      const grp = findRadioGroup();
      if (!grp) {
        const sel = findSelectVariant();
        if (!sel) return { champ:"simulation.type", got:null, expected: want, why:"Aucun contrôle trouvé (radios/select). Ouvre/active la section correspondante." };
        // select présent
        const opts = [...sel.options].map(o=>T(o.text)||o.value);
        const got = readFromSelect(sel);
        if (!opts.some(o=>norm(o)===want)) return { champ:"simulation.type", got, expected: want, options: opts, why:"Option attendue absente dans le select." };
        if (!isVisible(sel)) return { champ:"simulation.type", got, expected: want, why:"Select présent mais masqué." };
        return { champ:"simulation.type", got, expected: want, why: (T(got)===T(want) ? "OK" : "Valeur différente après changement") };
      }
      // radios présents
      const got = readFromRadio(grp);
      const labels = grp.inputs.map(r => {
        const lab = r.id ? q(`label[for="${CSS.escape(r.id)}"]`) : r.closest("label");
        return T((lab?.innerText)||r.value||"");
      });
      if (!labels.some(l=>/(individu)/i.test(l)) || !labels.some(l=>/(couple|pour\s+le\s+couple)/i.test(l)))
        return { champ:"simulation.type", got, expected: want, options: labels, why:"Le groupe radio ne correspond pas (libellés inattendus)." };
      const visOk = grp.inputs.some(r => isVisible(r) || isVisible(r.id && q(`label[for="${CSS.escape(r.id)}"]`)));
      if (!visOk) return { champ:"simulation.type", got, expected: want, options: labels, why:"Groupe radio masqué (onglet/section repliés)." };
      if (T(got) !== T(want)) return { champ:"simulation.type", got, expected: want, options: labels, why:"Valeur non appliquée (écouteurs custom). Réessaie le set()." };
      return { champ:"simulation.type", got, expected: want, why:"OK" };
    }
  
    // Expose
    window.SLS1 = window.SLS1 || {};
    window.SLS1.simulationType = { set: setSimulation, read: readSimulation, check: checkSimulation, diagnose: diagnoseSimulation };
  
    console.log("✅ SLS1.simulationType prêt. Exemples :\nawait SLS1.simulationType.set('individuel');\nSLS1.simulationType.check('individuel');\nSLS1.simulationType.diagnose('individuel');");
  })();
  

  
/*
==============================================================================
                      👤 SECTION 4: ASSURÉ PRINCIPAL
==============================================================================
*/

  // ===== SLS_AP_FILL — Assuré Principal : Vérifier → Remplir → Vérifier/Diagnostiquer =====
  // A coller dans la CONSOLE du frame tarificateur (oav-pool2…)
  
  /*** 1) Paramètres à AJUSTER ICI ***/
  const CONFIG = {
    dateNaissance: "03/01/1980",     // JJ/MM/AAAA
    departement:   "75",             // "01"…"95" ou "2A"/"2B"
    regimeSocial:  "TNS",            // voir ENUMS.regimeSocial.accept
    statut:        "TNS",            // voir ENUMS.statut.accept (pour l’assuré principal : souvent "TNS" ou "RETRAITE")
    profession:    "AUTRE"           // optionnel : sera ignoré si le sélect n’a pas d’options
  };
  
  // Valeurs “propres” connues (synonymes pris en charge, accents ignorés)
  const ENUMS = {
    regimeSocial: {
      accept: [
        "SECURITE_SOCIALE",
        "SECURITE_SOCIALE_ALSACE_MOSELLE",
        "TNS",
        "AMEXA",
        "AUTRES_REGIME_SPECIAUX"
      ],
      alias: {
        "securite sociale": "SECURITE_SOCIALE",
        "rg cpam": "SECURITE_SOCIALE",
        "alsace moselle": "SECURITE_SOCIALE_ALSACE_MOSELLE",
        "tns": "TNS",
        "amexa": "AMEXA",
        "autres": "AUTRES_REGIME_SPECIAUX",
        "autres regime speciaux": "AUTRES_REGIME_SPECIAUX"
      }
    },
    // Pour l’assuré principal, on a observé "TNS" et "RETRAITE". On laisse plus large (selon contextes).
    statut: {
      accept: [
        "TNS","RETRAITE","SALARIE","SALARIE_AGRICOLE","EXPLOITANT_AGRICOLE",
        "ETUDIANT","RETRAITE_ANCIEN_SALARIE","RETRAITE_ANCIEN_EXPLOITANT",
        "TRAVAILLEUR_TRANSFRONTALIER","FONCTIONNAIRE"
      ],
      alias: {
        "travailleur non salarie": "TNS",
        "retraite": "RETRAITE",
        "salarie": "SALARIE",
        "etudiant": "ETUDIANT",
        "fonctionnaire": "FONCTIONNAIRE"
      }
    },
    profession: {
      // Sera peuplé dynamiquement par le site après choix RS/statut, mais on documente les valeurs courantes :
      known: ["MEDECIN","CHIRURGIEN","CHIRURGIEN_DENTISTE","PHARMACIEN","AUXILIAIRE_MEDICAL","AUTRE"],
      alias: {
        "non medicale":"AUTRE",
        "autre":"AUTRE",
        "auxiliaire medical":"AUXILIAIRE_MEDICAL",
        "chirurgien dentiste":"CHIRURGIEN_DENTISTE"
      }
    }
  };
  
  /*** 2) Utils ***/
  (() => {
    const T = s => (s||"").toString().replace(/\s+/g," ").trim();
    const norm = s => T(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const q  = sel => { try { return document.querySelector(sel); } catch { return null; } };
    const qa = sel => { try { return [...document.querySelectorAll(sel)]; } catch { return []; } };
    const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
  
    const isVisible = (el) => {
      if (!el || !el.isConnected) return false;
      let p = el;
      while (p) {
        if (p.hidden || p.getAttribute?.('aria-hidden')==='true') return false;
        const st = getComputedStyle(p);
        if (st.display==='none' || st.visibility==='hidden' || st.opacity==='0') return false;
        p = p.parentElement;
      }
      const r = el.getBoundingClientRect();
      return (r.width>0 && r.height>0);
    };
  
    const hiddenReason = (el) => {
      if (!el || !el.isConnected) return {where:"detached", why:"hors DOM"};
      let p = el;
      while (p) {
        const st = getComputedStyle(p);
        if (p.hidden) return {tag:p.tagName?.toLowerCase(), id:p.id||null, cls:p.className||null, why:"hidden attr"};
        if (p.getAttribute && p.getAttribute('aria-hidden')==='true') return {tag:p.tagName?.toLowerCase(), id:p.id||null, cls:p.className||null, why:"aria-hidden"};
        if (st.display==='none') return {tag:p.tagName?.toLowerCase(), id:p.id||null, cls:p.className||null, why:"display:none"};
        if (st.visibility==='hidden') return {tag:p.tagName?.toLowerCase(), id:p.id||null, cls:p.className||null, why:"visibility:hidden"};
        if (st.opacity==='0') return {tag:p.tagName?.toLowerCase(), id:p.id||null, cls:p.className||null, why:"opacity:0"};
        p = p.parentElement;
      }
      return null;
    };
  
    const highlight = (el) => {
      if (!el) return;
      const prev = el.style.outline;
      el.scrollIntoView?.({block:'center'});
      el.style.outline = '3px solid #ff0066';
      setTimeout(()=>{ el.style.outline = prev; }, 800);
    };
  
    const fire = (el, type) => el && el.dispatchEvent(new Event(type, { bubbles:true }));
    const typeLikeHuman = async (el, text) => {
      el.focus(); el.value = ""; fire(el,"input");
      for (const ch of String(text)) {
        el.value += ch;
        fire(el,"input");
        await wait(10);
      }
      fire(el,"change"); fire(el,"blur");
    };
  
    /*** 3) Localisation des champs (IDs connus + libellé voisin + heuristiques) ***/
    const KNOWN = {
      dateNaissance: ['#date-naissance-assure-principal'],
      regimeSocial:  ['#regime-social-assure-principal'],
      statut:        ['#statut-assure-principal'],
      profession:    ['#profession-assure-principal'],
      // le département est parfois un select “codes FR” ; on essaie plusieurs ids + heuristique
      departement:   ['#departement-assure-principal', '#departement', '#departement-residence']
    };
  
    function findByLabelLike(re) {
      const nodes = qa("label, legend, .label, [role='label'], h1,h2,h3,h4, .form-group, .row, .col, section, fieldset, .panel, .card, div, span");
      for (const n of nodes) {
        const txt = T(n.innerText||"");
        if (!txt || !re.test(txt)) continue;
        const ctrl = n.querySelector?.("input,select,textarea") || n.nextElementSibling?.querySelector?.("input,select,textarea");
        if (ctrl) return ctrl;
      }
      return null;
    }
  
    const findFirstExisting = (arr) => (arr||[]).map(s=>q(s)).find(Boolean) || null;
  
    function find_dateNaissance(){
      return findFirstExisting(KNOWN.dateNaissance) || findByLabelLike(/date.*naiss/i);
    }
    function find_regimeSocial(){
      return findFirstExisting(KNOWN.regimeSocial)  || findByLabelLike(/r[ée]gime.*social/i);
    }
    function find_statut(){
      return findFirstExisting(KNOWN.statut)        || findByLabelLike(/statut|situation/i);
    }
    function find_profession(){
      return findFirstExisting(KNOWN.profession)    || findByLabelLike(/profession|csp/i);
    }
    function find_departement(){
      let el = findFirstExisting(KNOWN.departement) || findByLabelLike(/d[ée]partement.*r[ée]siden/i);
      if (!el) {
        const sels = qa("select");
        el = sels.find(s=>{
          const vals = [...s.options].slice(0,80).map(o=>T(o.value||o.text||""));
          return vals.some(v=>/^\d{2}$/.test(v) || /^(2A|2B)$/i.test(v));
        }) || null;
      }
      return el;
    }
  
    /*** 4) Normalisation & choix d’option ***/
    const aliasResolve = (domain, wanted) => {
      const s = norm(wanted);
      const d = ENUMS[domain];
      if (!d) return wanted;
      for (const [k,v] of Object.entries(d.alias||{})) {
        if (norm(k)===s) return v;
      }
      // si l’utilisateur donne déjà une valeur canonique acceptée
      if ((d.accept||d.known||[]).some(x=>norm(x)===s)) return wanted;
      return wanted;
    };
  
    const pickSelect = (sel, wantedRaw) => {
      if (!sel || sel.tagName!=='SELECT') return {ok:false, reason:"no_select"};
      const wanted = T(wantedRaw);
      const wNorm = norm(wanted);
      const opts = [...sel.options];
      // 1) par value exacte (case sens.) puis insensible
      let idx = opts.findIndex(o => T(o.value)===wanted);
      if (idx<0) idx = opts.findIndex(o => norm(o.value)===wNorm);
      // 2) par texte exact puis insensible
      if (idx<0) idx = opts.findIndex(o => T(o.text)===wanted);
      if (idx<0) idx = opts.findIndex(o => norm(o.text)===wNorm);
      // 3) par inclusion (robuste)
      if (idx<0) idx = opts.findIndex(o => norm(o.text).includes(wNorm) || norm(o.value).includes(wNorm));
  
      if (idx<0) {
        return {ok:false, reason:"no_option_match", options: opts.map(o=>({value:o.value, text:T(o.text||"")}))};
      }
      sel.selectedIndex = idx;
      fire(sel,"input"); fire(sel,"change");
      return {ok:true, got:{ value: sel.value, text: T(opts[idx].text||"") }};
    };
  
    const readSelect = (sel) => {
      if (!sel || sel.tagName!=='SELECT') return null;
      const opt = sel.selectedOptions?.[0] || sel.options?.[sel.selectedIndex];
      return { value: sel.value ?? "", text: T(opt?.text||"") };
    };
  
    /*** 5) Ready (scan) ***/
    function scanOne(key, el){
      const out = { champ:key, present: !!el, visible:false, disabled:null, readOnly:null, tag:null, type:null, value:null, hiddenBy:null, el };
      if (!el) return out;
      out.visible = isVisible(el);
      out.disabled= !!el.disabled;
      out.readOnly= !!el.readOnly;
      out.tag     = el.tagName?.toLowerCase()||null;
      out.type    = out.tag==='select' ? 'select' : (el.getAttribute?.('type')||'text').toLowerCase();
      if (out.tag==='select') out.value = readSelect(el);
      else out.value = el.value ?? "";
      if (out.present && !out.visible) out.hiddenBy = hiddenReason(el);
      return out;
    }
  
    function ready(){
      const rows = [
        scanOne('dateNaissance', find_dateNaissance()),
        scanOne('departement',   find_departement()),
        scanOne('regimeSocial',  find_regimeSocial()),
        scanOne('statut',        find_statut()),
        scanOne('profession',    find_profession())
      ];
      // Ajoute options si select
      rows.forEach(r=>{
        if (r.present && r.tag==='select') {
          r.options = [...(r.el.options||[])].map(o=>({value:o.value, text:T(o.text||"")}));
        }
      });
      console.groupCollapsed("🔎 Ready (Assuré principal)");
      console.table(rows.map(r=>({
        champ:r.champ, present:r.present, visible:r.visible, disabled:r.disabled, readOnly:r.readOnly,
        tag:r.tag, type:r.type, id:r.el?.id||null, name:r.el?.name||null,
        value:r.value
      })));
      console.groupEnd();
      return rows;
    }
  
    /*** 6) Fill séquentiel ***/
    async function fill(cfg){
      const log = [];
      const rows = ready();
      const get = name => rows.find(r=>r.champ===name);
  
      // a) Date de naissance (input)
      {
        const r = get('dateNaissance');
        if (!r?.present || r.disabled || r.readOnly) {
          log.push({champ:'dateNaissance', ok:false, reason:'unreachable'}); 
        } else {
          try {
            await typeLikeHuman(r.el, cfg.dateNaissance);
            const ok = T(r.el.value)===T(cfg.dateNaissance);
            log.push({champ:'dateNaissance', ok, got:r.el.value, expected:cfg.dateNaissance});
          } catch(e){ log.push({champ:'dateNaissance', ok:false, reason:String(e)}); }
        }
      }
  
      // b) Régime social (select)
      {
        const r = get('regimeSocial');
        if (!r?.present || r.disabled || r.readOnly || r.tag!=='select') {
          log.push({champ:'regimeSocial', ok:false, reason:'unreachable_or_not_select'});
        } else {
          const wanted = aliasResolve('regimeSocial', cfg.regimeSocial);
          const rv = pickSelect(r.el, wanted);
          log.push({champ:'regimeSocial', ...rv, expected:wanted});
          await wait(200); // laisser l’UI réagir (peuple parfois d’autres champs)
        }
      }
  
      // c) Statut (select)
      {
        const r = get('statut');
        if (!r?.present || r.disabled || r.readOnly || r.tag!=='select') {
          log.push({champ:'statut', ok:false, reason:'unreachable_or_not_select'});
        } else {
          const wanted = aliasResolve('statut', cfg.statut);
          const rv = pickSelect(r.el, wanted);
          log.push({champ:'statut', ...rv, expected:wanted});
          await wait(300); // laisse charger la Profession potentielle
        }
      }
  
      // d) Profession (select) — peut être VIDE au départ ; on attend son peuplement.
      {
        const r0 = get('profession');
        if (!r0?.present || r0.readOnly || r0.disabled || r0.tag!=='select') {
          log.push({champ:'profession', ok:false, reason:'not_present_or_not_select', note:'champ optionnel — ignoré'});
        } else {
          // attendre que des options significatives arrivent (max ~4s)
          const sel = r0.el;
          let tries=0;
          while (tries++<20) {
            const opts = [...sel.options].map(o=>T(o.text||o.value||"")).filter(Boolean);
            if (opts.length>0 && opts.some(t => t.length>1)) break;
            await wait(200);
          }
          if (cfg.profession!=null) {
            const wanted = aliasResolve('profession', cfg.profession);
            const rv = pickSelect(sel, wanted);
            log.push({champ:'profession', ...rv, expected:wanted});
          } else {
            log.push({champ:'profession', ok:true, skipped:true});
          }
        }
      }
  
      // e) Département (select ou input)
      {
        const r = get('departement');
        if (!r?.present || r.disabled || r.readOnly) {
          log.push({champ:'departement', ok:false, reason:'unreachable'});
        } else if (r.tag==='select') {
          const wanted = String(cfg.departement).toUpperCase().padStart(2,'0').replace(/^0(2[AB])$/i,"$1"); // robustesse
          const rv = pickSelect(r.el, wanted);
          log.push({champ:'departement', ...rv, expected:wanted});
        } else {
          await typeLikeHuman(r.el, cfg.departement);
          const ok = T(r.el.value)===T(cfg.departement);
          log.push({champ:'departement', ok, got:r.el.value, expected:cfg.departement});
        }
      }
  
      console.groupCollapsed("📝 Remplissage — Assuré principal");
      console.table(log);
      console.groupEnd();
      return log;
    }
  
    /*** 7) Check & Diagnose ***/
    function check(cfg){
      const rows = ready(); // relit
      const get = name => rows.find(r=>r.champ===name);
      const out = [];
  
      // date
      { const r=get('dateNaissance'); out.push({champ:'dateNaissance', ok: T(r?.el?.value)===T(cfg.dateNaissance), got:r?.el?.value, expected:cfg.dateNaissance}); }
      // regime
      { const r=get('regimeSocial'); const got = r?.tag==='select' ? readSelect(r.el) : null; out.push({champ:'regimeSocial', ok: !!got && (norm(got.value)===norm(cfg.regimeSocial) || norm(got.text).includes(norm(cfg.regimeSocial))), got, expected:cfg.regimeSocial}); }
      // statut
      { const r=get('statut'); const got = r?.tag==='select' ? readSelect(r.el) : null; out.push({champ:'statut', ok: !!got && (norm(got.value)===norm(cfg.statut) || norm(got.text).includes(norm(cfg.statut))), got, expected:cfg.statut}); }
      // profession
      { const r=get('profession'); const got = r?.tag==='select' ? readSelect(r.el) : (r?.present?null:undefined);
        const exp = cfg.profession ?? "(non renseigné)";
        out.push({champ:'profession', ok: (cfg.profession==null) ? true : (!!got && (norm(got.value)===norm(cfg.profession) || norm(got.text).includes(norm(cfg.profession)))), got, expected:exp});
      }
      // departement
      { const r=get('departement'); 
        if (r?.tag==='select') {
          const got = readSelect(r.el);
          out.push({champ:'departement', ok: !!got && (norm(got.value)===norm(cfg.departement) || norm(got.text)===norm(cfg.departement)), got, expected:cfg.departement});
        } else {
          out.push({champ:'departement', ok: T(r?.el?.value)===T(cfg.departement), got:r?.el?.value, expected:cfg.departement});
        }
      }
  
      console.groupCollapsed("✅ Check — Assuré principal");
      console.table(out);
      console.groupEnd();
      return out;
    }
  
    function diagnose(cfg){
      const ch = check(cfg);
      const why = [];
      for (const r of ch) {
        if (r.ok) continue;
        const base = { champ:r.champ, got:r.got, expected:r.expected };
        if (r.got===undefined) { why.push({...base, why:"Champ introuvable", hint:"Vérifie l’onglet/la section/le frame"}); continue; }
        if (r.got===null)      { why.push({...base, why:"Pas de valeur", hint:"Réessaie le set ; certains champs attendent un évènement 'change'"}); continue; }
        if (r.champ==='profession') {
          why.push({...base, why:"Option non trouvée/encore non chargée", hint:"Le sélect se peuple après le choix du régime/statut. Attends 1–2s puis relance."});
        } else if (r.champ==='departement') {
          why.push({...base, why:"Aucune option ne correspond", hint:"Donne un code '01'..'95' ou '2A'/'2B' ; sinon, choisis par libellé exact."});
        } else if (r.champ==='regimeSocial' || r.champ==='statut') {
          why.push({...base, why:"Option absente dans le select", hint:"Regarde SLS_AP_FILL.ready() → options listées ; ajuste la valeur attendue/alias."});
        } else if (r.champ==='dateNaissance') {
          why.push({...base, why:"Masque de saisie", hint:"Taper au clavier (le script simule déjà). S’assurer du format JJ/MM/AAAA."});
        } else {
          why.push({...base, why:"Valeur différente", hint:"Refaire fill(); s’il y a une validation côté serveur, attendre la fin de chargement."});
        }
      }
      console.groupCollapsed("🩺 Diagnose — Assuré principal");
      console.table(why);
      console.groupEnd();
      return why;
    }
  
    /*** 8) Expose API ***/
    window.SLS_AP_FILL = {
      ready,          // état + options
      fill,           // remplissage séquentiel
      check,          // vérification
      diagnose        // explications
    };
  
    console.log("✅ SLS_AP_FILL prêt. Exemples :\nSLS_AP_FILL.ready();\nawait SLS_AP_FILL.fill(CONFIG);\nSLS_AP_FILL.check(CONFIG);\nSLS_AP_FILL.diagnose(CONFIG);");
  })();
  
  
  
/*
==============================================================================
                          👶 SECTION 5: ENFANTS
==============================================================================
*/

  // ===== SLS_ENFANTS3 — rendu forcé des slots + remplissage dates & ayants (tolérant hidden) =====
  (() => {
    // ---------- CONFIG ----------
    const CONFIG = {
      nb: 3,
      enfants: [
        { dateNaissance: "10/02/2015", ayantDroit: "CLIENT" },
        { dateNaissance: "21/09/2018", ayantDroit: "CLIENT" },
        { dateNaissance: "05/07/2022", ayantDroit: "CONJOINT" }
      ],
      // Synonymes pour matcher l’ayant droit par texte si la value diffère
      AYANT_SYNONYMES: {
        CLIENT:   [/assur[ée]\s*principal/i, /titulaire/i],
        CONJOINT: [/conjoint/i, /partenaire/i]
      },
      // Sélecteurs connus chez SwissLife
      NB_SELECT_CANDIDATES: ['#sante-nombre-enfant-assures', '#nb-enfant-moins-20-ans'],
      // Essayer d’ouvrir une section/accordéon “Enfant(s)”
      SECTION_TITLES: [/enfant/i, /ayants?\s*droit/i],
      // Attentes
      STABLE_MIN_QUIET_MS: 350,
      STABLE_MAX_WAIT_MS: 7000,
      // Mode de ciblage des champs enfants : "visible" | "loose"
      MODE: "loose"
    };
  
    // ---------- utils ----------
    const T = s => (s||"").toString().replace(/\s+/g,' ').trim();
    const norm = s => T(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const q  = sel => { try { return document.querySelector(sel); } catch { return null; } };
    const qa = sel => { try { return [...document.querySelectorAll(sel)]; } catch { return []; } };
    const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
  
    const isVisible = (el) => {
      if (!el || !el.isConnected) return false;
      let p = el;
      while (p) {
        if (p.hidden || p.getAttribute?.('aria-hidden')==='true') return false;
        const st = getComputedStyle(p);
        if (st.display==='none' || st.visibility==='hidden' || st.opacity==='0') return false;
        p = p.parentElement;
      }
      const r = el.getBoundingClientRect();
      return (r.width>0 && r.height>0);
    };
  
    async function waitStable({minQuiet=300,maxWait=5000}={}) {
      let last = Date.now();
      const mo = new MutationObserver(()=>{ last = Date.now(); });
      mo.observe(document.body, {subtree:true, childList:true, attributes:true});
      const start = Date.now();
      while (Date.now()-start < maxWait) {
        if (Date.now()-last >= minQuiet) { mo.disconnect(); return true; }
        await wait(80);
      }
      mo.disconnect(); return false;
    }
  
    function overlayPresent() {
      const o = q('.blockUI.blockOverlay, .blockUI.blockMsg');
      if (!o) return false;
      const st = getComputedStyle(o);
      return isVisible(o) || st.opacity!=='0';
    }
    async function waitOverlayGone(timeout=8000) {
      const start = Date.now();
      while (Date.now()-start < timeout) {
        if (!overlayPresent()) return true;
        await wait(80);
      }
      return !overlayPresent();
    }
    function bringIntoView(el) { try { el?.scrollIntoView?.({block:'center'}); } catch {} }
  
    // ---------- helpers events ----------
    function dispatchHumanChange(el) {
      const mkK = (type, key) => new KeyboardEvent(type, {bubbles:true, cancelable:true, key});
      el.dispatchEvent(mkK('keydown', 'ArrowDown'));
      el.dispatchEvent(mkK('keypress',' '));
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      el.dispatchEvent(new Event('blur',{bubbles:true}));
    }
    async function typeMasked(el, text) {
      if (!el) return false;
      bringIntoView(el);
      el.focus();
      el.value = ""; el.dispatchEvent(new Event('input',{bubbles:true}));
      for (const ch of String(text)) {
        el.dispatchEvent(new KeyboardEvent('keydown', {bubbles:true, key: ch}));
        el.value += ch;
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new KeyboardEvent('keyup', {bubbles:true, key: ch}));
        await wait(8);
      }
      el.blur();
      el.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    }
    const readSelect = (sel) => {
      if (!sel || sel.tagName!=='SELECT') return null;
      const opt = sel.selectedOptions?.[0] || sel.options?.[sel.selectedIndex];
      return { value: sel.value ?? "", text: T(opt?.text||"") };
    };
    function setSelectByValueOrText(sel, wanted, synonyms=[]) {
      if (!sel || sel.tagName!=='SELECT') return {ok:false, reason:"no_select"};
      const opts = [...sel.options];
      const wNorm = norm(wanted);
      let idx = opts.findIndex(o => norm(o.value||"")===wNorm);
      if (idx<0) idx = opts.findIndex(o => norm(o.text||"")===wNorm);
      if (idx<0 && synonyms.length) idx = opts.findIndex(o => synonyms.some(rx=>rx.test(o.text||"")));
      if (idx<0) return {ok:false, reason:"option_not_found", options: opts.map(o=>({value:o.value,text:T(o.text||"")}))};
      sel.selectedIndex = idx;
      dispatchHumanChange(sel);
      return {ok:true};
    }
  
    // ---------- ciblages ----------
    function findNbEnfantsSelect() {
      for (const sel of CONFIG.NB_SELECT_CANDIDATES) { const el = q(sel); if (el) return el; }
      // fallback clair : un select avec options 0..10
      const sels = qa("select").filter(s => [...s.options].filter(o=>/^\d{1,2}$/.test(T(o.value||o.text||""))).length>=5);
      return sels[0] || null;
    }
    function expandChildrenSections() {
      const toggles = qa('button, a, .panel-heading, .card-header, [role="button"]')
        .filter(n => CONFIG.SECTION_TITLES.some(rx => rx.test(T(n.innerText||n.textContent||""))));
      toggles.forEach(n => { try { n.click(); } catch {} });
    }
    function findAddChildButtons() {
      return qa('button, a[role="button"], a, input[type="button"], input[type="submit"]')
        .filter(el => /ajouter.*enfant/i.test(T(el.innerText||el.value||"")));
    }
  
    // visible pairs (si l’UI a vraiment rendu)
    function visibleChildPairs() {
      const dateSel = [
        'input[id*="enfant"][id*="naiss"]',
        'input[name*="enfant"][name*="naiss"]',
        'input[id*="enfants"][id*="naiss"]',
        'input[name*="enfants"][name*="naiss"]',
        'input[id*="date-naissance"][id*="enfant"]',
        '#contrat-enfants-0-date-naissance,#contrat-enfants-1-date-naissance,#contrat-enfants-2-date-naissance,#contrat-enfants-3-date-naissance'
      ].join(',');
      const ayantSel = [
        'select[id*="ayant"]',
        'select[name*="ayant"]',
        'select[id*="idAyantDroit"]',
        'select[name*="idAyantDroit"]',
        '#enfants-0-idAyantDroit,#enfants-1-idAyantDroit,#enfants-2-idAyantDroit,#enfants-3-idAyantDroit'
      ].join(',');
      const dates  = qa(dateSel).filter(isVisible);
      const ayants = qa(ayantSel).filter(isVisible);
      // classe par position à l’écran
      const pos = el => (el.getBoundingClientRect().top*10000 + el.getBoundingClientRect().left);
      dates.sort((a,b)=>pos(a)-pos(b));
      ayants.sort((a,b)=>pos(a)-pos(b));
      const n = Math.min(dates.length, ayants.length);
      const out = [];
      for (let i=0;i<n;i++) out.push({ dateEl: dates[i], ayantSel: ayants[i] });
      return out;
    }
  
    // "loose" : on cible par index via patrons d’ID/NAME même si masqué
    function getChildDateEl(i) {
      const cand = [
        `#contrat-enfants-${i}-date-naissance`,
        `[name="contrat.enfants[${i}].dateNaissance"]`,
        `[name="contratSante.enfants[${i}].dateNaissance"]`,
        `input[id*="enfant"][id*="${i}"][id*="naiss"]`,
        `input[name*="enfant"][name*="${i}"][name*="naiss"]`,
      ];
      for (const sel of cand) { const el = q(sel); if (el) return el; }
      return null;
    }
    function getChildAyantSel(i) {
      const cand = [
        `#enfants-${i}-idAyantDroit`,
        `[name="contrat.enfants[${i}].idAyantDroit"]`,
        `[name="contratSante.enfants[${i}].idAyantDroit"]`,
        `select[id*="ayant"][id*="${i}"]`,
        `select[name*="ayant"][name*="${i}"]`,
      ];
      for (const sel of cand) { const el = q(sel); if (el) return el; }
      return null;
    }
    function looseChildPairs(n) {
      const out = [];
      for (let i=0;i<n;i++) out.push({ dateEl: getChildDateEl(i), ayantSel: getChildAyantSel(i), index:i });
      return out;
    }
  
    // ---------- opérations ----------
    async function setNbEnfants(n) {
      const sel = findNbEnfantsSelect();
      if (!sel) return { ok:false, reason:"nb_select_not_found" };
      bringIntoView(sel);
  
      // choisir l’option
      const opts = [...sel.options];
      let idx = opts.findIndex(o=>T(o.value)===String(n));
      if (idx < 0) idx = opts.findIndex(o=>T(o.text)===String(n));
      if (idx < 0) return { ok:false, reason:"nb_value_not_in_options", options: opts.map(o=>T(o.text)||o.value) };
      sel.selectedIndex = idx;
      dispatchHumanChange(sel);
  
      // “réveiller” la zone
      expandChildrenSections();
      const focusable = q('#date-naissance-assure-principal') || q('#contratSante-dateEffet') || qa('input,select,textarea,button')[0];
      try { focusable?.focus(); focusable?.blur(); } catch {}
  
      await wait(120);
      await waitOverlayGone(8000);
      await waitStable({minQuiet:CONFIG.STABLE_MIN_QUIET_MS, maxWait:CONFIG.STABLE_MAX_WAIT_MS});
  
      // si rien de visible → tente clics "Ajouter un enfant"
      let pairs = visibleChildPairs();
      if (pairs.length === 0) {
        const adds = findAddChildButtons();
        for (let i=0; i<Math.min(n, adds.length); i++) {
          bringIntoView(adds[i]);
          adds[i].click();
          await wait(150);
          await waitOverlayGone(8000);
        }
        await waitStable({minQuiet:CONFIG.STABLE_MIN_QUIET_MS, maxWait:CONFIG.STABLE_MAX_WAIT_MS});
        pairs = visibleChildPairs();
      }
  
      return { ok: pairs.length>=1 || CONFIG.MODE==="loose", pairs: pairs.length, after: readSelect(sel) };
    }
  
    function readChildrenVisible() {
      return visibleChildPairs().map(({dateEl,ayantSel}) => ({
        date: dateEl?.value ?? "",
        ayant: readSelect(ayantSel)
      }));
    }
    function readChildrenLoose(n) {
      const res = [];
      for (let i=0;i<n;i++) {
        const d = getChildDateEl(i), a = getChildAyantSel(i);
        res.push({ index:i+1, date: d?.value ?? "", ayant: readSelect(a) });
      }
      return res;
    }
  
    async function fillChildren(cfg=CONFIG) {
      const n = cfg.nb ?? (cfg.enfants?.length||0);
      const ensure = await setNbEnfants(n);
  
      const pairs = (CONFIG.MODE==="visible")
        ? visibleChildPairs()
        : looseChildPairs(n);
  
      const rows = [];
      for (let i=0; i<n; i++) {
        const spec = cfg.enfants[i] || {};
        const pair = pairs[i];
        if (!pair || (!pair.dateEl && !pair.ayantSel)) { rows.push({index:i+1, ok:false, reason:"missing_slot"}); continue; }
  
        let okDate=false, rSel={ok:false};
        if (pair.dateEl) okDate = await typeMasked(pair.dateEl, spec.dateNaissance || "");
        if (pair.ayantSel) {
          const syns = CONFIG.AYANT_SYNONYMES[spec.ayantDroit] || [];
          rSel = setSelectByValueOrText(pair.ayantSel, spec.ayantDroit || "", syns);
        }
        rows.push({
          index: i+1,
          date: { ok: okDate, got: pair.dateEl?.value ?? "", expected: spec.dateNaissance||"" },
          ayant: { ok: !!rSel.ok, got: pair.ayantSel ? readSelect(pair.ayantSel) : null, expected: spec.ayantDroit||"", reason: rSel.ok?null:rSel.reason, options: rSel.ok?undefined:rSel.options }
        });
      }
  
      await wait(120);
      await waitOverlayGone(8000);
      await waitStable({minQuiet:CONFIG.STABLE_MIN_QUIET_MS, maxWait:CONFIG.STABLE_MAX_WAIT_MS});
  
      const readback = (CONFIG.MODE==="visible") ? readChildrenVisible() : readChildrenLoose(n);
      return { ensure, rows, readback };
    }
  
    function checkChildren(cfg=CONFIG) {
      const n = cfg.nb ?? (cfg.enfants?.length||0);
      const got = (CONFIG.MODE==="visible") ? readChildrenVisible() : readChildrenLoose(n);
      const rows = (cfg.enfants||[]).map((spec,i) => {
        const g = got[i] || {};
        const okDate  = T(g.date||"") === T(spec.dateNaissance||"");
        const okAyant = (norm(g.ayant?.value||"")===norm(spec.ayantDroit||"")) ||
                        ((cfg.AYANT_SYNONYMES?.[spec.ayantDroit]||[]).some(rx => rx.test(g.ayant?.text||"")) || false);
        return {
          index: i+1,
          ok: okDate && okAyant,
          date_ok: okDate, date_got: g.date||"", date_expected: spec.dateNaissance||"",
          ayant_ok: okAyant, ayant_got: g.ayant||null, ayant_expected: spec.ayantDroit||""
        };
      });
      console.table(rows);
      return rows;
    }
  
    function diagnoseChildren(cfg=CONFIG) {
      const n = cfg.nb ?? (cfg.enfants?.length||0);
      const vis = visibleChildPairs().length;
      const issues = [];
      if (!findNbEnfantsSelect()) issues.push({what:"nbEnfants", why:"select introuvable"});
      if (vis===0 && CONFIG.MODE==="visible") {
        issues.push({what:"slots", why:`0/${n} slot(s) visibles`, hint:"Active le MODE 'loose' ou clique 'Ajouter un enfant' si présent ; vérifie les sections “Enfant(s)”."});
      }
      if (overlayPresent()) issues.push({what:"overlay", why:"blockUI présent", hint:"attendre fin des appels réseau"});
      return issues;
    }
  
    async function runAll(cfg=CONFIG) {
      console.log("▶️ SLS_ENFANTS3.runAll… (mode:", CONFIG.MODE, ")");
      const fill = await fillChildren(cfg);
      const check = checkChildren(cfg);
      const diag  = diagnoseChildren(cfg);
      console.groupCollapsed("📋 SLS_ENFANTS3 — Résumé");
      console.table([{ mode: CONFIG.MODE, slots_visibles: visibleChildPairs().length, rows_ok: check.filter(r=>r.ok).length + "/" + check.length, diag: diag.length ? `${diag.length} point(s)` : "RAS" }]);
      console.groupEnd();
      return { fill, check, diag };
    }
  
    // expose
    window.SLS_ENFANTS3 = {
      cfg: CONFIG,
      setNb: setNbEnfants,
      fill: fillChildren,
      readVisible: readChildrenVisible,
      readLoose: readChildrenLoose,
      check: checkChildren,
      diagnose: diagnoseChildren,
      runAll
    };
  
    console.log("✅ SLS_ENFANTS3 chargé. Exemples :");
    console.log("SLS_ENFANTS3.cfg.nb = 3;");
    console.log('SLS_ENFANTS3.cfg.enfants = [ {dateNaissance:\"10/02/2015\", ayantDroit:\"CLIENT\"}, {dateNaissance:\"21/09/2018\", ayantDroit:\"CLIENT\"}, {dateNaissance:\"05/07/2022\", ayantDroit:\"CONJOINT\"} ];');
    console.log("SLS_ENFANTS3.cfg.MODE = 'loose'; // 'visible' pour forcer le mode strict");
    console.log("await SLS_ENFANTS3.runAll();");
  })();
  
/*
==============================================================================
                          💑 SECTION 6: CONJOINT
==============================================================================
*/

  // ==== SLS_CONJOINT v1 — Onglet Conjoint + remplissage & vérifications ====
  // A coller dans l’iFrame tarificateur (oav-pool2…)
  
  (() => {
    // ---------- CONFIG : mets tes valeurs ici ----------
    const CFG = {
      dateNaissance: "15/06/1982",
      regimeSocial:  "SECURITE_SOCIALE", // ex: "SECURITE_SOCIALE", "TNS", "AMEXA", "SECURITE_SOCIALE_ALSACE_MOSELLE"…
      statut:        "SALARIE",          // ex: "SALARIE","TNS","ETUDIANT","RETRAITE","FONCTIONNAIRE", etc.
      profession:    null                // ex: "AUTRE" (optionnel, si le champ existe)
    };
  
    // ---------- utils ----------
    const T = s => (s||"").toString().replace(/\s+/g," ").trim();
    const norm = s => T(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const q  = sel => { try { return document.querySelector(sel); } catch { return null; } };
    const qa = sel => { try { return [...document.querySelectorAll(sel)]; } catch { return []; } };
    const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
  
    const isVisible = (el) => {
      if (!el || !el.isConnected) return false;
      let p = el;
      while (p) {
        if (p.hidden || p.getAttribute?.('aria-hidden')==='true') return false;
        const st = getComputedStyle(p);
        if (st.display==='none' || st.visibility==='hidden' || st.opacity==='0') return false;
        p = p.parentElement;
      }
      const r = el.getBoundingClientRect();
      return (r.width>0 && r.height>0);
    };
  
    async function waitStable({minQuiet=300,maxWait=6000}={}) {
      let last = Date.now();
      const mo = new MutationObserver(()=>{ last = Date.now(); });
      mo.observe(document.body, {subtree:true, childList:true, attributes:true});
      const start = Date.now();
      while (Date.now()-start < maxWait) {
        if (Date.now()-last >= minQuiet) { mo.disconnect(); return true; }
        await wait(80);
      }
      mo.disconnect(); return false;
    }
  
    const overlayPresent = () => !!q('.blockUI.blockOverlay, .blockUI.blockMsg');
    async function waitOverlayGone(timeout=8000) {
      const t0 = Date.now();
      while (Date.now()-t0 < timeout) {
        if (!overlayPresent()) return true;
        await wait(80);
      }
      return true;
    }
  
    function bringIntoView(el){ try { el?.scrollIntoView?.({block:'center'}); } catch{} }
    function dispatchHumanChange(el) {
      el.dispatchEvent(new Event("input",{bubbles:true}));
      el.dispatchEvent(new Event("change",{bubbles:true}));
      el.dispatchEvent(new Event("blur",{bubbles:true}));
    }
    async function typeMasked(el, text) {
      if (!el) return false;
      bringIntoView(el);
      el.focus();
      el.value = "";
      el.dispatchEvent(new Event("input",{bubbles:true}));
      for (const ch of String(text)) {
        el.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:ch}));
        el.value += ch;
        el.dispatchEvent(new Event("input",{bubbles:true}));
        el.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,key:ch}));
        await wait(8);
      }
      el.blur();
      el.dispatchEvent(new Event("change",{bubbles:true}));
      return true;
    }
    const readSelect = (sel) => {
      if (!sel || sel.tagName!=='SELECT') return null;
      const opt = sel.selectedOptions?.[0] || sel.options?.[sel.selectedIndex];
      return { value: sel.value ?? "", text: T(opt?.text||"") };
    };
    function setSelectByValueOrText(sel, wanted) {
      if (!sel || sel.tagName!=='SELECT') return {ok:false, reason:"no_select"};
      const opts = [...sel.options];
      const w = norm(wanted);
      let idx = opts.findIndex(o => norm(o.value||"")===w);
      if (idx<0) idx = opts.findIndex(o => norm(o.text||"")===w);
      if (idx<0) return { ok:false, reason:"option_not_found", options: opts.map(o=>({value:o.value, text:T(o.text||"")})) };
      sel.selectedIndex = idx;
      dispatchHumanChange(sel);
      return { ok:true };
    }
  
    // ---------- ouverture onglet/section "Conjoint" ----------
    function findConjointTab() {
      // 1) IDs/HREF connus
      const direct = q('#tab-conjoint, #onglet-conjoint, a[href*="conjoint"], [data-target*="conjoint"]');
      if (direct) return direct;
      // 2) Tout bouton/onglet contenant "Conjoint"
      const cand = qa('a, button, [role="tab"], .nav a, .tabs a, .panel-heading a, .card-header a, .menu a')
        .filter(n => /conjoint/i.test(T(n.innerText||n.textContent||"")));
      // prend le plus visible
      return cand.find(isVisible) || cand[0] || null;
    }
    async function openConjointTab() {
      const tab = findConjointTab();
      if (!tab) return { ok:false, reason:"tab_not_found", hint:"Impossible de trouver l’onglet Conjoint. Vérifie que le mode “Couple” est actif." };
      const mk = (type) => new MouseEvent(type,{bubbles:true,cancelable:true,view:window});
      tab.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      tab.dispatchEvent(mk('mousedown'));
      tab.dispatchEvent(mk('mouseup'));
      tab.dispatchEvent(mk('click'));
      await wait(120);
      await waitOverlayGone(8000);
      await waitStable();
      return { ok:true };
    }
  
    // ---------- localisateurs des champs Conjoint ----------
    function elDate()       { return q('#date-naissance-assure-conjoint') || q('[name="conjoint.dateNaissance"]') || q('input[id*="conjoint"][id*="naiss"]'); }
    function selRegime()    { return q('#regime-social-assure-conjoint') || q('[name="conjoint.regimeSocial"]')   || q('select[id*="conjoint"][id*="regime"]'); }
    function selStatut()    { return q('#statut-assure-conjoint')         || q('[name="conjoint.statut"]')        || q('select[id*="conjoint"][id*="statut"]'); }
    function selProfession(){ return q('#profession-assure-conjoint')     || q('[name="conjoint.profession"]')    || q('select[id*="conjoint"][id*="profes"]'); }
  
    // ---------- lecture ----------
    function readAll() {
      const d  = elDate();
      const rg = selRegime();
      const st = selStatut();
      const pr = selProfession();
      return {
        dateNaissance: d ? (d.value||"") : null,
        regimeSocial:  rg ? readSelect(rg) : null,
        statut:        st ? readSelect(st) : null,
        profession:    pr ? readSelect(pr) : null,
        visible: {
          date: isVisible(d),
          regime: isVisible(rg),
          statut: isVisible(st),
          profession: isVisible(pr)
        }
      };
    }
  
    // ---------- vérif “prête à remplir” ----------
    function readyCheck() {
      const d  = elDate(), rg = selRegime(), st = selStatut(), pr = selProfession();
      const rows = [
        { champ:"conjoint.dateNaissance", ok: !!d,  why: d? "": "introuvable/onglet fermé" },
        { champ:"conjoint.regimeSocial",  ok: !!rg, why: rg? "": "introuvable/onglet fermé" },
        { champ:"conjoint.statut",        ok: !!st, why: st? "": "introuvable/onglet fermé" },
        { champ:"conjoint.profession",    ok: !!pr, why: pr? "": "introuvable (optionnel)" },
      ];
      console.table(rows);
      return rows;
    }
  
    // ---------- remplissage ----------
    async function fillAll(cfg=CFG) {
      const d  = elDate(), rg = selRegime(), st = selStatut(), pr = selProfession();
      const out = {};
  
      if (d)  out.date = { ok: await typeMasked(d, cfg.dateNaissance||""), got: d.value, expected: cfg.dateNaissance||"" };
      if (rg) out.regime = Object.assign(setSelectByValueOrText(rg, cfg.regimeSocial||""), { got: readSelect(rg), expected: cfg.regimeSocial||"" });
      if (st) out.statut = Object.assign(setSelectByValueOrText(st, cfg.statut||""),       { got: readSelect(st), expected: cfg.statut||"" });
      if (pr && cfg.profession) out.profession = Object.assign(setSelectByValueOrText(pr, cfg.profession||""), { got: readSelect(pr), expected: cfg.profession||"" });
  
      await wait(120);
      await waitOverlayGone(8000);
      await waitStable();
  
      return out;
    }
  
    // ---------- contrôle / diagnose ----------
    function checkAll(cfg=CFG) {
      const got = readAll();
      const rows = [];
  
      const okDate  = T(got.dateNaissance||"") === T(cfg.dateNaissance||"");
      rows.push({ champ:"conjoint.dateNaissance", ok: okDate, got: got.dateNaissance||"", expected: cfg.dateNaissance||"" });
  
      const okReg   = got.regimeSocial && (norm(got.regimeSocial.value||"")===norm(cfg.regimeSocial||"") || norm(got.regimeSocial.text||"")===norm(cfg.regimeSocial||""));
      rows.push({ champ:"conjoint.regimeSocial", ok: !!okReg, got: got.regimeSocial||null, expected: cfg.regimeSocial||"" });
  
      const okStat  = got.statut && (norm(got.statut.value||"")===norm(cfg.statut||"") || norm(got.statut.text||"")===norm(cfg.statut||""));
      rows.push({ champ:"conjoint.statut", ok: !!okStat, got: got.statut||null, expected: cfg.statut||"" });
  
      if (cfg.profession !== null) {
        const okProf = got.profession && (norm(got.profession.value||"")===norm(cfg.profession||"") || norm(got.profession.text||"")===norm(cfg.profession||""));
        rows.push({ champ:"conjoint.profession", ok: !!okProf, got: got.profession||null, expected: cfg.profession||"" });
      }
  
      console.table(rows);
      return rows;
    }
  
    function diagnose(cfg=CFG) {
      const d  = elDate(), rg = selRegime(), st = selStatut(), pr = selProfession();
      const issues = [];
      if (!d || !isVisible(d))  issues.push({what:"dateNaissance", why: d? "masqué" : "introuvable", hint:"Ouvre l’onglet Conjoint (et mode “Couple”)."});
      if (!rg || !isVisible(rg)) issues.push({what:"regimeSocial",  why: rg? "masqué" : "introuvable", hint:"Attends la fin du chargement / onglet Conjoint."});
      if (!st || !isVisible(st)) issues.push({what:"statut",        why: st? "masqué" : "introuvable", hint:"Attends la fin du chargement / onglet Conjoint."});
      if (cfg.profession !== null && (!pr || !isVisible(pr))) issues.push({what:"profession", why: pr? "masqué" : "introuvable", hint:"Champ parfois absent."});
      if (overlayPresent()) issues.push({what:"overlay", why:"blocage réseau en cours", hint:"Attendre qu’il disparaisse."});
      return issues;
    }
  
    // ---------- scénario complet ----------
    async function runAll(cfg=CFG) {
      console.log("▶️ SLS_CONJOINT.runAll…");
      const open = await openConjointTab();
      if (!open.ok) console.warn("⚠️ Ouverture onglet Conjoint:", open);
  
      const ready = readyCheck();
      const fill  = await fillAll(cfg);
      const check = checkAll(cfg);
      const diag  = diagnose(cfg);
  
      console.groupCollapsed("📋 SLS_CONJOINT — Résumé");
      const okCount = check.filter(r=>r.ok).length;
      console.table([{open: open.ok, fields_ok: okCount + "/" + check.length, diag: diag.length? `${diag.length} point(s)` : "RAS"}]);
      console.groupEnd();
  
      return { open, ready, fill, check, diag };
    }
  
    // ---------- expose ----------
    window.SLS_CONJOINT = {
      cfg: CFG,
      openTab: openConjointTab,
      ready: readyCheck,
      fill: fillAll,
      read: readAll,
      check: checkAll,
      diagnose,
      runAll
    };
  
    console.log("✅ SLS_CONJOINT prêt. Exemples :");
    console.log('SLS_CONJOINT.cfg = { dateNaissance:"15/06/1982", regimeSocial:"SECURITE_SOCIALE", statut:"SALARIE", profession:null };');
    console.log("await SLS_CONJOINT.openTab();  // clique sur l’onglet Conjoint");
    console.log("SLS_CONJOINT.ready();          // vérifie présence des champs");
    console.log("await SLS_CONJOINT.runAll();   // ouvre, remplit, relit, diagnostique");
  })();
  
  
  


  // ==== SLS_GAMMES v2 — Inspecter, rafraîchir et régler "Les Gammes" ====
  // A coller dans l'iFrame tarificateur (oav-pool2…)

(() => {
  // -------- CONFIG (mets ton souhait ici) --------
  const CFG = { want: "SwissLife Santé" }; // texte ou value attendue

  // -------- utils --------
  const T = s => (s||"").toString().replace(/\s+/g," ").trim();
  const norm = s => T(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const q  = sel => { try { return document.querySelector(sel); } catch { return null; } };
  const qa = sel => { try { return [...document.querySelectorAll(sel)]; } catch { return []; } };
  const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
  async function waitStable({minQuiet=300,maxWait=6000}={}) {
    let last = Date.now();
    const mo = new MutationObserver(()=>{ last = Date.now(); });
    mo.observe(document.body, {subtree:true, childList:true, attributes:true});
    const start = Date.now();
    while (Date.now()-start < maxWait) {
      if (Date.now()-last >= minQuiet) { mo.disconnect(); return true; }
      await wait(80);
    }
    mo.disconnect(); return false;
  }
  const overlay = () => !!q('.blockUI.blockOverlay, .blockUI.blockMsg');
  async function waitOverlayGone(timeout=8000){
    const t0=Date.now();
    while(Date.now()-t0<timeout){ if(!overlay()) return true; await wait(80); }
    return true;
  }
  function isVisible(el){
    if (!el || !el.isConnected) return false;
    let p=el;
    while(p){
      if (p.hidden || p.getAttribute?.('aria-hidden')==='true') return false;
      const st=getComputedStyle(p);
      if (st.display==='none'||st.visibility==='hidden'||st.opacity==='0') return false;
      p=p.parentElement;
    }
    const r=el.getBoundingClientRect();
    return r.width>0 && r.height>0;
  }
  function fire(el){ if(!el) return; el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true})); }

  // -------- localisateurs “prérequis” (pour forcer le peuplement) --------
  function elDateNaissance(){ return q('#date-naissance-assure-principal,[name="client.dateNaissance"], input[id*="date-naiss"]'); }
  function elDepartement(){
    // VRAI département = options numériques 01..95/2A/2B
    const all = qa('select');
    const isDept = s => {
      const texts=[...s.options].map(o=>T(o.text||""));
      const good = texts.filter(t => /^([0-9]{2}|2A|2B)$/.test(t));
      return good.length>=5; // heuristique
    };
    return all.find(s => isDept(s) && /d[ée]partement|residen/i.test((s.closest('label, .form-group, fieldset, section, .row, .col, div')?.innerText||'')));
  }
  function elRegime(){ return q('#regime-social-assure-principal,[name="client.regimeSocial"]'); }
  function elStatut(){ return q('#statut-assure-principal,[name="client.statut"]'); }

  function readSelect(sel){
    const opt = sel?.selectedOptions?.[0] || sel?.options?.[sel.selectedIndex];
    return sel ? {value: sel.value ?? "", text: T(opt?.text||"")} : null;
  }

  // -------- localisateurs Gammes (et filtrage anti-“département”) --------
  function findGammeSelect() {
    // 1) un select proche d’un libellé “Les Gammes / Gamme / Formule / Offre”
    const nodes = qa("label, legend, .label, .form-group, section, fieldset, .panel, .card, div, span");
    for(const n of nodes){
      const txt=T(n.innerText||"");
      if(!txt) continue;
      if(/\bles?\s*gammes?\b|\bgamme\b|\bformule\b|\boffre\b/i.test(txt)){
        const sel = n.querySelector?.("select") || n.nextElementSibling?.querySelector?.("select");
        if(sel && isVisible(sel) && !looksLikeDepartement(sel)) return sel;
      }
    }
    // 2) fallback: select dont les options ne sont PAS purement des codes départements
    const cand = qa("select").find(s => isVisible(s) && !looksLikeDepartement(s) && maybeLooksLikeGamme(s));
    return cand || null;
  }
  function maybeLooksLikeGamme(sel){
    const texts = [...sel.options].map(o=>T(o.text||"").toLowerCase());
    return texts.some(t => /\bgamme|\bformule|\boffre|\bswiss\s*life|sant[ée]/i.test(t));
  }
  function looksLikeDepartement(sel){
    const texts = [...sel.options].map(o=>T(o.text||""));
    const allDept = texts.length>=5 && texts.every(t => t==="" || /^([0-9]{2}|2A|2B)$/.test(t));
    return allDept;
  }

  function findGammeRadiosOrTiles(){
    // radios
    const radios = qa('input[type="radio"][name]').filter(isVisible);
    const byName = new Map();
    for(const r of radios) (byName.get(r.name)||byName.set(r.name,[]).get(r.name)).push(r);
    for(const list of byName.values()){
      const labels = list.map(r=>{
        const lab = r.id ? q(`label[for="${CSS.escape(r.id)}"]`) : r.closest("label");
        return T((lab?.innerText)||r.value||"");
      }).filter(Boolean);
      const joined = labels.join(" | ").toLowerCase();
      if (/\bgamme|\bformule|\boffre|\bswiss\s*life|sant[ée]/i.test(joined)) {
        return {type:'radios', list};
      }
    }
    // tuiles cliquables
    const tiles = qa('a,button,[role="button"],.tile,.card,.option,.choice').filter(n=>{
      const txt=T(n.innerText||"").toLowerCase();
      return isVisible(n) && /\bgamme|\bformule|\boffre|\bswiss\s*life|sant[ée]/i.test(txt);
    });
    if(tiles.length) return {type:'tiles', list: tiles};
    return null;
  }

  // -------- LIST / READ --------
  function list() {
    const sel = findGammeSelect();
    if (sel) {
      const opts = [...sel.options].map(o=>({value:o.value, text:T(o.text||""), disabled: !!o.disabled}));
      console.table(opts);
      return { kind:'select', id: sel.id||null, name: sel.name||null, options: opts, value: readSelect(sel) };
    }
    const grp = findGammeRadiosOrTiles();
    if (grp?.type==='radios') {
      const rows = grp.list.map(r=>{
        const lab = r.id ? q(`label[for="${CSS.escape(r.id)}"]`) : r.closest("label");
        return { id:r.id||null, name:r.name||null, text:T((lab?.innerText)||r.value||""), checked: !!r.checked };
      });
      console.table(rows);
      return { kind:'radios', items: rows };
    }
    if (grp?.type==='tiles') {
      const rows = grp.list.map(n=>({ text:T(n.innerText||""), role:n.getAttribute('role')||null }));
      console.table(rows);
      return { kind:'tiles', items: rows };
    }
    return { kind:'none' };
  }

  // -------- REFRESH (force le peuplement des gammes) --------
  async function refresh() {
    const date = elDateNaissance();
    const dep  = elDepartement();
    const reg  = elRegime();
    const sta  = elStatut();

    // Déclenche les “change” sur les prérequis connus
    [date, dep, reg, sta].forEach(el => el && el.dispatchEvent(new Event("change",{bubbles:true})));

    // Clique un éventuel CTA du bloc santé (souvent nécessaire)
    const cta = [...document.querySelectorAll('a,button,[role="button"]')].find(n => /proposez\s*swiss\s*life\s*sant[ée]/i.test(n.innerText||""));
    if (cta && isVisible(cta)) { cta.click(); }

    await wait(120);
    await waitOverlayGone();
    await waitStable();

    // Re-scan et retourne la liste
    return list();
  }

  // -------- SET / CHECK / DIAG --------
  function setSelect(sel, target) {
    const w = norm(target);
    const opts = [...sel.options];
    let idx = opts.findIndex(o => norm(o.value||"")===w);
    if (idx<0) idx = opts.findIndex(o => norm(o.text||"")===w);
    if (idx<0) return {ok:false, reason:"option_not_found", options: opts.map(o=>({value:o.value, text:T(o.text||"")}))};
    sel.selectedIndex = idx; fire(sel);
    return {ok:true, got: readSelect(sel)};
  }
  async function setRadiosOrTiles(grp, target) {
    const w = norm(target);
    if (grp.type==='radios') {
      const targetRadio = grp.list.find(r=>{
        const lab = r.id ? q(`label[for="${CSS.escape(r.id)}"]`) : r.closest("label");
        return norm(T((lab?.innerText)||r.value||""))===w;
      }) || grp.list.find(r=>{
        const lab = r.id ? q(`label[for="${CSS.escape(r.id)}"]`) : r.closest("label");
        return norm(T((lab?.innerText)||r.value||"")).includes(w) || w.includes(norm(T((lab?.innerText)||r.value||"")));
      });
      if (!targetRadio) return {ok:false, reason:"radio_option_not_found"};
      const clickable = targetRadio.id ? q(`label[for="${CSS.escape(targetRadio.id)}"]`) : targetRadio;
      clickable?.click();
      await wait(60); await waitOverlayGone(); await waitStable();
      return {ok:true};
    } else {
      const btn = grp.list.find(n=>norm(n.innerText||"")===w) || grp.list.find(n=>norm(n.innerText||"").includes(w));
      if (!btn) return {ok:false, reason:"tile_not_found"};
      btn.click();
      await wait(60); await waitOverlayGone(); await waitStable();
      return {ok:true};
    }
  }

  async function set(target = CFG.want){
    const sel = findGammeSelect();
    if (sel) return setSelect(sel, target);
    const grp = findGammeRadiosOrTiles();
    if (grp) return setRadiosOrTiles(grp, target);
    return {ok:false, reason:"control_not_found", hint:"Rafraîchis d’abord : await SLS_GAMMES.refresh()"};
  }

  function read() {
    const sel = findGammeSelect();
    if (sel) return {kind:'select', value: readSelect(sel)};
    const grp = findGammeRadiosOrTiles();
    if (grp?.type==='radios') {
      const c = grp.list.find(r=>r.checked);
      const lab = c?.id ? q(`label[for="${CSS.escape(c.id)}"]`) : c?.closest("label");
      return {kind:'radios', value: c ? T((lab?.innerText)||c.value||"") : null};
    }
    if (grp?.type==='tiles') return {kind:'tiles', value:null};
    return {kind:'none', value:null};
  }

  function check(expected = CFG.want) {
    const w = norm(expected);
    const r = read();
    let ok=false, got=null;
    if (r.kind==='select') { got = r.value; ok = !!r.value && (norm(r.value.value)===w || norm(r.value.text)===w); }
    else if (r.kind==='radios') { got = r.value; ok = !!r.value && (norm(r.value)===w || norm(r.value).includes(w)); }
    console.table([{ champ:"principal.gammes", ok, got, expected }]);
    return { champ:"principal.gammes", ok, got, expected };
  }

  function diagnose(expected = CFG.want) {
    const sel = findGammeSelect();
    const grp = sel ? null : findGammeRadiosOrTiles();
    const issues = [];
    if (!sel && !grp) issues.push({what:"gammes", why:"introuvable", hint:"Clique/affiche la section ‘Les Gammes’ puis SLS_GAMMES.refresh()."});
    if (sel) {
      const opts=[...sel.options].map(o=>({value:o.value, text:T(o.text||"")}));
      if (!opts.length) issues.push({what:"gammes", why:"select_sans_options", hint:"Déclenche un refresh : SLS_GAMMES.refresh()", options:opts});
    }
    if (overlay()) issues.push({what:"overlay", why:"chargement en cours"});
    // Pré-requis pour info
    const prereq = {
      dateNaissance: T(elDateNaissance()?.value||""),
      departement: readSelect(elDepartement()),
      regimeSocial: readSelect(elRegime()),
      statut: readSelect(elStatut())
    };
    return { issues, prereq, current: read(), list: list() };
  }

  // -------- expose --------
  window.SLS_GAMMES = {
    cfg: CFG,
    list, refresh, set, check, diagnose, read
  };

  console.log("✅ SLS_GAMMES prêt. Exemples :");
  console.log("SLS_GAMMES.list();               // voir les options actuelles");
  console.log("await SLS_GAMMES.refresh();      // forcer le peuplement des gammes");
  console.log('SLS_GAMMES.cfg.want = \"SwissLife Santé\";');
  console.log("await SLS_GAMMES.set();          // sélection par texte/value");
  console.log("SLS_GAMMES.check();              // vérification");
  console.log("SLS_GAMMES.diagnose();           // diagnostic détaillé");
})();





// ==== SLS_DATE_EFFET — Bouton & saisie "Date d'effet" ====
// A coller dans l'iFrame tarificateur (oav-pool2…)
// Trouve l'input + le bouton calendrier, clique le bouton, remplit la date, vérifie, diagnostique.

(() => {
  // ---------- utils ----------
  const T = s => (s||"").toString().replace(/\s+/g," ").trim();
  const q  = sel => { try { return document.querySelector(sel); } catch { return null; } };
  const qa = sel => { try { return [...document.querySelectorAll(sel)]; } catch { return []; } };
  const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
  const isVisible = (el) => {
    if (!el || !el.isConnected) return false;
    let p = el;
    while (p) {
      if (p.hidden || p.getAttribute?.('aria-hidden')==='true') return false;
      const st = getComputedStyle(p);
      if (st.display==='none' || st.visibility==='hidden' || st.opacity==='0') return false;
      p = p.parentElement;
    }
    const r = el.getBoundingClientRect();
    return (r.width>0 && r.height>0);
  };
  function overlay(){ return !!q('.blockUI.blockOverlay, .blockUI.blockMsg'); }
  async function waitOverlayGone(timeout=8000){
    const t0=Date.now();
    while(Date.now()-t0<timeout){ if(!overlay()) return true; await wait(80); }
    return true;
  }
  async function waitStable({minQuiet=300,maxWait=6000}={}) {
    let last = Date.now();
    const mo = new MutationObserver(()=>{ last = Date.now(); });
    mo.observe(document.body, {subtree:true, childList:true, attributes:true});
    const start = Date.now();
    while (Date.now()-start < maxWait) {
      if (Date.now()-last >= minQuiet) { mo.disconnect(); return true; }
      await wait(80);
    }
    mo.disconnect(); return false;
  }
  function fire(el){
    if (!el) return;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    el.dispatchEvent(new Event('blur',{bubbles:true}));
  }

  // ---------- localisation ----------
  function findInput(){
    // IDs/Names vus dans tes scans + fallback sur libellé "Date d'effet"
    const direct = q('#contratSante-dateEffet,[name="contratSante.dateEffet"]');
    if (direct) return direct;

    // Cherche via libellé proche
    const nodes = qa("label, legend, .label, .form-group, section, fieldset, .panel, .card, div, span");
    for (const n of nodes) {
      const txt = T(n.innerText||"");
      if (!txt) continue;
      if (/date\s*d['’]effet/i.test(txt)) {
        const inp = n.querySelector?.('input[type="text"], input, [type="date"]')
                 || n.nextElementSibling?.querySelector?.('input[type="text"], input, [type="date"]');
        if (inp) return inp;
      }
    }
    // fallback: tout input texte avec placeholder/aria-label contenant "effet"
    const maybe = qa('input[type="text"], input').find(x => /effet/i.test(`${x.placeholder||''} ${x.getAttribute?.('aria-label')||''}`));
    return maybe || null;
  }

  function findButtonNear(input){
    if (!input) return null;
    // 1) bouton juste à côté (input-group-addon, icône calendrier)
    const group = input.closest('.input-group, .form-group, .row, .col, div');
    if (group) {
      const btn = group.querySelector('button, .input-group-addon, .icon-calendar, .fa-calendar, .glyphicon-calendar, .ui-datepicker-trigger, [role="button"]');
      if (btn) return btn.tagName ? btn : btn.closest('button,[role="button"],.input-group-addon');
    }
    // 2) label for + bouton suivant
    const lab = input.id ? q(`label[for="${CSS.escape(input.id)}"]`) : null;
    if (lab) {
      const sibBtn = lab.nextElementSibling?.querySelector?.('button,[role="button"],.input-group-addon');
      if (sibBtn) return sibBtn;
    }
    return null;
  }

  // ---------- lecture / saisie ----------
  function read(){
    const el = findInput();
    return { found: !!el, visible: isVisible(el), value: el ? T(el.value||"") : null, id: el?.id||null, name: el?.name||null };
  }

  async function clickButton(){
    const el = findInput();
    const btn = findButtonNear(el);
    if (!el)  return { ok:false, reason:'input_not_found' };
    if (!btn) return { ok:false, reason:'button_not_found' };
    if (!isVisible(btn)) return { ok:false, reason:'button_hidden' };
    try { btn.scrollIntoView({behavior:'instant',block:'center'}); } catch {}
    btn.click();
    await wait(80);
    await waitOverlayGone();
    await waitStable();
    return { ok:true };
  }

  function toDDMMYYYY(v){
    if (!v) return null;
    const s = T(v).toLowerCase();
    if (s==='today' || s==='aujourdhui' || s==='aujourd\'hui') {
      const d=new Date(); const dd=String(d.getDate()).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const yy=d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }
    // accepte déjà formatté
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    // yyyy-mm-dd -> dd/mm/yyyy
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return s; // on laisse tel quel
  }

  async function set(value /* "dd/mm/yyyy" | "today" */){
    const el = findInput();
    if (!el) return { ok:false, reason:'input_not_found' };
    const val = toDDMMYYYY(value);
    el.focus();
    el.value = val || '';
    fire(el);
    await wait(60);
    await waitOverlayGone();
    await waitStable();
    const r = read();
    return { ok: r.value === val, after: r };
  }

  function check(expected){
    const e = toDDMMYYYY(expected);
    const r = read();
    const ok = r.found && r.visible && T(r.value)===T(e);
    console.table([{ champ:"principal.dateEffet", ok, got:r.value, expected:e }]);
    return { champ:"principal.dateEffet", ok, got:r.value, expected:e };
  }

  function diagnose(expected){
    const e = toDDMMYYYY(expected);
    const r = read();
    const issues = [];
    if (!r.found) issues.push({what:'input', why:'introuvable', hint:'Vérifie la section/onglet et l’iFrame tarificateur.'});
    else {
      if (!r.visible) issues.push({what:'input', why:'masque', hint:'Déplie/affiche la zone "Date d’effet".'});
      if (T(r.value)!==T(e)) issues.push({what:'valeur', why:'different', got:r.value, expected:e});
    }
    const btn = r.found ? findButtonNear(findInput()) : null;
    if (!btn) issues.push({what:'button', why:'introuvable_proche', hint:'Icône calendrier/bouton absent ou markup différent.'});
    else if (!isVisible(btn)) issues.push({what:'button', why:'masque'});
    return { read:r, button: !!btn && {visible:isVisible(btn)}, expected:e, issues };
  }

  // ---------- expose ----------
  window.SLS_DATE_EFFET = { read, clickButton, set, check, diagnose };

  console.log("✅ SLS_DATE_EFFET prêt. Exemples :");
  console.log("SLS_DATE_EFFET.read();");
  console.log("await SLS_DATE_EFFET.clickButton();   // ouvre le calendrier (si présent)");
  console.log('await SLS_DATE_EFFET.set(\"24/08/2025\");');
  console.log('SLS_DATE_EFFET.check(\"24/08/2025\");');
  console.log('SLS_DATE_EFFET.diagnose(\"24/08/2025\");');
})();


  
/*
==============================================================================
                          💰 SECTION 7: LOI MADELIN
==============================================================================
*/

  // ==== SLS_MADELIN — case à cocher "Loi Madelin" ====
  // A coller dans l’iFrame tarificateur (oav-pool2…)
  
  (() => {
    // ---------- utils ----------
    const T = s => (s||"").toString().replace(/\s+/g," ").trim();
    const norm = s => T(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const q  = sel => { try { return document.querySelector(sel); } catch { return null; } };
    const qa = sel => { try { return [...document.querySelectorAll(sel)]; } catch { return []; } };
    const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
    async function waitStable({minQuiet=300, maxWait=6000}={}) {
      let last = Date.now();
      const mo = new MutationObserver(()=>{ last = Date.now(); });
      mo.observe(document.body, {subtree:true, childList:true, attributes:true});
      const start = Date.now();
      while (Date.now()-start < maxWait) {
        if (Date.now()-last >= minQuiet) { mo.disconnect(); return true; }
        await wait(80);
      }
      mo.disconnect(); return false;
    }
    const overlay = () => !!q('.blockUI.blockOverlay, .blockUI.blockMsg');
    async function waitOverlayGone(timeout=8000){
      const t0=Date.now();
      while(Date.now()-t0<timeout){ if(!overlay()) return true; await wait(80); }
      return true;
    }
    function isVisible(el){
      if (!el || !el.isConnected) return false;
      let p=el;
      while(p){
        if (p.hidden || p.getAttribute?.('aria-hidden')==='true') return false;
        const st=getComputedStyle(p);
        if (st.display==='none'||st.visibility==='hidden'||st.opacity==='0') return false;
        p=p.parentElement;
      }
      const r=el.getBoundingClientRect();
      return r.width>0 && r.height>0;
    }
    function fire(el){
      if(!el) return;
      el.dispatchEvent(new Event("input",{bubbles:true}));
      el.dispatchEvent(new Event("change",{bubbles:true}));
      el.dispatchEvent(new Event("blur",{bubbles:true}));
    }
  
    // ---------- localisateurs utiles (prérequis) ----------
    function elRegime(){ return q('#regime-social-assure-principal,[name="client.regimeSocial"]'); }
    function elStatut(){ return q('#statut-assure-principal,[name="client.statut"]'); }
    function readSelect(sel){
      const opt = sel?.selectedOptions?.[0] || sel?.options?.[sel.selectedIndex];
      return sel ? {value: sel.value ?? "", text: T(opt?.text||"")} : null;
    }
  
    // ---------- trouver la case “Loi Madelin” ----------
    function findBox(){
      // 1) ID connu
      const direct = q('#loi-madelin-checkbox');
      if (direct) return direct;
  
      // 2) input[type=checkbox] dont le label contient “Madelin”
      const cbs = qa('input[type="checkbox"]');
      for(const cb of cbs){
        const lab = cb.id ? q(`label[for="${CSS.escape(cb.id)}"]`) : cb.closest('label');
        const blob = `${lab?.innerText||""} ${cb.name||""} ${cb.id||""}`;
        if (/madelin/i.test(blob)) return cb;
        // voisin de texte “Madelin”
        let p = cb.parentElement, lvl=0;
        while(p && lvl<3){
          if (/madelin/i.test(T(p.innerText||""))) return cb;
          p = p.parentElement; lvl++;
        }
      }
      return null;
    }
  
    // ---------- lecture ----------
    function read(){
      const cb = findBox();
      if (!cb) return { found:false, visible:false, disabled:null, checked:null };
      const lab = cb.id ? q(`label[for="${CSS.escape(cb.id)}"]`) : cb.closest('label');
      const visible = isVisible(cb) || isVisible(lab);
      return { found:true, visible, disabled: !!(cb.disabled || cb.readOnly), checked: !!cb.checked };
    }
  
    // ---------- réglage (true/false) ----------
    function toBool(v){
      const s = norm(v);
      if (s==='true'||s==='1'||s==='oui'||s==='o') return true;
      if (s==='false'||s==='0'||s==='non'||s==='n') return false;
      return !!v;
    }
  
    async function setMadelin(value /* boolean | 'oui'|'non' */){
      const want = toBool(value);
      const cb = findBox();
      if (!cb) return { ok:false, reason:'not_found', hint:"Case Madelin introuvable : vérifie que le statut/régime permet l’option (souvent TNS)." };
  
      const lab = cb.id ? q(`label[for="${CSS.escape(cb.id)}"]`) : cb.closest('label');
      if (!(isVisible(cb) || isVisible(lab)))
        return { ok:false, reason:'hidden', hint:"La case est masquée (section/onglet replié ou non éligible). Vérifie Statut/Regime." };
  
      if (cb.disabled || cb.readOnly)
        return { ok:false, reason:'disabled', hint:"Le site a désactivé la case (conditions non remplies)." };
  
      if (cb.checked !== want){
        // clic réaliste sur le label si dispo (meilleure compatibilité)
        if (lab) lab.click(); else cb.click();
        await wait(60);
        fire(cb);
        await waitOverlayGone();
        await waitStable();
      }
      return { ok: read().checked === want };
    }
  
    // ---------- vérification / diagnostic ----------
    function check(expected /* boolean|'oui'|'non' */){
      const want = toBool(expected);
      const r = read();
      const ok = r.found && r.visible && r.checked === want;
      console.table([{ champ:"principal.loiMadelin", ok, got:r.checked, expected:want }]);
      return { champ:"principal.loiMadelin", ok, got:r.checked, expected:want };
    }
  
    function diagnose(expected){
      const want = toBool(expected);
      const r = read();
      const prereq = {
        regimeSocial: readSelect(elRegime()),
        statut:       readSelect(elStatut())
      };
      const issues = [];
      if (!r.found) issues.push({what:"checkbox", why:"introuvable", hint:"Souvent visible pour TNS. Vérifie Statut/Regime et l’onglet adéquat."});
      else {
        if (!r.visible)  issues.push({what:"checkbox", why:"masquee", hint:"Déplie la section / onglet."});
        if (r.disabled)  issues.push({what:"checkbox", why:"desactivee", hint:"Conditions non remplies (statut/régime)."});
        if (r.checked !== want) issues.push({what:"valeur", why:"different", hint:"Refais setMadelin(), la page déclenche parfois un masque/événement."});
      }
      return { read:r, expected:want, prereq, issues };
    }
  
    async function refresh(){
      // Déclenche “change” sur regime/statut pour forcer l’affichage si éligible
      const reg = elRegime(), sta = elStatut();
      [reg, sta].forEach(el=> el && el.dispatchEvent(new Event("change",{bubbles:true})));
      await wait(120); await waitOverlayGone(); await waitStable();
      return read();
    }
  
    // ---------- expose ----------
    window.SLS_MADELIN = { read, set: setMadelin, check, diagnose, refresh };
  
    console.log("✅ SLS_MADELIN prêt. Exemples :");
    console.log("await SLS_MADELIN.set(true);     // coche");
    console.log("SLS_MADELIN.check(true);         // vérifie");
    console.log("SLS_MADELIN.diagnose(true);      // diagnostic");
    console.log("await SLS_MADELIN.refresh();     // relance affichage si dépend de Statut/Régime");
  })();
  
/*
==============================================================================
                      ❌ SECTION 8: RÉSILIATION DE CONTRAT
==============================================================================
*/

  // ==== SLS_RESILIATION_EXACT — Résiliation pour le compte de l'assuré (oui/non) ====
  // Cible STRICTE: #resiliation-contrat-oui / #resiliation-contrat-non (name="contratSante.resiliationContrat")
  
  (() => {
    const ID_OUI = 'resiliation-contrat-oui';
    const ID_NON = 'resiliation-contrat-non';
    const NAME   = 'contratSante.resiliationContrat';
  
    const T = s => (s||"").toString().replace(/\s+/g," ").trim();
    const q  = sel => { try { return document.querySelector(sel); } catch { return null; } };
    const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
    const overlay = () => !!document.querySelector('.blockUI.blockOverlay, .blockUI.blockMsg');
    async function waitOverlayGone(timeout=8000){ const t0=Date.now(); while(Date.now()-t0<timeout){ if(!overlay()) return true; await wait(80); } return true; }
    async function waitStable({minQuiet=300,maxWait=6000}={}) {
      let last = Date.now();
      const mo = new MutationObserver(()=>{ last = Date.now(); });
      mo.observe(document.body, {subtree:true, childList:true, attributes:true});
      const start = Date.now();
      while (Date.now()-start < maxWait) {
        if (Date.now()-last >= minQuiet) { mo.disconnect(); return true; }
        await wait(80);
      }
      mo.disconnect(); return false;
    }
    function isVisible(el){
      if (!el || !el.isConnected) return false;
      let p=el;
      while(p){
        if (p.hidden || p.getAttribute?.('aria-hidden')==='true') return false;
        const st = getComputedStyle(p);
        if (st.display==='none' || st.visibility==='hidden' || st.opacity==='0') return false;
        p=p.parentElement;
      }
      const r = el.getBoundingClientRect();
      return (r.width>0 && r.height>0);
    }
    function labelFor(input){ return input?.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : input?.closest?.('label') || null; }
    function fire(el){ if(!el) return; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
  
    function getGroup(){
      const inOui = document.getElementById(ID_OUI);
      const inNon = document.getElementById(ID_NON);
      const okName = el => el && el.name === NAME;
      const ok = okName(inOui) && okName(inNon);
      return { ok, inOui, inNon, name: NAME };
    }
  
    function read(){
      const g = getGroup();
      if (!g.ok) return {found:false, reason:'wrong_dom_or_name', checked:null};
      const checked = document.querySelector(`input[type="radio"][name="${CSS.escape(NAME)}"]:checked`);
      let value = null;
      if (checked) {
        value = (checked.id === ID_OUI) ? 'oui' : (checked.id === ID_NON ? 'non' : T(checked.value||''));
      }
      return {
        found: true,
        visible: isVisible(g.inOui) || isVisible(labelFor(g.inOui)) || isVisible(g.inNon) || isVisible(labelFor(g.inNon)),
        disabled: !!(g.inOui?.disabled && g.inNon?.disabled),
        idChecked: checked?.id || null,
        value
      };
    }
  
    async function set(value /* 'oui'|'non' */){
      const targetId = (/^oui$/i.test(value)) ? ID_OUI : ID_NON;
      const g = getGroup();
      if (!g.ok) return {ok:false, reason:'group_not_found', hint:`IDs attendus: #${ID_OUI} / #${ID_NON} et name="${NAME}"`};
      const input = document.getElementById(targetId);
      const lab   = labelFor(input);
      const clickable = (lab && isVisible(lab)) ? lab : input;
      if (!clickable) return {ok:false, reason:'no_clickable'};
      if (!isVisible(clickable)) return {ok:false, reason:'hidden'};
      if (input.disabled) return {ok:false, reason:'disabled'};
  
      // clic réaliste
      const mk = (type) => new MouseEvent(type, {bubbles:true, cancelable:true, view:window});
      clickable.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      clickable.dispatchEvent(mk('mousedown'));
      clickable.dispatchEvent(mk('mouseup'));
      clickable.dispatchEvent(mk('click'));
      fire(input);
  
      await wait(60);
      await waitOverlayGone();
      await waitStable();
  
      const r = read();
      const ok = r.found && r.idChecked === targetId && r.value === value.toLowerCase();
      return { ok, after:r };
    }
  
    function check(expected /* 'oui'|'non' */){
      const r = read();
      const ok = r.found && r.value === expected.toLowerCase();
      console.table([{champ:'principal.resiliationPourCompte', ok, got:r.value, expected}]);
      return { champ:'principal.resiliationPourCompte', ok, got:r.value, expected };
    }
  
    function diagnose(expected /* 'oui'|'non' */){
      const g = getGroup();
      const r = read();
      const issues = [];
      if (!g.ok) {
        issues.push({what:'group', why:'introuvable_ou_name_diff', hint:`Vérifie la présence de #${ID_OUI}, #${ID_NON} et name="${NAME}"`});
      } else {
        if (!r.visible)  issues.push({what:'visibility', why:'masqué', hint:'Déplie ou affiche la section contenant la résiliation.'});
        if (r.disabled)  issues.push({what:'state', why:'désactivé', hint:'Condition du parcours non remplie.'});
        if (expected && r.value !== expected.toLowerCase())
          issues.push({what:'value', why:'différente', got:r.value, expected: expected.toLowerCase()});
        // cross-check de robustesse : seul un radio du bon name doit être coché
        const allChecked = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(NAME)}"]:checked`)];
        if (allChecked.length !== 1)
          issues.push({what:'integrity', why:'multi_checked_or_none', detail: allChecked.map(n=>n.id)});
      }
      return { read:r, issues };
    }
  
    window.SLS_RESILIATION_EXACT = { read, set, check, diagnose };
    console.log("✅ SLS_RESILIATION_EXACT prêt. Exemples :");
    console.log("await SLS_RESILIATION_EXACT.set('non');");
    console.log("SLS_RESILIATION_EXACT.check('non');");
    console.log("SLS_RESILIATION_EXACT.diagnose('non');");
  })();
  
/*
==============================================================================
                    🔄 SECTION 9: REPRISE DE CONCURRENCE
==============================================================================
*/

  // ==== SLS_REPRISE_EXACT — Reprise de concurrence à iso garanties (oui/non) ====
  // Cible STRICTE: #reprise-concurrence-oui / #reprise-concurrence-non
  // name="contratSante.repriseConcurrence"
  
  (() => {
    const ID_OUI = 'reprise-concurrence-oui';
    const ID_NON = 'reprise-concurrence-non';
    const NAME   = 'contratSante.repriseConcurrence';
  
    const T = s => (s||"").toString().replace(/\s+/g," ").trim();
    const q = sel => { try { return document.querySelector(sel); } catch { return null; } };
    const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
    const overlay = () => !!document.querySelector('.blockUI.blockOverlay, .blockUI.blockMsg');
  
    async function waitOverlayGone(timeout=8000){
      const t0=Date.now();
      while(Date.now()-t0<timeout){ if(!overlay()) return true; await wait(80); }
      return true;
    }
    async function waitStable({minQuiet=300,maxWait=6000}={}) {
      let last = Date.now();
      const mo = new MutationObserver(()=>{ last = Date.now(); });
      mo.observe(document.body, {subtree:true, childList:true, attributes:true});
      const start = Date.now();
      while (Date.now()-start < maxWait) {
        if (Date.now()-last >= minQuiet) { mo.disconnect(); return true; }
        await wait(80);
      }
      mo.disconnect(); return false;
    }
    function isVisible(el){
      if (!el || !el.isConnected) return false;
      let p=el;
      while(p){
        if (p.hidden || p.getAttribute?.('aria-hidden')==='true') return false;
        const st=getComputedStyle(p);
        if (st.display==='none'||st.visibility==='hidden'||st.opacity==='0') return false;
        p=p.parentElement;
      }
      const r=el.getBoundingClientRect();
      return (r.width>0 && r.height>0);
    }
    function labelFor(input){ return input?.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : input?.closest?.('label') || null; }
    function fire(el){ if(!el) return; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
  
    function getGroup(){
      const inOui = document.getElementById(ID_OUI);
      const inNon = document.getElementById(ID_NON);
      const okName = el => el && el.name === NAME;
      const ok = okName(inOui) && okName(inNon);
      return { ok, inOui, inNon, name: NAME };
    }
  
    function read(){
      const g = getGroup();
      if (!g.ok) return {found:false, reason:'wrong_dom_or_name', checked:null, value:null};
      const checked = document.querySelector(`input[type="radio"][name="${CSS.escape(NAME)}"]:checked`);
      let value = null;
      if (checked) {
        value = (checked.id === ID_OUI) ? 'oui' : (checked.id === ID_NON ? 'non' : T(checked.value||''));
      }
      return {
        found: true,
        visible: isVisible(g.inOui) || isVisible(labelFor(g.inOui)) || isVisible(g.inNon) || isVisible(labelFor(g.inNon)),
        disabled: !!(g.inOui?.disabled && g.inNon?.disabled),
        idChecked: checked?.id || null,
        value
      };
    }
  
    async function set(value /* 'oui'|'non' */){
      const targetId = (/^oui$/i.test(value)) ? ID_OUI : ID_NON;
      const g = getGroup();
      if (!g.ok) return {ok:false, reason:'group_not_found', hint:`IDs attendus: #${ID_OUI} / #${ID_NON} et name="${NAME}"`};
      const input = document.getElementById(targetId);
      const lab   = labelFor(input);
      const clickable = (lab && isVisible(lab)) ? lab : input;
      if (!clickable) return {ok:false, reason:'no_clickable'};
      if (!isVisible(clickable)) return {ok:false, reason:'hidden'};
      if (input.disabled) return {ok:false, reason:'disabled'};
  
      // clic réaliste
      const mk = (type) => new MouseEvent(type, {bubbles:true, cancelable:true, view:window});
      clickable.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      clickable.dispatchEvent(mk('mousedown'));
      clickable.dispatchEvent(mk('mouseup'));
      clickable.dispatchEvent(mk('click'));
      fire(input);
  
      await wait(60);
      await waitOverlayGone();
      await waitStable();
  
      const r = read();
      const ok = r.found && r.idChecked === targetId && r.value === value.toLowerCase();
      return { ok, after:r };
    }
  
    function check(expected /* 'oui'|'non' */){
      const r = read();
      const ok = r.found && r.value === expected.toLowerCase();
      console.table([{champ:'principal.repriseIso', ok, got:r.value, expected}]);
      return { champ:'principal.repriseIso', ok, got:r.value, expected };
    }
  
    function diagnose(expected /* 'oui'|'non' */){
      const r = read();
      const issues = [];
      if (!r.found) issues.push({what:'group', why:'introuvable_ou_name_diff', hint:`Vérifie #${ID_OUI}/#${ID_NON} et name="${NAME}"`});
      else {
        if (!r.visible)  issues.push({what:'visibility', why:'masqué', hint:'Déplie/affiche la zone “Reprise de concurrence”.'});
        if (r.disabled)  issues.push({what:'state', why:'désactivé', hint:'Condition du parcours non remplie.'});
        if (expected && r.value !== expected.toLowerCase())
          issues.push({what:'value', why:'différente', got:r.value, expected: expected.toLowerCase()});
      }
      return { read:r, issues };
    }
  
    // Option pratique: régler reprise + (facultatif) résiliation derrière
    async function setWithResiliation(reprise /* 'oui'|'non' */, resiliation /* 'oui'|'non'|undefined */){
      const r1 = await set(reprise);
      let r2 = null;
      if (resiliation && window.SLS_RESILIATION_EXACT?.set) {
        r2 = await window.SLS_RESILIATION_EXACT.set(resiliation);
      }
      return { reprise:r1, resiliation:r2 };
    }
  
    window.SLS_REPRISE_EXACT = { read, set, check, diagnose, setWithResiliation };
    console.log("✅ SLS_REPRISE_EXACT prêt. Exemples :");
    console.log("await SLS_REPRISE_EXACT.set('non');");
    console.log("SLS_REPRISE_EXACT.check('non');");
    console.log("SLS_REPRISE_EXACT.diagnose('non');");
    console.log("// Couplage éventuel avec la résiliation :");
    console.log("await SLS_REPRISE_EXACT.setWithResiliation('oui','oui');");
  })();
  

  // ==== SLS_NEXT — Bouton "Suivant" (trouver, vérifier, cliquer, diagnostiquer) ====
  // A coller dans l'iFrame tarificateur (oav-pool2…)
  // Couvre: #bt-suite-projet + variantes visibles "Suivant" / "Suite" / "Continuer"

(() => {
  // --- Utils ---
  const T = s => (s||"").toString().replace(/\s+/g," ").trim();
  const q  = sel => { try { return document.querySelector(sel); } catch { return null; } };
  const qa = sel => { try { return [...document.querySelectorAll(sel)]; } catch { return []; } };
  const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
  function isVisible(el){
    if (!el || !el.isConnected) return false;
    let p=el;
    while(p){
      if (p.hidden || p.getAttribute?.('aria-hidden')==='true') return false;
      const st=getComputedStyle(p);
      if (st.display==='none'||st.visibility==='hidden'||st.opacity==='0') return false;
      p=p.parentElement;
    }
    const r=el.getBoundingClientRect();
    return r.width>0 && r.height>0;
  }
  function isDisabled(el){
    if (!el) return true;
    const st = getComputedStyle(el);
    return !!(el.disabled || el.getAttribute('aria-disabled')==='true' || /\b(disable|desactive|disabled)\b/i.test(el.className||'') || st.pointerEvents==='none');
  }
  function overlay(){ return !!q('.blockUI.blockOverlay, .blockUI.blockMsg'); }
  async function waitOverlayGone(timeout=10000){
    const t0=Date.now();
    while(Date.now()-t0<timeout){ if(!overlay()) return true; await wait(80); }
    return true;
  }
  async function waitStable({minQuiet=350,maxWait=8000}={}) {
    let last = Date.now();
    const mo = new MutationObserver(()=>{ last = Date.now(); });
    mo.observe(document.body, {subtree:true, childList:true, attributes:true});
    const start = Date.now();
    while (Date.now()-start < maxWait) {
      if (Date.now()-last >= minQuiet) { mo.disconnect(); return true; }
      await wait(80);
    }
    mo.disconnect(); return false;
  }
  function clickHuman(el){
    const mk = (type) => new MouseEvent(type,{bubbles:true,cancelable:true,view:window});
    el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    el.dispatchEvent(mk('mousedown'));
    el.dispatchEvent(mk('mouseup'));
    el.dispatchEvent(mk('click'));
  }

  // --- Localisation du bouton Suivant ---
  function findCandidates(){
    const texts = /^(suivant|suite|continuer|page\s*suivante)$/i;
    const ids   = /(bt-)?suite|suivant|next/i;

    const cand = new Set();

    // 1) ID connu vu dans tes captures
    const known = ['#bt-suite-projet','#bt-suite-confortHospitalisation','#bt-souscription-suite']
      .map(sel => q(sel)).filter(Boolean);
    known.forEach(n => cand.add(n));

    // 2) Boutons/inputs/links avec texte "Suivant"/"Suite"/"Continuer"
    qa('button, a, [role="button"], input[type="button"], input[type="submit"]')
      .forEach(n=>{
        const label = T(n.innerText || n.value || n.getAttribute('aria-label') || '');
        if (texts.test(label)) cand.add(n);
      });

    // 3) IDs/classes évoquant "suite/suivant"
    qa('*[id], *[class]').forEach(n=>{
      const id = n.id||'', cls = n.className||'';
      if (ids.test(id) || ids.test(cls)) cand.add(n);
    });

    // Filtre: visibles, cliquables
    return [...cand].filter(isVisible);
  }

  function bestCandidate(){
    const list = findCandidates();
    if (!list.length) return null;
    // heuristique: privilégier <button> puis <a> puis <input>
    const rank = el => el.tagName==='BUTTON' ? 0 : (el.tagName==='A'?1:2);
    list.sort((a,b)=>rank(a)-rank(b));
    return list[0];
  }

  // --- Erreurs de validation visibles (si le clic refuse d'avancer) ---
  function listVisibleErrors(){
    const sel =
      'label.error, .error, .has-error, .field-error, .text-danger, .help-block, .message-erreur, .error-block, [aria-invalid="true"]';
    const out = [];
    qa(sel).forEach(n=>{
      if (!isVisible(n)) return;
      // remonter à la zone
      let p=n, label=null, input=null;
      for(let i=0;i<4 && p;i++,p=p.parentElement){
        label = label || p.querySelector?.('label');
        input = input || p.querySelector?.('input,select,textarea');
      }
      const msg = T(n.innerText || n.getAttribute('title') || n.getAttribute('data-original-title') || '');
      if (msg) out.push({
        msg,
        nearLabel: T(label?.innerText||''),
        inputId: input?.id||null,
        inputName: input?.name||null
      });
    });
    // attributs errormessagelbl (site SwissLife)
    qa('input[errormessagelbl], select[errormessagelbl], textarea[errormessagelbl]').forEach(el=>{
      const invalid = el.classList.contains('error') || el.getAttribute('aria-invalid')==='true';
      if (invalid && isVisible(el)) {
        out.push({ msg: T(el.getAttribute('errormessagelbl')), nearLabel: '', inputId: el.id||null, inputName: el.name||null });
      }
    });
    return out;
  }

  // --- API ---
  function read(){
    const el = bestCandidate();
    if (!el) return {found:false};
    return {
      found:true,
      id: el.id||null,
      tag: el.tagName.toLowerCase(),
      text: T(el.innerText || el.value || el.getAttribute('aria-label') || ''),
      visible: isVisible(el),
      disabled: isDisabled(el),
      className: el.className||''
    };
  }

  async function click(){
    const el = bestCandidate();
    if (!el) return { ok:false, reason:'not_found', hint:'Bouton "Suivant" introuvable sur ce step.' };
    if (isDisabled(el)) return { ok:false, reason:'disabled', detail: read() };

    try {
      el.scrollIntoView({behavior:'instant', block:'center'});
    } catch {}
    clickHuman(el);

    await wait(100);
    await waitOverlayGone();
    await waitStable();

    // Si des erreurs visibles → on les renvoie
    const errors = listVisibleErrors();
    return { ok: errors.length===0, after: read(), errors };
  }

  function checkAdvanced(){
    const r = read();
    const errors = listVisibleErrors();
    console.table([{
      champ:'ui.suivant',
      present: r.found,
      visible: !!r.visible,
      disabled: !!r.disabled,
      text: r.text||'(?)',
      errors: errors.length
    }]);
    return { bouton: r, errors };
  }

  function diagnose(){
    const r = read();
    const issues = [];
    if (!r.found) issues.push({what:'button', why:'introuvable', hint:'Assure-toi d’être dans la bonne iFrame/étape.'});
    else {
      if (!r.visible)  issues.push({what:'button', why:'masque', hint:'Déplie la section ou scrolle dans la page.'});
      if (r.disabled)  issues.push({what:'button', why:'désactivé', hint:'Champ requis manquant ou étape non prête.'});
    }
    const errors = listVisibleErrors();
    if (errors.length) issues.push({what:'validation', why:'erreurs_visibles', errors});
    if (overlay()) issues.push({what:'ui', why:'overlay_en_cours'});
    return { read:r, issues };
  }

  window.SLS_NEXT = { read, click, checkAdvanced, diagnose };

  console.log("✅ SLS_NEXT prêt. Exemples :");
  console.log("SLS_NEXT.read();          // état du bouton");
  console.log("await SLS_NEXT.click();   // clique 'Suivant' + attend chargement");
  console.log("SLS_NEXT.checkAdvanced(); // synthèse + erreurs visibles");
  console.log("SLS_NEXT.diagnose();      // diagnostic détaillé");
})();



