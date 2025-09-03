import fs from 'fs';
import path from 'path';
import logger from '../logger.js';

const TOKENS_FILE = path.join(process.cwd(), 'tokens.json');

export class TokensService {
  static save(tokens) {
    try {
      if (tokens === null) {
        // Si tokens est null, supprimer le fichier
        this.delete();
        return;
      }
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
      logger.info('Tokens saved successfully');
    } catch (error) {
      logger.error('Error saving tokens:', error);
      throw error;
    }
  }

  static load() {
    try {
      if (fs.existsSync(TOKENS_FILE)) {
        const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
        logger.info('Tokens loaded successfully');
        return tokens;
      }
      logger.info('No tokens file found');
      return null;
    } catch (error) {
      logger.error('Error loading tokens:', error);
      return null;
    }
  }

  static exists() {
    return fs.existsSync(TOKENS_FILE);
  }

  static delete() {
    try {
      if (fs.existsSync(TOKENS_FILE)) {
        fs.unlinkSync(TOKENS_FILE);
        logger.info('Tokens file deleted successfully');
      } else {
        logger.info('No tokens file to delete');
      }
    } catch (error) {
      logger.error('Error deleting tokens file:', error);
      throw error;
    }
  }

}