export class BaseParser {
  static normalizeContent(content) {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      // Préserver les retours à la ligne importants tout en nettoyant les espaces
      .replace(/[ \t]+/g, ' ')  // Remplacer seulement les espaces/tabs multiples
      .replace(/\n[ \t]+/g, '\n')  // Nettoyer les espaces en début de ligne
      .replace(/[ \t]+\n/g, '\n')  // Nettoyer les espaces en fin de ligne
      .replace(/\n{3,}/g, '\n\n')  // Limiter les retours à la ligne multiples
      .trim();
  }

  static normalizeCivilite(civilite) {
    const mapping = {
      'M.': 'M.',
      'M': 'M.',
      'Monsieur': 'M.',
      'Mr': 'M.',
      'Mme': 'Mme',
      'Madame': 'Mme',
      'Mlle': 'Mlle',
      'Mademoiselle': 'Mlle',
      'Dr': 'Dr',
      'Docteur': 'Dr',
      'Me': 'Me',
      'Maître': 'Me'
    };
    return mapping[civilite] || civilite;
  }

  static capitalizeWords(str) {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  static normalizeTelephone(tel) {
    let normalized = tel.replace(/[^\d+]/g, '');
    if (normalized.length >= 10) {
      return normalized;
    }
    return tel;
  }

  static normalizeDate(dateStr) {
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      let day = parts[0];
      let month = parts[1];
      let year = parts[2];
      
      if (year.length === 2) {
        year = parseInt(year) > 50 ? '19' + year : '20' + year;
      }
      
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  }

  static normalizeRegime(regime) {
    const mapping = {
      'TNS': 'TNS',
      'TNS : régime des indépendants': 'TNS',
      'Salarié': 'Salarié',
      'Salarié (ou retraité)': 'Salarié',
      'Retraité': 'Retraité',
      'Libéral': 'Libéral',
      'Profession libérale': 'Libéral',
      'Fonctionnaire': 'Fonctionnaire',
      'Indépendant': 'Indépendant'
    };
    return mapping[regime] || regime;
  }

  static calculateScore(data) {
    let score = 0;
    const scoreDetails = [];

    console.log('📊 === CALCUL DU SCORE ===');
    console.log('📊 Données d\'entrée:', JSON.stringify(data, null, 2));

    // Contact (0-1.5 points)
    if (data.contact.nom && data.contact.prenom) {
      score += 0.5;
      scoreDetails.push(`✅ Nom + Prénom: +0.5 (${data.contact.nom} ${data.contact.prenom})`);
    } else {
      scoreDetails.push(`❌ Nom + Prénom: +0.0 (nom: ${data.contact.nom || 'manquant'}, prénom: ${data.contact.prenom || 'manquant'})`);
    }

    if (data.contact.email) {
      score += 0.5;
      scoreDetails.push(`✅ Email: +0.5 (${data.contact.email})`);
    } else {
      scoreDetails.push(`❌ Email: +0.0`);
    }

    if (data.contact.telephone) {
      score += 0.5;
      scoreDetails.push(`✅ Téléphone: +0.5 (${data.contact.telephone})`);
    } else {
      scoreDetails.push(`❌ Téléphone: +0.0`);
    }

    if (data.contact.adresse && data.contact.codePostal && data.contact.ville) {
      score += 1;
      scoreDetails.push(`✅ Adresse complète: +1.0 (${data.contact.adresse}, ${data.contact.codePostal} ${data.contact.ville})`);
    } else {
      scoreDetails.push(`❌ Adresse complète: +0.0 (adresse: ${data.contact.adresse || 'manquant'}, CP: ${data.contact.codePostal || 'manquant'}, ville: ${data.contact.ville || 'manquant'})`);
    }

    // Souscripteur (0-1.5 points)
    if (data.souscripteur.dateNaissance) {
      score += 0.5;
      scoreDetails.push(`✅ Date naissance: +0.5 (${data.souscripteur.dateNaissance})`);
    } else {
      scoreDetails.push(`❌ Date naissance: +0.0`);
    }

    if (data.souscripteur.profession) {
      score += 0.5;
      scoreDetails.push(`✅ Profession: +0.5 (${data.souscripteur.profession})`);
    } else {
      scoreDetails.push(`❌ Profession: +0.0`);
    }

    if (data.souscripteur.regimeSocial) {
      score += 0.5;
      scoreDetails.push(`✅ Régime social: +0.5 (${data.souscripteur.regimeSocial})`);
    } else {
      scoreDetails.push(`❌ Régime social: +0.0`);
    }

    // Besoins (0-1.5 points)
    if (data.besoins.dateEffet) {
      score += 0.5;
      scoreDetails.push(`✅ Date effet: +0.5 (${data.besoins.dateEffet})`);
    } else {
      scoreDetails.push(`❌ Date effet: +0.0`);
    }

    if (data.besoins.assureActuellement !== undefined) {
      score += 0.5;
      scoreDetails.push(`✅ Statut assuré: +0.5 (${data.besoins.assureActuellement ? 'Oui' : 'Non'})`);
    } else {
      scoreDetails.push(`❌ Statut assuré: +0.0`);
    }

    if (data.besoins.niveaux && Object.keys(data.besoins.niveaux).length > 0) {
      score += 0.5;
      const niveaux = Object.entries(data.besoins.niveaux).map(([k, v]) => `${k}:${v}`).join(', ');
      scoreDetails.push(`✅ Niveaux garantie: +0.5 (${niveaux})`);
    } else {
      scoreDetails.push(`❌ Niveaux garantie: +0.0`);
    }

    // Bonus points (0-1 point)
    if (data.conjoint) {
      score += 0.5;
      scoreDetails.push(`✅ Conjoint: +0.5 (${data.conjoint.profession || 'info conjoint présente'})`);
    } else {
      scoreDetails.push(`❌ Conjoint: +0.0`);
    }

    if (data.enfants.length > 0) {
      score += 0.5;
      scoreDetails.push(`✅ Enfants: +0.5 (${data.enfants.length} enfant(s))`);
    } else {
      scoreDetails.push(`❌ Enfants: +0.0`);
    }

    const finalScore = Math.min(Math.round(score), 5);

    console.log('📊 === DÉTAIL DU SCORING ===');
    scoreDetails.forEach(detail => console.log(`📊 ${detail}`));
    console.log(`📊 === RÉSULTAT ===`);
    console.log(`📊 Score brut: ${score.toFixed(1)}`);
    console.log(`📊 Score final (arrondi, max 5): ${finalScore}/5`);
    console.log('📊 === FIN CALCUL ===');

    return finalScore;
  }

  static createSnippet(content, extractedData, length = 300) {
    let snippet = '';
    let firstMatchPos = content.length;

    if (extractedData.contact.email) {
      const pos = content.indexOf(extractedData.contact.email);
      if (pos !== -1 && pos < firstMatchPos) firstMatchPos = pos;
    }

    if (extractedData.contact.telephone) {
      const pos = content.indexOf(extractedData.contact.telephone);
      if (pos !== -1 && pos < firstMatchPos) firstMatchPos = pos;
    }

    const start = Math.max(0, firstMatchPos - 100);
    const end = Math.min(content.length, start + length);
    snippet = content.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }
}