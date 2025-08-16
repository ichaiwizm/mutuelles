import { BaseParser } from './BaseParser.js';

export class GenericParser extends BaseParser {
  static canParse(content) {
    // Le parser générique peut toujours tenter d'analyser le contenu
    return true;
  }

  static parse(content) {
    const normalizedContent = this.normalizeContent(content);
    
    const data = {
      contact: this.extractContactInfo(normalizedContent),
      souscripteur: this.extractSouscripteurInfo(normalizedContent),
      conjoint: this.extractConjointInfo(normalizedContent),
      enfants: this.extractEnfantsInfo(normalizedContent),
      besoins: this.extractBesoinsInfo(normalizedContent),
      signature: this.extractSignatureInfo(normalizedContent)
    };

    return data;
  }

  static extractContactInfo(text) {
    const contact = {};
    
    // Civilité
    const civiliteMatch = text.match(/(?:Civilité|Titre)\s*:\s*(M\.|Mme|Mlle|Dr|Me)/i);
    if (civiliteMatch) contact.civilite = this.normalizeCivilite(civiliteMatch[1]);
    
    // Nom et Prénom
    const nomMatch = text.match(/(?:Nom)\s*:\s*([A-Za-zÀ-ÿ\-\s]+)/i);
    if (nomMatch) contact.nom = this.capitalizeWords(nomMatch[1].trim());
    
    const prenomMatch = text.match(/(?:Prénom|Prenom)\s*:\s*([A-Za-zÀ-ÿ\-\s]+)/i);
    if (prenomMatch) contact.prenom = this.capitalizeWords(prenomMatch[1].trim());
    
    // Email
    const emailMatch = text.match(/(?:Email|Mail|Courriel)\s*:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) contact.email = emailMatch[1].toLowerCase();
    
    // Email global (fallback)
    if (!contact.email) {
      const globalEmailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (globalEmailMatch) contact.email = globalEmailMatch[0].toLowerCase();
    }
    
    // Téléphone
    const telMatch = text.match(/(?:Tél(?:éphone)?|Phone|Mobile)\s*:\s*([\d\s\-\+\(\)\.]+)/i);
    if (telMatch) contact.telephone = this.normalizeTelephone(telMatch[1]);
    
    // Téléphone global (fallback)
    if (!contact.telephone) {
      const phonePatterns = [
        /(?:\+33|0)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}/,
        /\d{2}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2}/
      ];
      
      for (const pattern of phonePatterns) {
        const phoneMatch = text.match(pattern);
        if (phoneMatch) {
          contact.telephone = this.normalizeTelephone(phoneMatch[0]);
          break;
        }
      }
    }
    
    // Adresse
    const adresseMatch = text.match(/(?:Adresse)\s*:\s*([^\n]+)/i);
    if (adresseMatch) contact.adresse = adresseMatch[1].trim();
    
    // Code postal
    const cpMatch = text.match(/(?:Code postal|CP)\s*:\s*(\d{4,5})/i);
    if (cpMatch) contact.codePostal = cpMatch[1];
    
    // Ville
    const villeMatch = text.match(/(?:Ville)\s*:\s*([A-Za-zÀ-ÿ\-\s]+)/i);
    if (villeMatch) contact.ville = this.capitalizeWords(villeMatch[1].trim());
    
    // Recherche de noms propres (heuristique)
    if (!contact.nom || !contact.prenom) {
      const namePattern = /(?:M\.|Mme|Monsieur|Madame)\s+([A-Z][a-zÀ-ÿ]+)\s+([A-Z][A-ZÀ-ÿ]+)/;
      const nameMatch = text.match(namePattern);
      if (nameMatch) {
        if (!contact.prenom) contact.prenom = this.capitalizeWords(nameMatch[1]);
        if (!contact.nom) contact.nom = this.capitalizeWords(nameMatch[2]);
      }
    }
    
    return contact;
  }
  
  static extractSouscripteurInfo(text) {
    const souscripteur = {};
    
    // Date de naissance
    const dobMatch = text.match(/(?:Date de naissance|Né\(?e?\)? le|DOB)\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (dobMatch) souscripteur.dateNaissance = this.normalizeDate(dobMatch[1]);
    
    // Profession
    const profMatch = text.match(/(?:Profession|Métier|Emploi)\s*:\s*([^\n]+)/i);
    if (profMatch) souscripteur.profession = profMatch[1].trim();
    
    // Régime social
    const regimeMatch = text.match(/(?:Régime|Statut)\s*(?:social)?\s*:\s*(TNS|Salarié|Retraité|Libéral|Fonctionnaire|Indépendant)/i);
    if (regimeMatch) souscripteur.regimeSocial = this.normalizeRegime(regimeMatch[1]);
    
    // Nombre d'enfants
    const enfantsMatch = text.match(/(?:Nombre d'enfants?)\s*:\s*(\d+)/i);
    if (enfantsMatch) souscripteur.nombreEnfants = parseInt(enfantsMatch[1]);
    
    return souscripteur;
  }
  
  static extractConjointInfo(text) {
    // Rechercher une section conjoint
    const conjointSection = text.match(/Conjoint\s*:?\s*(.*?)(?=\n[A-Z]|\n\n|$)/si);
    if (!conjointSection) return null;
    
    const conjointText = conjointSection[1];
    const conjoint = {};
    
    // Date de naissance
    const dobMatch = conjointText.match(/(?:Date de naissance|Né\(?e?\)? le|DOB)\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (dobMatch) conjoint.dateNaissance = this.normalizeDate(dobMatch[1]);
    
    // Profession
    const profMatch = conjointText.match(/(?:Profession|Métier|Emploi)\s*:\s*([^\n]+)/i);
    if (profMatch) conjoint.profession = profMatch[1].trim();
    
    // Régime social
    const regimeMatch = conjointText.match(/(?:Régime|Statut)\s*(?:social)?\s*:\s*(TNS|Salarié|Retraité|Libéral|Fonctionnaire|Indépendant)/i);
    if (regimeMatch) conjoint.regimeSocial = this.normalizeRegime(regimeMatch[1]);
    
    return Object.keys(conjoint).length > 0 ? conjoint : null;
  }
  
  static extractEnfantsInfo(text) {
    const enfants = [];
    
    // Patterns pour les dates de naissance des enfants
    const patterns = [
      /Date de naissance du (\d+)(?:er|ème|e)? enfant\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /(\d+)(?:er|ème|e)? enfant\s*:\s*(?:né le\s*)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /Enfant (\d+)\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
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
  
  static extractBesoinsInfo(text) {
    const besoins = {};
    
    // Date d'effet
    const effetMatch = text.match(/(?:Date d'effet|Effet au|À partir du)\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (effetMatch) besoins.dateEffet = this.normalizeDate(effetMatch[1]);
    
    // Assuré actuellement
    const assureMatch = text.match(/(?:Actuellement assuré|Déjà assuré|Assuré)\s*:\s*(Oui|Non)/i);
    if (assureMatch) besoins.assureActuellement = assureMatch[1].toLowerCase() === 'oui';
    
    // Niveaux de garantie
    const niveaux = {};
    
    const soinsMatch = text.match(/(?:Soins médicaux|Consultations?)\s*(?:niveau)?\s*:\s*(\d)/i);
    if (soinsMatch) niveaux.soinsMedicaux = parseInt(soinsMatch[1]);
    
    const hospiMatch = text.match(/(?:Hospitalisation)\s*(?:niveau)?\s*:\s*(\d)/i);
    if (hospiMatch) niveaux.hospitalisation = parseInt(hospiMatch[1]);
    
    const optiqueMatch = text.match(/(?:Optique|Lunettes)\s*(?:niveau)?\s*:\s*(\d)/i);
    if (optiqueMatch) niveaux.optique = parseInt(optiqueMatch[1]);
    
    const dentaireMatch = text.match(/(?:Dentaire|Dents)\s*(?:niveau)?\s*:\s*(\d)/i);
    if (dentaireMatch) niveaux.dentaire = parseInt(dentaireMatch[1]);
    
    if (Object.keys(niveaux).length > 0) {
      besoins.niveaux = niveaux;
    }
    
    return besoins;
  }
  
  static extractSignatureInfo(text) {
    const signature = {};
    
    // Numéro ORIAS (courtier assurance)
    const oriasMatch = text.match(/N°\s*ORIAS\s*:\s*(\d+)/i);
    if (oriasMatch) signature.numeroOrias = oriasMatch[1];
    
    // SIREN entreprise
    const sirenMatch = text.match(/SIREN\s*(\d{9})/i);
    if (sirenMatch) signature.siren = sirenMatch[1];
    
    // Site web
    const siteMatch = text.match(/Site\s*web\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (siteMatch) signature.siteWeb = siteMatch[1];
    
    // Instagram
    const instaMatch = text.match(/Instagram\s*@?([a-zA-Z0-9_]+)/i);
    if (instaMatch) signature.instagram = instaMatch[1];
    
    // RCP (Responsabilité Civile Professionnelle)
    const rcpMatch = text.match(/RCP\s*Prof\s*n°\s*(\d+)/i);
    if (rcpMatch) signature.numeroRCP = rcpMatch[1];
    
    // Nom entreprise en début de signature
    const entrepriseMatch = text.match(/^([A-Z][A-Za-z\s&-]+)\s*–\s*SIREN/m);
    if (entrepriseMatch) signature.nomEntreprise = entrepriseMatch[1].trim();
    
    return Object.keys(signature).length > 0 ? signature : null;
  }
}