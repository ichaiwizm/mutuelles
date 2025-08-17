import { ParserOrchestrator } from './parsers/ParserOrchestrator.js';

export class ParsingService {
  static parseContent(content, source, subject = '', fullContent = null, emailDate = null, originalMessage = null) {
    return ParserOrchestrator.parseContent(content, source, subject, fullContent, emailDate, originalMessage);
  }

  static getAvailableParsers() {
    return ParserOrchestrator.getAvailableParsers();
  }
}