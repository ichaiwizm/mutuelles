import { BaseParser } from './BaseParser.js';

export class AssurProspectParser extends BaseParser {
  static canParse(content) {
    return content.includes('AssurProspect') && 
           content.includes('Transmission d\'une fiche') &&
           content.includes('Voici les éléments de la fiche trio');
  }

  static parse(content) {
    console.log('🔍 === PARSING ASSURPROSPECT ===');
    console.log('🔍 Contenu original (premiers 200 chars):', content.substring(0, 200) + '...');
    
    const normalizedContent = this.normalizeContent(content);
    console.log('🔍 Contenu normalisé (premiers 200 chars):', normalizedContent.substring(0, 200) + '...');
    
    // Découper le contenu en sections
    const sections = this.extractSections(normalizedContent);
    console.log('🔍 Sections extraites:', Object.keys(sections));
    console.log('🔍 Détail des sections:', sections);
    
    // Extraire les données de chaque section
    console.log('🔍 === EXTRACTION PAR SECTION ===');
    
    const contact = this.extractContact(sections.contact || '');
    console.log('🔍 Contact extrait:', contact);
    
    const souscripteur = this.extractSouscripteur(sections.souscripteur || '');
    console.log('🔍 Souscripteur extrait:', souscripteur);
    
    const conjoint = this.extractConjoint(sections.conjoint || '');
    console.log('🔍 Conjoint extrait:', conjoint);
    
    const enfants = this.extractEnfants(sections.enfants || '');
    console.log('🔍 Enfants extraits:', enfants);
    
    const besoins = this.extractBesoins(sections.besoin || '');
    console.log('🔍 Besoins extraits:', besoins);
    
    const data = {
      contact,
      souscripteur,
      conjoint,
      enfants,
      besoins
    };

    console.log('🔍 === DONNÉES FINALES ===');
    console.log('🔍 Données complètes:', JSON.stringify(data, null, 2));
    console.log('🔍 === FIN PARSING ASSURPROSPECT ===');

    return data;
  }

  static extractSections(content) {
    const sections = {};
    
    console.log('📋 === EXTRACTION DES SECTIONS ===');
    console.log('📋 Contenu à découper:', content.substring(0, 300) + '...');
    
    // Découper par sections principales
    const sectionRegexes = {
      contact: /Contact\s*\n(.*?)(?=\n(?:Souscripteur|Conjoint|Enfants|Besoin|A noter))/s,
      souscripteur: /Souscripteur\s*\n(.*?)(?=\n(?:Conjoint|Enfants|Besoin|A noter))/s,
      conjoint: /Conjoint\s*\n(.*?)(?=\n(?:Enfants|Besoin|A noter))/s,
      enfants: /Enfants\s*\n(.*?)(?=\n(?:Besoin|A noter))/s,
      besoin: /Besoin\s*\n(.*?)(?=\n(?:A noter))/s
    };

    for (const [sectionName, regex] of Object.entries(sectionRegexes)) {
      console.log(`📋 Tentative extraction section "${sectionName}"...`);
      const match = content.match(regex);
      if (match) {
        sections[sectionName] = match[1].trim();
        console.log(`📋 ✅ Section "${sectionName}" trouvée (${match[1].length} chars):`, match[1].substring(0, 100) + '...');
      } else {
        console.log(`📋 ❌ Section "${sectionName}" non trouvée`);
      }
    }

    console.log('📋 === FIN EXTRACTION SECTIONS ===');
    return sections;
  }

  static extractContact(text) {
    const contact = {};

    // Civilité
    const civiliteMatch = text.match(/Civilité\s*:\s*(M\.|Mme|Mlle)/);
    if (civiliteMatch) {
      contact.civilite = this.normalizeCivilite(civiliteMatch[1]);
    }

    // Nom
    const nomMatch = text.match(/Nom\s*:\s*([^\n]+)/);
    if (nomMatch) {
      contact.nom = this.capitalizeWords(nomMatch[1].trim());
    }

    // Prénom
    const prenomMatch = text.match(/Prénom\s*:\s*([^\n]+)/);
    if (prenomMatch) {
      contact.prenom = this.capitalizeWords(prenomMatch[1].trim());
    }

    // Adresse
    const adresseMatch = text.match(/Adresse\s*:\s*([^\n]+)/);
    if (adresseMatch) {
      contact.adresse = adresseMatch[1].trim();
    }

    // Code postal
    const cpMatch = text.match(/Code postal\s*:\s*(\d{5})/);
    if (cpMatch) {
      contact.codePostal = cpMatch[1];
    }

    // Ville
    const villeMatch = text.match(/Ville\s*:\s*([^\n]+)/);
    if (villeMatch) {
      contact.ville = villeMatch[1].trim().toUpperCase();
    }

    // Téléphone
    const telMatch = text.match(/Téléphone\s*:\s*([\d\.\s]+)/);
    if (telMatch) {
      contact.telephone = this.normalizeTelephone(telMatch[1]);
    }

    // Email
    const emailMatch = text.match(/Email\s*:\s*([^\n\s]+)/);
    if (emailMatch) {
      contact.email = emailMatch[1].toLowerCase().trim();
    }

    return contact;
  }

  static extractSouscripteur(text) {
    const souscripteur = {};

    // Date de naissance
    const dobMatch = text.match(/Date de naissance\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dobMatch) {
      souscripteur.dateNaissance = this.normalizeDate(dobMatch[1]);
    }

    // Profession
    const profMatch = text.match(/Profession\s*:\s*([^\n]+)/);
    if (profMatch) {
      souscripteur.profession = profMatch[1].trim();
    }

    // Régime Social
    const regimeMatch = text.match(/Régime Social\s*:\s*([^\n]+)/);
    if (regimeMatch) {
      souscripteur.regimeSocial = this.normalizeRegime(regimeMatch[1].trim());
    }

    // Nombre d'enfants
    const enfantsMatch = text.match(/Nombre d'enfants\s*:\s*(\d+)/);
    if (enfantsMatch) {
      souscripteur.nombreEnfants = parseInt(enfantsMatch[1]);
    }

    return souscripteur;
  }

  static extractConjoint(text) {
    if (!text || text.trim() === '') return null;

    const conjoint = {};

    // Date de naissance
    const dobMatch = text.match(/Date de naissance\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dobMatch) {
      conjoint.dateNaissance = this.normalizeDate(dobMatch[1]);
    }

    // Profession
    const profMatch = text.match(/Profession\s*:\s*([^\n]+)/);
    if (profMatch) {
      conjoint.profession = profMatch[1].trim();
    }

    // Régime Social
    const regimeMatch = text.match(/Régime Social\s*:\s*([^\n]+)/);
    if (regimeMatch) {
      conjoint.regimeSocial = this.normalizeRegime(regimeMatch[1].trim());
    }

    return Object.keys(conjoint).length > 0 ? conjoint : null;
  }

  static extractEnfants(text) {
    const enfants = [];

    // Pattern pour extraire les dates de naissance des enfants
    const patterns = [
      /Date de naissance du (\d+)(?:er|ème|e)? enfant\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        enfants.push({
          dateNaissance: this.normalizeDate(match[2])
        });
      }
    }

    // Éliminer les doublons
    const uniqueEnfants = [];
    const seenDates = new Set();
    for (const enfant of enfants) {
      if (!seenDates.has(enfant.dateNaissance)) {
        uniqueEnfants.push(enfant);
        seenDates.add(enfant.dateNaissance);
      }
    }

    return uniqueEnfants;
  }

  static extractBesoins(text) {
    const besoins = {};

    // Date d'effet
    const effetMatch = text.match(/Date d'effet\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (effetMatch) {
      besoins.dateEffet = this.normalizeDate(effetMatch[1]);
    }

    // Souscripteur actuellement assuré
    const assureMatch = text.match(/Souscripteur actuellement assuré\s*:\s*(Oui|Non)/);
    if (assureMatch) {
      besoins.assureActuellement = assureMatch[1] === 'Oui';
    }

    // Niveaux de garantie
    const niveaux = {};

    const soinsMatch = text.match(/Soins médicaux\s*:\s*(\d)/);
    if (soinsMatch) {
      niveaux.soinsMedicaux = parseInt(soinsMatch[1]);
    }

    const hospiMatch = text.match(/Hospitalisation\s*:\s*(\d)/);
    if (hospiMatch) {
      niveaux.hospitalisation = parseInt(hospiMatch[1]);
    }

    const optiqueMatch = text.match(/Optique\s*:\s*(\d)/);
    if (optiqueMatch) {
      niveaux.optique = parseInt(optiqueMatch[1]);
    }

    const dentaireMatch = text.match(/Dentaire\s*:\s*(\d)/);
    if (dentaireMatch) {
      niveaux.dentaire = parseInt(dentaireMatch[1]);
    }

    if (Object.keys(niveaux).length > 0) {
      besoins.niveaux = niveaux;
    }

    return besoins;
  }
}