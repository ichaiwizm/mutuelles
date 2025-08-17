import { oauth2Client } from '../config/oauth.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN_PATH = path.join(__dirname, '../tokens.json');

/**
 * Helper pour gérer l'authentification OAuth
 */
class AuthHelper {
  /**
   * Vérifie si un token est disponible et valide
   */
  static async checkAuth() {
    try {
      // Essayer de charger le token depuis le fichier
      const tokenData = await fs.readFile(TOKEN_PATH, 'utf-8');
      const tokens = JSON.parse(tokenData);
      
      if (tokens.access_token) {
        oauth2Client.setCredentials(tokens);
        console.log('✅ Token chargé depuis le fichier');
        return true;
      }
    } catch (error) {
      // Fichier non trouvé ou invalide
    }
    
    // Vérifier si le token est déjà en mémoire
    if (oauth2Client.credentials?.access_token) {
      console.log('✅ Token déjà en mémoire');
      return true;
    }
    
    console.log('❌ Aucun token d\'authentification trouvé');
    return false;
  }
  
  /**
   * Sauvegarde le token actuel dans un fichier
   */
  static async saveToken() {
    if (oauth2Client.credentials?.access_token) {
      await fs.writeFile(
        TOKEN_PATH,
        JSON.stringify(oauth2Client.credentials, null, 2),
        'utf-8'
      );
      console.log('💾 Token sauvegardé');
    }
  }
  
  /**
   * Instructions pour s'authentifier
   */
  static showAuthInstructions() {
    console.log('\n' + '='.repeat(50));
    console.log('🔐 AUTHENTIFICATION REQUISE');
    console.log('='.repeat(50));
    console.log('\nPour utiliser ces scripts, vous devez d\'abord vous authentifier :');
    console.log('\n1. Lancez le serveur principal :');
    console.log('   cd ../');
    console.log('   npm run dev');
    console.log('\n2. Ouvrez votre navigateur et allez sur :');
    console.log('   http://localhost:3001/auth/google');
    console.log('\n3. Connectez-vous avec votre compte Google');
    console.log('\n4. Une fois authentifié, revenez ici et relancez le script');
    console.log('='.repeat(50) + '\n');
  }
}

// Fonction pour vérifier l'auth avant d'exécuter un script
export async function requireAuth() {
  const isAuthenticated = await AuthHelper.checkAuth();
  
  if (!isAuthenticated) {
    AuthHelper.showAuthInstructions();
    process.exit(1);
  }
  
  return true;
}

export { AuthHelper };