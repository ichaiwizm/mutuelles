import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  // Nombre de jours à récupérer
  days: 7,
  
  // Nombre maximum de messages à récupérer
  maxResults: 100,
  
  // Query Gmail additionnelle (ex: "from:contact@assurprospect.fr")
  query: '',
  
  // Dossier de sortie pour les emails bruts
  outputDir: path.join(__dirname, 'mails'),
  
  // Dossier de sortie pour les emails parsés
  parsedDir: path.join(__dirname, 'parsed'),
  
  // Format de nom de fichier
  fileFormat: 'email_{timestamp}_{id}',
  
  // Sauvegarder le HTML brut séparément
  saveHtmlSeparately: true,
  
  // Mode debug (plus de logs)
  debug: true,
  
  // Filtrer par labels Gmail
  labels: [],
  
  // Sauvegarder les pièces jointes
  saveAttachments: false
};