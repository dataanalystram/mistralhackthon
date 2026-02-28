import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateSkillSpec } from '../lib/skillspec-schema.js';
import { generateSkillSpec, generateSkillCode } from '../lib/mistral.js';
import { runSkill, runCommand } from '../lib/runner.js';
import { GOLDEN_PATHS } from '../lib/golden-paths.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../../..');

// In-memory session store (good enough for hackathon)
const sessions = new Map();

// POST /api/sessions — Create a new session
router.post('/', (req, res) => {
    const sessionId = uuidv4();
    sessions.set(sessionId, {
        id: sessionId,
        status: 'created',
        transcript: null,
        skillSpec: null,
        skillFiles: null,
        logs: [],
        createdAt: new Date().toISOString()
    });
    res.json({ session_id: sessionId, status: 'created' });
});

// GET /api/sessions/:id — Get session state
router.get('/:id', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
});

// POST /api/sessions/:id/transcript — Submit transcript
router.post('/:id/transcript', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'transcript is required' });

    session.transcript = transcript;
    session.status = 'transcript_ready';
    res.json({ session_id: session.id, status: session.status, transcript });
});

// POST /api/sessions/:id/skillspec — Generate SkillSpec from transcript
router.post('/:id/skillspec', async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { transcript, use_golden_path, golden_path_id } = req.body;
    const text = transcript || session.transcript;
    if (!text && !use_golden_path) return res.status(400).json({ error: 'transcript required (or set use_golden_path)' });

    try {
        let skillSpec;

        if (use_golden_path && golden_path_id && GOLDEN_PATHS[golden_path_id]) {
            skillSpec = GOLDEN_PATHS[golden_path_id].skillSpec;
            session.usedGoldenPath = true;
        } else {
            session.status = 'generating_skillspec';
            skillSpec = await generateSkillSpec(text);
        }

        // Validate
        const validation = validateSkillSpec(skillSpec);
        if (!validation.valid) {
            return res.status(422).json({
                error: 'SkillSpec validation failed',
                details: validation.errors,
                skillSpec
            });
        }

        session.skillSpec = skillSpec;
        session.status = 'skillspec_ready';
        res.json({
            session_id: session.id,
            status: session.status,
            skillSpec,
            risk_level: skillSpec.risk_level,
            golden_path: !!session.usedGoldenPath
        });
    } catch (err) {
        console.error('SkillSpec generation error:', err);

        // Auto-fallback to golden path
        const fallbackId = golden_path_id || 'fix-ci';
        if (GOLDEN_PATHS[fallbackId]) {
            session.skillSpec = GOLDEN_PATHS[fallbackId].skillSpec;
            session.status = 'skillspec_ready';
            session.usedGoldenPath = true;
            return res.json({
                session_id: session.id,
                status: session.status,
                skillSpec: session.skillSpec,
                risk_level: session.skillSpec.risk_level,
                golden_path: true,
                fallback_reason: err.message
            });
        }

        res.status(500).json({ error: 'SkillSpec generation failed', details: err.message });
    }
});

// POST /api/sessions/:id/skill/generate — Generate skill folder from SkillSpec
router.post('/:id/skill/generate', async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const skillSpec = req.body.skillSpec || session.skillSpec;
    if (!skillSpec) return res.status(400).json({ error: 'No SkillSpec available. Generate one first.' });

    try {
        let files;
        const skillId = skillSpec.skill_id;

        if (session.usedGoldenPath && GOLDEN_PATHS[skillId]) {
            // Use prebaked files
            files = Object.entries(GOLDEN_PATHS[skillId].files).map(([path, content]) => ({
                path, content
            }));
        } else {
            // Generate via Mistral
            session.status = 'generating_skill';
            const result = await generateSkillCode(skillSpec);
            files = result.files;
        }

        session.skillFiles = files;
        session.status = 'skill_ready';
        res.json({
            session_id: session.id,
            status: session.status,
            files: files.map(f => ({ path: f.path, size: f.content.length })),
            golden_path: !!session.usedGoldenPath
        });
    } catch (err) {
        console.error('Skill generation error:', err);

        // Auto-fallback
        const skillId = skillSpec.skill_id;
        if (GOLDEN_PATHS[skillId]) {
            const files = Object.entries(GOLDEN_PATHS[skillId].files).map(([path, content]) => ({
                path, content
            }));
            session.skillFiles = files;
            session.status = 'skill_ready';
            session.usedGoldenPath = true;
            return res.json({
                session_id: session.id,
                status: session.status,
                files: files.map(f => ({ path: f.path, size: f.content.length })),
                golden_path: true,
                fallback_reason: err.message
            });
        }

        res.status(500).json({ error: 'Skill generation failed', details: err.message });
    }
});

// POST /api/sessions/:id/skill/install — Install skill to .vibe/skills/
router.post('/:id/skill/install', async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (!session.skillFiles || !session.skillSpec) {
        return res.status(400).json({ error: 'Generate skill files first' });
    }

    const skillId = session.skillSpec.skill_id;
    const installBase = join(PROJECT_ROOT, '.vibe', 'skills', skillId);

    try {
        const installed = [];
        for (const file of session.skillFiles) {
            const fullPath = join(installBase, file.path);
            await mkdir(dirname(fullPath), { recursive: true });
            await writeFile(fullPath, file.content, 'utf8');
            installed.push(file.path);
        }

        session.status = 'installed';
        session.installPath = installBase;

        res.json({
            session_id: session.id,
            status: session.status,
            install_path: `.vibe/skills/${skillId}/`,
            installed_files: installed
        });
    } catch (err) {
        console.error('Install error:', err);
        res.status(500).json({ error: 'Skill installation failed', details: err.message });
    }
});

// POST /api/sessions/:id/skill/run — Execute the skill
router.post('/:id/skill/run', async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (!session.skillSpec) {
        return res.status(400).json({ error: 'No SkillSpec available' });
    }

    const dryRun = req.body.dry_run ?? false;
    const repoRoot = req.body.repo_root || join(PROJECT_ROOT, 'demo-repo');

    try {
        session.status = dryRun ? 'dry_running' : 'executing';
        const result = await runSkill(session.skillSpec, repoRoot, dryRun);

        session.status = 'completed';
        session.logs = result.logs;

        const allPassed = result.results.every(r => r.exitCode === 0);

        res.json({
            session_id: session.id,
            status: session.status,
            dry_run: dryRun,
            success: allPassed,
            steps: result.results.map(r => ({
                step_id: r.step_id,
                exit_code: r.exitCode,
                log_count: r.logs.length
            })),
            logs: result.logs
        });
    } catch (err) {
        console.error('Run error:', err);
        res.status(500).json({ error: 'Skill execution failed', details: err.message });
    }
});

// GET /api/golden-paths — List available golden paths
router.get('/golden-paths/list', (req, res) => {
    const paths = Object.entries(GOLDEN_PATHS).map(([id, gp]) => ({
        id,
        title: gp.skillSpec.title,
        description: gp.skillSpec.description,
        invocation: gp.skillSpec.invocation,
        risk_level: gp.skillSpec.risk_level
    }));
    res.json({ golden_paths: paths });
});

export default router;
