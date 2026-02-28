import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sessionsRouter from './routes/sessions.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Session routes
app.use('/api/sessions', sessionsRouter);

app.listen(PORT, () => {
  console.log(`🔥 VibeForge API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Mistral API Key: ${process.env.MISTRAL_API_KEY ? '✅ Set' : '❌ Missing — set MISTRAL_API_KEY in .env'}`);
});

export default app;
