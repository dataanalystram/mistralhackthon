import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { Mistral } from '@mistralai/mistralai';
import { analyzeRepo } from './lib/mistral.js';
import sessionsRouter from './routes/sessions.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const app = express();
const PORT = process.env.API_PORT || 3001;
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '25mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.1.0' });
});

// POST /api/analyze-repo — Analyze a codebase and suggest skills
app.post('/api/analyze-repo', async (req, res) => {
  const repoRoot = req.body.repo_root || join(PROJECT_ROOT, 'demo-repo');

  if (!existsSync(repoRoot)) {
    return res.status(404).json({ error: 'Repository path not found' });
  }

  try {
    const repoContext = { files_preview: [], package_json: null, readme_preview: '' };

    // 1. Get root directory file list
    try {
      repoContext.files_preview = readdirSync(repoRoot).slice(0, 50); // cap at 50 files
    } catch (e) { }

    // 2. Read package.json if it exists
    const pkgPath = join(repoRoot, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkgStr = readFileSync(pkgPath, 'utf8');
        repoContext.package_json = JSON.parse(pkgStr);
      } catch (e) { }
    }

    // 3. Read README preview if it exists
    const readmePath = join(repoRoot, 'README.md');
    if (existsSync(readmePath)) {
      try {
        repoContext.readme_preview = readFileSync(readmePath, 'utf8').slice(0, 1000); // First 1000 chars
      } catch (e) { }
    }

    // Ask Mistral Large for 3 skill suggestions
    const suggestions = await analyzeRepo(repoContext);
    res.json({ suggestions });
  } catch (err) {
    console.error('Codebase analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze repository: ' + err.message });
  }
});

// Session routes
app.use('/api/sessions', sessionsRouter);

app.listen(PORT, () => {
  console.log(`🔥 VibeForge API v2.0.0 running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Skills: http://localhost:${PORT}/api/skills`);
  console.log(`   Mistral API Key: ${process.env.MISTRAL_API_KEY ? '✅ Set' : '❌ Missing — set MISTRAL_API_KEY in .env'}`);
});

export default app;
