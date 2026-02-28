import { useState, useRef, useCallback, useEffect } from 'react';

const API = '/api';

function App() {
    // Session state
    const [sessionId, setSessionId] = useState(null);
    const [transcript, setTranscript] = useState('');
    const [skillSpec, setSkillSpec] = useState(null);
    const [skillFiles, setSkillFiles] = useState(null);
    const [installed, setInstalled] = useState(false);
    const [logs, setLogs] = useState([]);
    const [narration, setNarration] = useState('');
    const [useGoldenPath, setUseGoldenPath] = useState(false);
    const [goldenPathId, setGoldenPathId] = useState('fix-ci');

    // UI state
    const [loading, setLoading] = useState('');
    const [recording, setRecording] = useState(false);
    const [error, setError] = useState(null);
    const [runResult, setRunResult] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const logEndRef = useRef(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    // API helper
    const api = useCallback(async (path, body = null) => {
        const opts = { headers: { 'Content-Type': 'application/json' } };
        if (body) {
            opts.method = 'POST';
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(`${API}${path}`, opts);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
    }, []);

    // Step 1: Create session
    const createSession = useCallback(async () => {
        try {
            setLoading('session');
            setError(null);
            const data = await api('/sessions', {});
            setSessionId(data.session_id);
            addLog('info', '✅ Session created: ' + data.session_id.slice(0, 8) + '...');
            setNarration('Session initialized. Ready for your voice command.');
            return data.session_id;
        } catch (err) {
            setError(err.message);
            addLog('error', '❌ Session creation failed: ' + err.message);
        } finally {
            setLoading('');
        }
    }, [api]);

    // Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                addLog('info', '🎙️ Recording stopped. Process transcript or paste text.');
            };

            mediaRecorder.start();
            setRecording(true);
            addLog('info', '🎤 Recording started... speak your skill command!');
            setNarration('Listening... speak your workflow command clearly.');
        } catch (err) {
            addLog('error', '❌ Mic access denied. Please paste your transcript instead.');
            setError('Microphone access denied. Use the text input instead.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecording(false);
            // For hackathon, we use text input as the primary method
            setNarration('Recording complete. Edit transcript if needed, then generate SkillSpec.');
        }
    };

    const addLog = (type, message) => {
        setLogs(prev => [...prev, {
            time: new Date().toISOString().slice(11, 19),
            type,
            message
        }]);
    };

    // Step 2: Generate SkillSpec
    const generateSkillSpec = async () => {
        if (!transcript.trim()) {
            setError('Please enter or record a transcript first');
            return;
        }

        try {
            setLoading('skillspec');
            setError(null);

            let sid = sessionId;
            if (!sid) {
                sid = (await createSession()) || sessionId;
                if (!sid) return;
            }

            addLog('step', '▶ Generating SkillSpec from transcript...');
            setNarration('Analyzing your intent and generating a structured skill specification...');

            const data = await api(`/sessions/${sid}/skillspec`, {
                transcript: transcript.trim(),
                use_golden_path: useGoldenPath,
                golden_path_id: goldenPathId
            });

            setSkillSpec(data.skillSpec);
            if (data.golden_path) {
                addLog('info', '⚡ Using golden path template');
            }
            addLog('info', `✅ SkillSpec generated: ${data.skillSpec.invocation} (risk: ${data.skillSpec.risk_level})`);
            setNarration(`Skill specification ready: ${data.skillSpec.title}. Review and click Generate Skill to proceed.`);
        } catch (err) {
            setError(err.message);
            addLog('error', '❌ SkillSpec generation failed: ' + err.message);
            addLog('info', '💡 Tip: Toggle "Use Golden Path" for a reliable prebaked skill');
        } finally {
            setLoading('');
        }
    };

    // Step 3: Generate Skill Code
    const generateSkill = async () => {
        if (!skillSpec) return;

        try {
            setLoading('skill');
            setError(null);
            addLog('step', '▶ Generating skill folder (SKILL.md + scripts + tests)...');
            setNarration('Generating skill code with Devstral... creating SKILL.md, runner script, and smoke tests.');

            const data = await api(`/sessions/${sessionId}/skill/generate`, { skillSpec });
            setSkillFiles(data.files);
            addLog('info', `✅ Skill generated: ${data.files.length} files`);
            data.files.forEach(f => addLog('stdout', `  📄 ${f.path} (${f.size} bytes)`));
            if (data.golden_path) {
                addLog('info', '⚡ Using golden path template files');
            }
            setNarration('Skill code generated. Click Install to write files to .vibe/skills directory.');
        } catch (err) {
            setError(err.message);
            addLog('error', '❌ Skill generation failed: ' + err.message);
        } finally {
            setLoading('');
        }
    };

    // Step 4: Install Skill
    const installSkill = async () => {
        if (!skillFiles) return;

        try {
            setLoading('install');
            setError(null);
            addLog('step', '▶ Installing skill to .vibe/skills/...');
            setNarration('Installing skill files into your repository...');

            const data = await api(`/sessions/${sessionId}/skill/install`, {});
            setInstalled(true);
            addLog('info', `✅ Skill installed to ${data.install_path}`);
            data.installed_files.forEach(f => addLog('stdout', `  ✓ ${f}`));
            setNarration(`Skill installed at ${data.install_path}. Ready to execute!`);
        } catch (err) {
            setError(err.message);
            addLog('error', '❌ Installation failed: ' + err.message);
        } finally {
            setLoading('');
        }
    };

    // Step 5: Run Skill
    const runSkillAction = async (dryRun = false) => {
        if (!skillSpec) return;

        try {
            setLoading(dryRun ? 'dryrun' : 'run');
            setError(null);
            addLog('step', dryRun ? '▶ DRY RUN — showing commands without execution...' : '▶ EXECUTING skill...');
            setNarration(dryRun ? 'Running dry-run simulation...' : 'Executing skill steps in sandbox...');

            const data = await api(`/sessions/${sessionId}/skill/run`, {
                dry_run: dryRun
            });

            setRunResult(data);

            // Add execution logs
            if (data.logs) {
                data.logs.forEach(log => addLog(log.type, log.message));
            }

            if (data.success) {
                addLog('info', dryRun ? '✅ Dry run complete — all steps would succeed' : '✅ All steps completed successfully!');
                setNarration(dryRun
                    ? 'Dry run simulation complete. All steps verified.'
                    : `Execution complete! ${skillSpec.title} — all tests passing.`);
            } else {
                addLog('error', '⚠️ Some steps had non-zero exit codes');
                setNarration('Execution finished with some warnings. Check the logs for details.');
            }
        } catch (err) {
            setError(err.message);
            addLog('error', '❌ Execution failed: ' + err.message);
        } finally {
            setLoading('');
        }
    };

    // Determine pipeline state
    const pipelineState = {
        hasTranscript: transcript.trim().length > 0,
        hasSkillSpec: !!skillSpec,
        hasSkillFiles: !!skillFiles,
        isInstalled: installed,
        isComplete: !!runResult?.success
    };

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-logo">
                    <div className="logo-icon">⚡</div>
                    <div>
                        <h1>VibeForge</h1>
                        <div className="tagline">Voice-to-Skill Engine • Mistral Hackathon 2026</div>
                    </div>
                </div>
                <div className="header-status">
                    {sessionId && (
                        <div className={`status-badge ${loading ? 'active' : ''}`}>
                            <span className="dot"></span>
                            {loading ? 'Processing...' : 'Ready'}
                        </div>
                    )}
                    <div className="status-badge">
                        <span className="dot"></span>
                        Mistral API
                    </div>
                </div>
            </header>

            {/* Main 3-panel layout */}
            <main className="main-content">
                {/* LEFT: Transcript Panel */}
                <div className="panel fade-in">
                    <div className="panel-header">
                        <h2>📝 Transcript</h2>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                value={goldenPathId}
                                onChange={(e) => setGoldenPathId(e.target.value)}
                                style={{
                                    background: 'var(--bg-glass)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-secondary)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontFamily: 'var(--font-mono)'
                                }}
                            >
                                <option value="fix-ci">/fix-ci</option>
                                <option value="ship-demo">/ship-demo</option>
                            </select>
                        </div>
                    </div>
                    <div className="panel-body">
                        <textarea
                            className="transcript-area"
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            placeholder="Speak or type your skill command here...&#10;&#10;Examples:&#10;• Create /fix-ci that runs tests, finds failing output, patches the code, reruns tests, and summarizes the root cause&#10;• Create /ship-demo that runs tests and generates release notes from git log"
                            style={{ height: 'calc(100% - 100px)' }}
                        />

                        <div className="mic-section">
                            <button
                                className={`mic-button ${recording ? 'recording' : ''}`}
                                onClick={recording ? stopRecording : startRecording}
                                title={recording ? 'Stop recording' : 'Start recording'}
                            >
                                {recording ? '⏹' : '🎤'}
                            </button>
                            <div>
                                <div className="mic-label">
                                    {recording ? '🔴 Recording... click to stop' : 'Push-to-talk or type above'}
                                </div>
                            </div>
                        </div>

                        <div className="golden-toggle">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={useGoldenPath}
                                    onChange={(e) => setUseGoldenPath(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                            <span>Use Golden Path (prebaked demo skill)</span>
                        </div>
                    </div>
                </div>

                {/* CENTER: Skill Preview Panel */}
                <div className="panel fade-in">
                    <div className="panel-header">
                        <h2>🔮 Skill Preview</h2>
                        {skillSpec && (
                            <span className={`tag risk-${skillSpec.risk_level}`}>
                                {skillSpec.risk_level.toUpperCase()} RISK
                            </span>
                        )}
                    </div>
                    <div className="panel-body">
                        {!skillSpec ? (
                            <div className="empty-state">
                                <div className="icon">🔮</div>
                                <div className="title">No skill generated yet</div>
                                <div className="desc">Enter a transcript and click "Generate SkillSpec" to see a preview of your skill</div>
                            </div>
                        ) : (
                            <div className="skill-preview-card">
                                <div className="skill-name">
                                    <span>{skillSpec.invocation}</span>
                                    {useGoldenPath && <span className="tag golden">⚡ Golden Path</span>}
                                </div>
                                <div className="skill-desc">
                                    <strong>{skillSpec.title}</strong><br />
                                    {skillSpec.description}
                                </div>
                                <div className="skill-meta">
                                    <span className={`tag risk-${skillSpec.risk_level}`}>
                                        {skillSpec.risk_level.toUpperCase()} RISK
                                    </span>
                                    {skillSpec.allowed_tools?.map(tool => (
                                        <span key={tool} className="tag tool">{tool}</span>
                                    ))}
                                </div>
                                <ul className="steps-list">
                                    {skillSpec.steps?.map((step, i) => (
                                        <li key={step.step_id} className="step-item">
                                            <span className={`step-number ${runResult?.steps?.[i]?.exit_code === 0 ? 'done' :
                                                    runResult?.steps?.[i]?.exit_code > 0 ? 'failed' :
                                                        loading === 'run' ? 'running' : ''
                                                }`}>
                                                {runResult?.steps?.[i]?.exit_code === 0 ? '✓' :
                                                    runResult?.steps?.[i]?.exit_code > 0 ? '✗' :
                                                        i + 1}
                                            </span>
                                            <div>
                                                <div className="step-text">{step.name}</div>
                                                <div className="step-cmd">$ {step.args?.command?.slice(0, 80)}{step.args?.command?.length > 80 ? '...' : ''}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                {skillFiles && (
                                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Generated Files</div>
                                        {skillFiles.map(f => (
                                            <div key={f.path} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 0' }}>
                                                📄 {f.path} <span style={{ color: 'var(--text-muted)' }}>({f.size}b)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Run Panel */}
                <div className="panel fade-in">
                    <div className="panel-header">
                        <h2>🚀 Pipeline</h2>
                        {loading && <div className="spinner"></div>}
                    </div>
                    <div className="panel-body" style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Pipeline Buttons */}
                        <div className="pipeline-buttons">
                            <button
                                className={`btn ${pipelineState.hasSkillSpec ? 'btn-secondary' : 'btn-primary'} pipeline-btn`}
                                onClick={generateSkillSpec}
                                disabled={!!loading || !pipelineState.hasTranscript}
                            >
                                <span className="btn-icon">{loading === 'skillspec' ? '⏳' : pipelineState.hasSkillSpec ? '✅' : '1️⃣'}</span>
                                <span className="btn-label">Generate SkillSpec</span>
                                {loading === 'skillspec' && <span className="spinner" style={{ width: 14, height: 14 }}></span>}
                            </button>

                            <button
                                className={`btn ${pipelineState.hasSkillFiles ? 'btn-secondary' : 'btn-primary'} pipeline-btn`}
                                onClick={generateSkill}
                                disabled={!!loading || !pipelineState.hasSkillSpec}
                            >
                                <span className="btn-icon">{loading === 'skill' ? '⏳' : pipelineState.hasSkillFiles ? '✅' : '2️⃣'}</span>
                                <span className="btn-label">Generate Skill Code</span>
                                {loading === 'skill' && <span className="spinner" style={{ width: 14, height: 14 }}></span>}
                            </button>

                            <button
                                className={`btn ${pipelineState.isInstalled ? 'btn-secondary' : 'btn-success'} pipeline-btn`}
                                onClick={installSkill}
                                disabled={!!loading || !pipelineState.hasSkillFiles}
                            >
                                <span className="btn-icon">{loading === 'install' ? '⏳' : pipelineState.isInstalled ? '✅' : '3️⃣'}</span>
                                <span className="btn-label">Install to .vibe/skills/</span>
                                {loading === 'install' && <span className="spinner" style={{ width: 14, height: 14 }}></span>}
                            </button>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-warning pipeline-btn"
                                    onClick={() => runSkillAction(true)}
                                    disabled={!!loading || !pipelineState.hasSkillSpec}
                                    style={{ flex: 1 }}
                                >
                                    <span className="btn-icon">{loading === 'dryrun' ? '⏳' : '👁'}</span>
                                    <span className="btn-label">Dry Run</span>
                                </button>
                                <button
                                    className="btn btn-primary pipeline-btn"
                                    onClick={() => runSkillAction(false)}
                                    disabled={!!loading || !pipelineState.hasSkillSpec}
                                    style={{ flex: 1 }}
                                >
                                    <span className="btn-icon">{loading === 'run' ? '⏳' : '▶'}</span>
                                    <span className="btn-label">Execute</span>
                                    {loading === 'run' && <span className="spinner" style={{ width: 14, height: 14 }}></span>}
                                </button>
                            </div>
                        </div>

                        {/* Error display */}
                        {error && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(248, 113, 113, 0.1)',
                                border: '1px solid rgba(248, 113, 113, 0.2)',
                                color: 'var(--danger)',
                                fontSize: '13px',
                                marginBottom: '12px'
                            }}>
                                ❌ {error}
                            </div>
                        )}

                        {/* Loading bar */}
                        {loading && <div className="loading-bar" style={{ marginBottom: '12px' }}></div>}

                        {/* Log Viewer */}
                        <div className="log-viewer">
                            <div className="log-header">
                                <h3>Execution Logs</h3>
                                {logs.length > 0 && (
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 10px', fontSize: '11px' }}
                                        onClick={() => setLogs([])}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="log-body">
                                {logs.length === 0 ? (
                                    <div className="empty-state" style={{ padding: '20px' }}>
                                        <div className="icon">📋</div>
                                        <div className="desc">Execution logs will appear here</div>
                                    </div>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="log-line">
                                            <span className="log-time">{log.time}</span>
                                            <span className={`log-type ${log.type}`}>{log.type}</span>
                                            <span className={`log-message ${log.type === 'error' ? 'error' : ''} ${log.message.includes('✅') || log.message.includes('passing') ? 'success' : ''
                                                }`}>
                                                {log.message}
                                            </span>
                                        </div>
                                    ))
                                )}
                                <div ref={logEndRef} />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Narration Bar */}
            {narration && (
                <div className="narration-bar">
                    <span className="narration-icon">🔊</span>
                    <span className="narration-text">{narration}</span>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => setNarration('')}
                    >
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;
