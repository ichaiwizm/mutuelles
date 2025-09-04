import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import ingestRoutes from './routes/ingest.js';
import sseRoutes from './routes/sse.js';
import logger from './logger.js';
import { ParserOrchestrator } from './services/parsers/ParserOrchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le .env depuis la racine du projet
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: true, credentials: true }));
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

// Route pour les métriques des parsers
app.get('/api/metrics/parsers', (req, res) => {
  try {
    const metrics = ParserOrchestrator.getMetricsSummary();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting parser metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve parser metrics'
    });
  }
});

// Route pour reset les métriques des parsers (optionnel)
app.post('/api/metrics/parsers/reset', (req, res) => {
  try {
    ParserOrchestrator.resetMetrics();
    res.json({
      success: true,
      message: 'Parser metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error resetting parser metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset parser metrics'
    });
  }
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
