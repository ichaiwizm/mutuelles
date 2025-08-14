import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { ParsingService } from './services/parsing.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors());
app.use(express.json());

// Configuration OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Stockage des tokens dans un fichier
import fs from 'fs';
import path from 'path';

const TOKENS_FILE = path.join(process.cwd(), 'tokens.json');

function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
  return null;
}

let userTokens = loadTokens();

// Routes d'authentification
app.get('/auth/google/start', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    userTokens = tokens;
    saveTokens(tokens);
    
    res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send('Authentication failed');
  }
});

// Route pour vérifier l'état d'authentification
app.get('/api/auth/status', (req, res) => {
  if (userTokens) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// Route pour obtenir des informations sur les parsers disponibles
app.get('/api/parsers', (req, res) => {
  const parsers = ParsingService.getAvailableParsers();
  res.json({ parsers });
});

// Middleware pour vérifier l'authentification
const checkAuth = (req, res, next) => {
  if (!userTokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  oauth2Client.setCredentials(userTokens);
  next();
};

// Route pour extraire depuis Gmail
app.post('/api/ingest/gmail', checkAuth, async (req, res) => {
  const { days = 30 } = req.body;
  
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Calculer la date de début
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - days);
    const query = `newer_than:${days}d`;
    
    // Récupérer les messages
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100
    });
    
    const messages = messagesResponse.data.messages || [];
    const leads = [];
    
    // Traiter chaque message
    for (const message of messages) {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id
      });
      
      // Extraire le contenu du message
      const messageData = extractMessageContent(fullMessage.data);
      
      // Parser le contenu pour extraire les leads
      const extractedLeads = ParsingService.parseContent(
        messageData.content,
        'gmail',
        messageData.subject,
        messageData.content,
        messageData.date
      );
      
      leads.push(...extractedLeads);
    }
    
    res.json(leads);
  } catch (error) {
    console.error('Error fetching Gmail:', error);
    res.status(500).json({ error: 'Failed to fetch Gmail messages' });
  }
});

// Route pour extraire depuis Calendar
app.post('/api/ingest/calendar', checkAuth, async (req, res) => {
  const { days = 30 } = req.body;
  
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Calculer les dates
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - days);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 7);
    
    // Récupérer les événements
    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100
    });
    
    const events = eventsResponse.data.items || [];
    const leads = [];
    
    // Traiter chaque événement
    for (const event of events) {
      // Combiner les informations de l'événement
      const content = [
        event.summary || '',
        event.description || '',
        event.location || '',
        ...(event.attendees || []).map(a => `${a.displayName || ''} ${a.email || ''}`).filter(Boolean)
      ].join('\n');
      
      // Parser le contenu pour extraire les leads
      const extractedLeads = ParsingService.parseContent(
        content,
        'calendar',
        event.summary || ''
      );
      
      leads.push(...extractedLeads);
    }
    
    res.json(leads);
  } catch (error) {
    console.error('Error fetching Calendar:', error);
    res.status(500).json({ error: 'Failed to fetch Calendar events' });
  }
});

// Route pour extraire depuis toutes les sources
app.post('/api/ingest/all', checkAuth, async (req, res) => {
  const { days = 30 } = req.body;
  const allLeads = [];
  
  try {
    // Récupérer depuis Gmail
    const gmailReq = { body: { days } };
    const gmailRes = { 
      json: (data) => allLeads.push(...data),
      status: () => ({ json: () => {} })
    };
    await app._router.handle({ ...gmailReq, method: 'POST', url: '/api/ingest/gmail' }, gmailRes, () => {});
    
    // Récupérer depuis Calendar
    const calendarReq = { body: { days } };
    const calendarRes = { 
      json: (data) => allLeads.push(...data),
      status: () => ({ json: () => {} })
    };
    await app._router.handle({ ...calendarReq, method: 'POST', url: '/api/ingest/calendar' }, calendarRes, () => {});
    
    res.json(allLeads);
  } catch (error) {
    console.error('Error in batch ingestion:', error);
    res.status(500).json({ error: 'Failed to fetch from all sources' });
  }
});

// Fonction pour extraire le contenu d'un message Gmail
function extractMessageContent(message) {
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
  function extractBody(parts) {
    if (!parts) return '';
    
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        // Conversion simple HTML vers texte
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
      } else if (part.parts) {
        const result = extractBody(part.parts);
        if (result) return result;
      }
    }
    return '';
  }
  
  if (message.payload?.body?.data) {
    content = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  } else if (message.payload?.parts) {
    content = extractBody(message.payload.parts);
  }
  
  return { subject, content, date };
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});