export class MessageExtractor {
  static extractGmailContent(message) {
    let content = '';
    let subject = '';
    let date = '';
    
    // Extraire les headers
    const headers = message.payload?.headers || [];
    
    // Extraire le sujet
    const subjectHeader = headers.find(h => h.name === 'Subject');
    if (subjectHeader) {
      subject = subjectHeader.value;
    }
    
    // Extraire la date
    const dateHeader = headers.find(h => h.name === 'Date');
    if (dateHeader) {
      date = dateHeader.value;
    }
    
    // Extraire le contenu du corps
    content = this._extractBody(message.payload);
    
    return { subject, content, date };
  }

  static _extractBody(payload) {
    if (!payload) return '';
    
    // Corps simple
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    
    // Corps multipart
    if (payload.parts) {
      return this._extractBodyFromParts(payload.parts);
    }
    
    return '';
  }

  static _extractBodyFromParts(parts) {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        return this._htmlToText(html);
      } else if (part.parts) {
        const result = this._extractBodyFromParts(part.parts);
        if (result) return result;
      }
    }
    return '';
  }

  static _htmlToText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}