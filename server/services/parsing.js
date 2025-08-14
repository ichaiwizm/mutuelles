import { ParserOrchestrator } from './parsers/ParserOrchestrator.js';

export class ParsingService {
  static parseContent(content, source, subject = '', fullContent = null, emailDate = null) {
    return ParserOrchestrator.parseContent(content, source, subject, fullContent, emailDate);
  }

  static getAvailableParsers() {
    return ParserOrchestrator.getAvailableParsers();
  }
}