import { spawn } from 'child_process';

const SECRET_PATTERNS = [
    /(?:api[_-]?key|token|secret|password|credential|auth)[\s]*[=:]\s*\S+/gi,
    /[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/g,
    /(?:sk-|pk-|ghp_|gho_|github_pat_)\S+/g,
];

function maskSecrets(text) {
    let masked = text;
    for (const pattern of SECRET_PATTERNS) {
        masked = masked.replace(pattern, '[REDACTED]');
    }
    return masked;
}

/**
 * Execute a command in a controlled environment.
 * @param {Object} options
 * @param {string} options.command - Command to run
 * @param {string} options.cwd - Working directory
 * @param {boolean} options.dryRun - If true, log but don't execute
 * @param {number} options.timeoutMs - Timeout in milliseconds (default 60s)
 * @returns {Promise<{ exitCode: number, stdout: string, stderr: string, logs: Array }>}
 */
export async function runCommand({ command, cwd, dryRun = false, timeoutMs = 60000 }) {
    const timestamp = new Date().toISOString();
    const logs = [];

    logs.push({ time: timestamp, type: 'cmd', message: `$ ${command}` });

    if (dryRun) {
        logs.push({ time: new Date().toISOString(), type: 'info', message: '[DRY_RUN] Command not executed' });
        return { exitCode: 0, stdout: '', stderr: '', logs };
    }

    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const proc = spawn('bash', ['-c', command], {
            cwd,
            env: {
                ...process.env,
                DRY_RUN: dryRun ? 'true' : 'false',
                NODE_ENV: 'production'
            },
            timeout: timeoutMs
        });

        const timer = setTimeout(() => {
            timedOut = true;
            proc.kill('SIGTERM');
            logs.push({ time: new Date().toISOString(), type: 'error', message: `[TIMEOUT] Command killed after ${timeoutMs}ms` });
        }, timeoutMs);

        proc.stdout.on('data', (data) => {
            const line = maskSecrets(data.toString());
            stdout += line;
            logs.push({ time: new Date().toISOString(), type: 'stdout', message: line.trim() });
        });

        proc.stderr.on('data', (data) => {
            const line = maskSecrets(data.toString());
            stderr += line;
            logs.push({ time: new Date().toISOString(), type: 'stderr', message: line.trim() });
        });

        proc.on('close', (code) => {
            clearTimeout(timer);
            const exitCode = timedOut ? 124 : (code ?? 1);
            logs.push({ time: new Date().toISOString(), type: 'exit', message: `Exit code: ${exitCode}` });
            resolve({ exitCode, stdout: maskSecrets(stdout), stderr: maskSecrets(stderr), logs });
        });

        proc.on('error', (err) => {
            clearTimeout(timer);
            logs.push({ time: new Date().toISOString(), type: 'error', message: err.message });
            resolve({ exitCode: 1, stdout: '', stderr: err.message, logs });
        });
    });
}

/**
 * Run a full skill (all steps from SkillSpec).
 */
export async function runSkill(skillSpec, repoRoot, dryRun = false) {
    const allLogs = [];
    const results = [];

    for (const step of skillSpec.steps) {
        allLogs.push({ time: new Date().toISOString(), type: 'step', message: `▶ Step: ${step.name}` });

        const command = step.args?.command || `echo "No command defined for step ${step.step_id}"`;
        const result = await runCommand({ command, cwd: repoRoot, dryRun, timeoutMs: 60000 });

        results.push({ step_id: step.step_id, ...result });
        allLogs.push(...result.logs);

        if (result.exitCode !== 0 && step.on_fail === 'stop') {
            allLogs.push({ time: new Date().toISOString(), type: 'error', message: `Step "${step.name}" failed — stopping.` });
            break;
        }
    }

    return { results, logs: allLogs };
}
