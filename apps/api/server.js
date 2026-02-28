import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { Mistral } from '@mistralai/mistralai';
import sessionsRouter from './routes/sessions.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const app = express();
const PORT = process.env.API_PORT || 3001;
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '25mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.1.0' });
});

// Skill Library — list installed skills from .vibe/skills/
app.get('/api/skills', (req, res) => {
  const skillsDir = join(PROJECT_ROOT, '.vibe', 'skills');
  if (!existsSync(skillsDir)) return res.json({ skills: [] });

  try {
    const skills = readdirSync(skillsDir)
      .filter(d => statSync(join(skillsDir, d)).isDirectory())
      .map(id => {
        const skillMdPath = join(skillsDir, id, 'SKILL.md');
        let skillMd = '';
        try { skillMd = readFileSync(skillMdPath, 'utf8'); } catch { }

        // Parse SKILL.md frontmatter
        const nameMatch = skillMd.match(/name:\s*(.+)/);
        const descMatch = skillMd.match(/description:\s*(.+)/);

        // List files in skill dir
        const files = [];
        const listFiles = (dir, prefix = '') => {
          try {
            readdirSync(dir).forEach(f => {
              const fp = join(dir, f);
              if (statSync(fp).isDirectory()) {
                listFiles(fp, prefix + f + '/');
              } else {
                files.push({ path: prefix + f, size: statSync(fp).size });
              }
            });
          } catch { }
        };
        listFiles(join(skillsDir, id));

        return {
          id,
          name: nameMatch ? nameMatch[1].trim() : id,
          description: descMatch ? descMatch[1].trim() : '',
          path: `.vibe/skills/${id}/`,
          files,
          skill_md: skillMd
        };
      });
    res.json({ skills, count: skills.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific skill's file content
app.get('/api/skills/:id/files/:file(*)', (req, res) => {
  const filePath = join(PROJECT_ROOT, '.vibe', 'skills', req.params.id, req.params.file);
  if (!existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  try {
    const content = readFileSync(filePath, 'utf8');
    res.json({ path: req.params.file, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
