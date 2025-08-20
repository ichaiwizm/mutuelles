/**
 * Format de réponse uniforme pour tous les services SwissLife
 * Standard : {ok: boolean, data?: any, error?: {code: string, message: string}}
 */

/**
 * Codes d'erreur standardisés
 */
export const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  HIDDEN: 'HIDDEN', 
  DISABLED: 'DISABLED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALUE_MISMATCH: 'VALUE_MISMATCH',
  ALREADY_SET: 'ALREADY_SET',
  NO_CHANGE: 'NO_CHANGE',
  OVERLAY_PRESENT: 'OVERLAY_PRESENT',
  TIMEOUT: 'TIMEOUT'
};

/**
 * Messages d'erreur par défaut
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.NOT_FOUND]: 'Élément non trouvé',
  [ERROR_CODES.HIDDEN]: 'Élément masqué',
  [ERROR_CODES.DISABLED]: 'Élément désactivé',
  [ERROR_CODES.VALIDATION_ERROR]: 'Erreur de validation',
  [ERROR_CODES.VALUE_MISMATCH]: 'Valeur incorrecte',
  [ERROR_CODES.ALREADY_SET]: 'Valeur déjà définie',
  [ERROR_CODES.NO_CHANGE]: 'Aucun changement nécessaire',
  [ERROR_CODES.OVERLAY_PRESENT]: 'Overlay présent, attendre',
  [ERROR_CODES.TIMEOUT]: 'Délai d\'attente dépassé'
};

/**
 * Crée une réponse de succès
 */
export function success(data = null) {
  return {
    ok: true,
    ...(data !== null && { data })
  };
}

/**
 * Crée une réponse d'erreur
 */
export function error(code, customMessage = null) {
  return {
    ok: false,
    error: {
      code,
      message: customMessage || ERROR_MESSAGES[code] || 'Erreur inconnue'
    }
  };
}

/**
 * Convertit un ancien format vers le nouveau
 */
export function normalize(oldResponse) {
  // Si déjà au bon format
  if (typeof oldResponse === 'object' && 'ok' in oldResponse && ('data' in oldResponse || 'error' in oldResponse)) {
    return oldResponse;
  }

  // Si c'est un format ancien avec {ok: boolean, reason?: string}
  if (typeof oldResponse === 'object' && 'ok' in oldResponse) {
    if (oldResponse.ok) {
      const data = { ...oldResponse };
      delete data.ok;
      return success(Object.keys(data).length ? data : null);
    } else {
      return error(oldResponse.reason || 'UNKNOWN', oldResponse.message);
    }
  }

  // Si c'est une valeur primitive (string, null, etc.)
  if (oldResponse === null || oldResponse === undefined) {
    return success(null);
  }

  return success(oldResponse);
}

/**
 * Validation du format de réponse
 */
export function isValidResponse(response) {
  if (!response || typeof response !== 'object') return false;
  if (!('ok' in response) || typeof response.ok !== 'boolean') return false;
  
  if (response.ok) {
    return !('error' in response);
  } else {
    return 'error' in response && 
           typeof response.error === 'object' &&
           'code' in response.error && 
           'message' in response.error;
  }
}