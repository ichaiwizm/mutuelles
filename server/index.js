import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import ingestRoutes from './routes/ingest.js';
import sseRoutes from './routes/sse.js';
import logger from './logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialiser l'authentification au démarrage
initAuth();

// Routes
app.use('/auth', authRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/ingest', sseRoutes);

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found' });
});

// Démarrage du serveur
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`📧 Gmail SSE: http://localhost:${PORT}/api/ingest/gmail/stream`);
});