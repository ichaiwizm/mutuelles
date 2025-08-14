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

  static extractCalendarContent(event) {
    const content = [
      event.summary || '',
      event.description || '',
      event.location || '',
      ...(event.attendees || []).map(a => 
        `${a.displayName || ''} ${a.email || ''}`
      ).filter(Boolean)
    ].join('\n');

    return {
      subject: event.summary || '',
      content,
      date: event.start?.dateTime || event.start?.date || ''
    };
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
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}