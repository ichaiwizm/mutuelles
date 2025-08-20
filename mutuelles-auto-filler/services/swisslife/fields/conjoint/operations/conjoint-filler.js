/**
 * Remplisseur de conjoint - Opérations de remplissage des données conjoint
 * Responsable du remplissage des formulaires conjoint
 */

import { isVisible, bringIntoView, dispatchHumanChange } from '../../../utils/dom-utils.js';
import { setSelectByValueOrText, aliasResolveSync } from '../../../utils/form-utils.js';
import { wait, waitStable, waitOverlayGone } from '../../../utils/async-utils.js';
import { 
  findDateElement, 
  findRegimeSelect, 
  findStatutSelect, 
  findProfessionSelect,
  openConjointTab
} from '../core/conjoint-detector.js';
import { normalizeConjointConfig, DEFAULT_CONFIG } from '../core/conjoint-mapper.js';

/**
 * Remplit tous les champs conjoint
 */
export async function fillAllConjointFields(cfg = DEFAULT_CONFIG) {
  const config = normalizeConjointConfig(cfg);
  
  console.log('🔍 conjoint-filler.fillAll - config reçu:', cfg);
  console.log('🔍 conjoint-filler.fillAll - config mappé:', config);
  
  await waitOverlayGone();
  
  // S'assurer que l'onglet est ouvert
  const tabResult = await openConjointTab();
  if (!tabResult.ok) return tabResult;
  
  await wait(200);
  
  const actions = [];
  
  // Date de naissance
  const dateEl = findDateElement();
  if (dateEl && config.dateNaissance) {
    if (!isVisible(dateEl)) {
      bringIntoView(dateEl);
      await wait(200);
    }
    
    dateEl.focus();
    dateEl.value = config.dateNaissance;
    dispatchHumanChange(dateEl);
    actions.push({ field: 'dateNaissance', value: config.dateNaissance });
  }
  
  // Régime social
  const regimeEl = findRegimeSelect();
  if (regimeEl && config.regimeSocial) {
    const resolved = aliasResolveSync('regimeSocial', config.regimeSocial);
    const ok = setSelectByValueOrText(regimeEl, resolved);
    if (ok) actions.push({ field: 'regimeSocial', value: resolved });
  }
  
  // Statut
  const statutEl = findStatutSelect();
  if (statutEl && config.statut) {
    const resolved = aliasResolveSync('statut', config.statut);
    const ok = setSelectByValueOrText(statutEl, resolved);
    if (ok) actions.push({ field: 'statut', value: resolved });
  }
  
  // Profession (optionnel)
  const profEl = findProfessionSelect();
  if (profEl && config.profession) {
    const resolved = aliasResolveSync('profession', config.profession);
    const ok = setSelectByValueOrText(profEl, resolved);
    if (ok) actions.push({ field: 'profession', value: resolved });
  }
  
  await waitStable();
  
  return { ok: true, actions };
}