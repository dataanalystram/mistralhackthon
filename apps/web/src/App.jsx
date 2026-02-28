import { useState, useRef, useCallback, useEffect } from 'react';

const API = 'http://localhost:3001/api';

function App() {
    const [sessionId, setSessionId] = useState(null);
    const [transcript, setTranscript] = useState('');
    const [skillSpec, setSkillSpec] = useState(null);
    const [skillFiles, setSkillFiles] = useState(null);
    const [skillFileContents, setSkillFileContents] = useState(null);
    const [installed, setInstalled] = useState(false);
    const [logs, setLogs] = useState([]);
    const [narration, setNarration] = useState('');
    const [useGoldenPath, setUseGoldenPath] = useState(false);
    const [goldenPathId, setGoldenPathId] = useState('fix-ci');
    const [loading, setLoading] = useState('');
    const [recording, setRecording] = useState(false);
    const [error, setError] = useState(null);
    const [runResult, setRunResult] = useState(null);
    const [activeTab, setActiveTab] = useState('preview');
    const [patchedFile, setPatchedFile] = useState(null);

    const recognitionRef = useRef(null);
    const logEndRef = useRef(null);

    useEffect(() => {
        if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const api = useCallback(async (path, body = null) => {
        const opts = { headers: { 'Content-Type': 'application/json' } };
        if (body) { opts.method = 'POST'; opts.body = JSON.stringify(body); }
        const res = await fetch(`${API}${path}`, opts);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
    }, []);

    const addLog = (type, message) => {
        setLogs(prev => [...prev, { time: new Date().toISOString().slice(11, 19), type, message }]);
    };

    // Web Speech API — free, real-time, no API key needed
    const startVoiceRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition not supported in this browser. Please use Chrome.');
            addLog('error', '❌ Web Speech API not available — type your command instead');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = transcript;
        let interimTranscript = '';

        recognition.onresult = (event) => {
            interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += t + ' ';
                } else {
                    interimTranscript = t;
                }
            }
            setTranscript(finalTranscript + (interimTranscript ? `${interimTranscript}` : ''));
        };

        recognition.onerror = (e) => {
            addLog('error', `🎤 Speech error: ${e.error}`);
            setRecording(false);
        };

        recognition.onend = () => {
            setRecording(false);
            addLog('info', '🎤 Voice recognition stopped');
            setNarration('Voice capture complete. Edit if needed, then generate your SkillSpec.');
        };

        recognition.start();
        recognitionRef.current = recognition;
        setRecording(true);
        addLog('info', '🎤 Listening... speak your skill command clearly');
        setNarration('🎤 Listening... describe your workflow command');
    };

    const stopVoiceRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setRecording(false);
    };

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
        } finally { setLoading(''); }
    }, [api]);

    const generateSkillSpecAction = async () => {
        if (!transcript.trim()) { setError('Please enter or record a transcript first'); return; }
        try {
            setLoading('skillspec'); setError(null);
            let sid = sessionId;
            if (!sid) { const d = await api('/sessions', {}); sid = d.session_id; setSessionId(sid); addLog('info', '✅ Session: ' + sid.slice(0, 8) + '...'); }
            addLog('step', '▶ Generating SkillSpec from transcript...');
            setNarration('Analyzing your intent and generating a structured skill specification...');
            const data = await api(`/sessions/${sid}/skillspec`, { transcript: transcript.trim(), use_golden_path: useGoldenPath, golden_path_id: goldenPathId });
            setSkillSpec(data.skillSpec);
            if (data.golden_path) addLog('info', '⚡ Using golden path template');
            addLog('info', `✅ SkillSpec generated: ${data.skillSpec.invocation} (risk: ${data.skillSpec.risk_level})`);
            setNarration(`Skill specification ready: ${data.skillSpec.title}`);
        } catch (err) {
            setError(err.message); addLog('error', '❌ SkillSpec failed: ' + err.message); addLog('info', '💡 Toggle "Use Golden Path" for reliable prebaked skill');
        } finally { setLoading(''); }
    };

    const generateSkillAction = async () => {
        if (!skillSpec) return;
        try {
            setLoading('skill'); setError(null);
            addLog('step', '▶ Generating skill folder (SKILL.md + scripts + tests)...');
            setNarration('Generating skill code... creating SKILL.md, runner script, and smoke tests.');
            const data = await api(`/sessions/${sessionId}/skill/generate`, { skillSpec });
            setSkillFiles(data.files);
            setSkillFileContents(data.file_contents || null);
            addLog('info', `✅ Skill generated: ${data.files.length} files`);
            data.files.forEach(f => addLog('stdout', `  📄 ${f.path} (${f.size} bytes)`));
            if (data.golden_path) addLog('info', '⚡ Using golden path template files');
            setNarration('Skill code generated. Click Install to write files to .vibe/skills/');
        } catch (err) {
            setError(err.message); addLog('error', '❌ Generation failed: ' + err.message);
        } finally { setLoading(''); }
    };

    const installSkillAction = async () => {
        if (!skillFiles) return;
        try {
            setLoading('install'); setError(null);
            addLog('step', '▶ Installing skill to .vibe/skills/...');
            const data = await api(`/sessions/${sessionId}/skill/install`, {});
            setInstalled(true);
            addLog('info', `✅ Installed to ${data.install_path}`);
            data.installed_files.forEach(f => addLog('stdout', `  ✓ ${f}`));
            setNarration(`Skill installed at ${data.install_path}. Ready to execute!`);
        } catch (err) {
            setError(err.message); addLog('error', '❌ Install failed: ' + err.message);
        } finally { setLoading(''); }
    };

    const runSkillAction = async (dryRun = false) => {
        if (!skillSpec) return;
        try {
            setLoading(dryRun ? 'dryrun' : 'run'); setError(null);
            addLog('step', dryRun ? '▶ DRY RUN — showing commands...' : '▶ EXECUTING skill...');
            setNarration(dryRun ? 'Simulating execution...' : '🔄 Auto-resetting demo repo → Executing skill steps...');
            const data = await api(`/sessions/${sessionId}/skill/run`, { dry_run: dryRun });
            setRunResult(data);
            if (data.patched_file) setPatchedFile(data.patched_file);
            if (data.logs) data.logs.forEach(log => addLog(log.type, log.message));
            if (data.success) {
                addLog('info', dryRun ? '✅ Dry run — all steps verified' : '🎉 ALL STEPS COMPLETED — TESTS GREEN!');
                setNarration(dryRun ? 'Dry run verified.' : `✅ ${skillSpec.title} — all tests passing! The skill is reusable.`);
            } else {
                addLog('error', '⚠️ Some steps had non-zero exit codes');
                setNarration('Check logs for details.');
            }
        } catch (err) {
            setError(err.message); addLog('error', '❌ Execution failed: ' + err.message);
        } finally { setLoading(''); }
    };

    const resetDemo = async () => {
        try {
            await api('/sessions/demo/reset', {});
            addLog('info', '🔄 Demo repo reset to original buggy state');
            setRunResult(null);
            setPatchedFile(null);
            setNarration('Demo repo reset. Ready for another run!');
        } catch (err) { addLog('error', '❌ Reset failed: ' + err.message); }
    };

    const ps = {
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
                    {loading && <div className="status-badge active"><span className="dot"></span>Processing...</div>}
                    <div className="status-badge"><span className="dot"></span>Mistral API</div>
                    {ps.isComplete && <div className="status-badge" style={{ borderColor: 'rgba(74,222,128,0.3)', color: 'var(--success)' }}><span className="dot" style={{ background: 'var(--success)' }}></span>Tests Green</div>}
                </div>
            </header>

            {/* Main 3-panel layout */}
            <main className="main-content">
                {/* LEFT: Transcript */}
                <div className="panel fade-in">
                    <div className="panel-header">
                        <h2>📝 Transcript</h2>
                        <select value={goldenPathId} onChange={(e) => setGoldenPathId(e.target.value)}
                            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                            <option value="fix-ci">/fix-ci</option>
                            <option value="ship-demo">/ship-demo</option>
                        </select>
                    </div>
                    <div className="panel-body">
                        <textarea className="transcript-area" value={transcript} onChange={(e) => setTranscript(e.target.value)}
                            placeholder={"🎤 Click the mic button to speak, or type here...\n\nExamples:\n• Create /fix-ci that runs tests, finds failures, patches code, reruns tests, and summarizes root cause\n• Create /ship-demo that runs tests and generates release notes from git log"}
                            style={{ height: 'calc(100% - 120px)' }}
                        />
                        <div className="mic-section">
                            <button className={`mic-button ${recording ? 'recording' : ''}`}
                                onClick={recording ? stopVoiceRecognition : startVoiceRecognition}
                                title={recording ? 'Stop recording' : 'Start voice recognition'}>
                                {recording ? '⏹' : '🎤'}
                            </button>
                            <div>
                                <div className="mic-label">{recording ? '🔴 Listening... click to stop' : 'Push-to-talk (Web Speech API)'}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {recording ? 'Speak clearly — your words appear in real-time above' : 'Works in Chrome • No API key needed'}
                                </div>
                            </div>
                        </div>
                        <div className="golden-toggle">
                            <label className="toggle-switch">
                                <input type="checkbox" checked={useGoldenPath} onChange={(e) => setUseGoldenPath(e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                            <span>Use Golden Path (prebaked, guaranteed demo)</span>
                        </div>
                    </div>
                </div>

                {/* CENTER: Skill Preview / File Viewer */}
                <div className="panel fade-in">
                    <div className="panel-header">
                        <h2>🔮 Skill Preview</h2>
                        {skillSpec && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button className={`btn btn-secondary ${activeTab === 'preview' ? '' : ''}`} style={{ padding: '4px 10px', fontSize: '11px', opacity: activeTab === 'preview' ? 1 : 0.5 }} onClick={() => setActiveTab('preview')}>Preview</button>
                                {skillFileContents && <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', opacity: activeTab === 'files' ? 1 : 0.5 }} onClick={() => setActiveTab('files')}>Files</button>}
                                {(skillSpec || patchedFile) && <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', opacity: activeTab === 'json' ? 1 : 0.5 }} onClick={() => setActiveTab('json')}>JSON</button>}
                                {patchedFile && <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', opacity: activeTab === 'diff' ? 1 : 0.5 }} onClick={() => setActiveTab('diff')}>Diff</button>}
                            </div>
                        )}
                    </div>
                    <div className="panel-body">
                        {!skillSpec ? (
                            <div className="empty-state">
                                <div className="icon">🔮</div>
                                <div className="title">No skill generated yet</div>
                                <div className="desc">Enter a transcript and click "Generate SkillSpec" to see your skill</div>
                            </div>
                        ) : activeTab === 'preview' ? (
                            <div className="skill-preview-card">
                                <div className="skill-name">
                                    <span>{skillSpec.invocation}</span>
                                    {useGoldenPath && <span className="tag golden">⚡ Golden Path</span>}
                                </div>
                                <div className="skill-desc"><strong>{skillSpec.title}</strong><br />{skillSpec.description}</div>
                                <div className="skill-meta">
                                    <span className={`tag risk-${skillSpec.risk_level}`}>{skillSpec.risk_level.toUpperCase()} RISK</span>
                                    {skillSpec.allowed_tools?.map(tool => <span key={tool} className="tag tool">{tool}</span>)}
                                </div>
                                <ul className="steps-list">
                                    {skillSpec.steps?.map((step, i) => (
                                        <li key={step.step_id} className="step-item">
                                            <span className={`step-number ${runResult?.steps?.[i]?.exit_code === 0 ? 'done' : runResult?.steps?.[i]?.exit_code > 0 ? 'failed' : loading === 'run' ? 'running' : ''}`}>
                                                {runResult?.steps?.[i]?.exit_code === 0 ? '✓' : runResult?.steps?.[i]?.exit_code > 0 ? '✗' : i + 1}
                                            </span>
                                            <div>
                                                <div className="step-text">{step.name}</div>
                                                <div className="step-cmd">$ {step.args?.command?.slice(0, 70)}{step.args?.command?.length > 70 ? '...' : ''}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                {skillFiles && (
                                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Generated Files</div>
                                        {skillFiles.map(f => (
                                            <div key={f.path} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', padding: '3px 0', cursor: 'pointer' }}
                                                onClick={() => setActiveTab('files')}>
                                                📄 {f.path} <span style={{ color: 'var(--text-muted)' }}>({f.size}b)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'files' && skillFileContents ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {skillFileContents.map(f => (
                                    <div key={f.path} style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                        <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                            📄 {f.path}
                                        </div>
                                        <pre style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '300px', overflowY: 'auto' }}>
                                            {f.content}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        ) : activeTab === 'json' ? (
                            <div className="json-viewer">
                                {JSON.stringify(skillSpec, null, 2)}
                            </div>
                        ) : activeTab === 'diff' && patchedFile ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid rgba(248,113,113,0.2)', overflow: 'hidden' }}>
                                    <div style={{ padding: '8px 14px', background: 'rgba(248,113,113,0.05)', borderBottom: '1px solid rgba(248,113,113,0.1)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--danger)' }}>
                                        ❌ BEFORE (buggy)
                                    </div>
                                    <pre style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.8', color: 'var(--danger)', margin: 0, opacity: 0.8 }}>
                                        {`function add(a, b) {
  return a - b; // BUG: wrong operator
}`}
                                    </pre>
                                </div>
                                <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid rgba(74,222,128,0.2)', overflow: 'hidden' }}>
                                    <div style={{ padding: '8px 14px', background: 'rgba(74,222,128,0.05)', borderBottom: '1px solid rgba(74,222,128,0.1)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>
                                        ✅ AFTER (patched by /fix-ci)
                                    </div>
                                    <pre style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.8', color: 'var(--success)', margin: 0 }}>
                                        {patchedFile}
                                    </pre>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* RIGHT: Pipeline + Logs */}
                <div className="panel fade-in">
                    <div className="panel-header">
                        <h2>🚀 Pipeline</h2>
                        {loading && <div className="spinner"></div>}
                    </div>
                    <div className="panel-body" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="pipeline-buttons">
                            <button className={`btn ${ps.hasSkillSpec ? 'btn-secondary' : 'btn-primary'} pipeline-btn`} onClick={generateSkillSpecAction} disabled={!!loading || !ps.hasTranscript}>
                                <span className="btn-icon">{loading === 'skillspec' ? '⏳' : ps.hasSkillSpec ? '✅' : '1️⃣'}</span>
                                <span className="btn-label">Generate SkillSpec</span>
                                {loading === 'skillspec' && <span className="spinner" style={{ width: 14, height: 14 }}></span>}
                            </button>
                            <button className={`btn ${ps.hasSkillFiles ? 'btn-secondary' : 'btn-primary'} pipeline-btn`} onClick={generateSkillAction} disabled={!!loading || !ps.hasSkillSpec}>
                                <span className="btn-icon">{loading === 'skill' ? '⏳' : ps.hasSkillFiles ? '✅' : '2️⃣'}</span>
                                <span className="btn-label">Generate Skill Code</span>
                                {loading === 'skill' && <span className="spinner" style={{ width: 14, height: 14 }}></span>}
                            </button>
                            <button className={`btn ${ps.isInstalled ? 'btn-secondary' : 'btn-success'} pipeline-btn`} onClick={installSkillAction} disabled={!!loading || !ps.hasSkillFiles}>
                                <span className="btn-icon">{loading === 'install' ? '⏳' : ps.isInstalled ? '✅' : '3️⃣'}</span>
                                <span className="btn-label">Install to .vibe/skills/</span>
                                {loading === 'install' && <span className="spinner" style={{ width: 14, height: 14 }}></span>}
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-warning pipeline-btn" onClick={() => runSkillAction(true)} disabled={!!loading || !ps.hasSkillSpec} style={{ flex: 1 }}>
                                    <span className="btn-icon">{loading === 'dryrun' ? '⏳' : '👁'}</span>
                                    <span className="btn-label">Dry Run</span>
                                </button>
                                <button className={`btn ${ps.isComplete ? 'btn-success' : 'btn-primary'} pipeline-btn`} onClick={() => runSkillAction(false)} disabled={!!loading || !ps.hasSkillSpec} style={{ flex: 1 }}>
                                    <span className="btn-icon">{loading === 'run' ? '⏳' : ps.isComplete ? '✅' : '▶'}</span>
                                    <span className="btn-label">{ps.isComplete ? 'Re-run' : 'Execute'}</span>
                                    {loading === 'run' && <span className="spinner" style={{ width: 14, height: 14 }}></span>}
                                </button>
                            </div>
                            {runResult && (
                                <button className="btn btn-secondary pipeline-btn" onClick={resetDemo} style={{ opacity: 0.7 }}>
                                    <span className="btn-icon">🔄</span>
                                    <span className="btn-label">Reset Demo Repo</span>
                                </button>
                            )}
                        </div>

                        {error && (
                            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>
                                ❌ {error}
                            </div>
                        )}
                        {loading && <div className="loading-bar" style={{ marginBottom: '12px' }}></div>}

                        {/* Log Viewer */}
                        <div className="log-viewer">
                            <div className="log-header">
                                <h3>Execution Logs</h3>
                                {logs.length > 0 && <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setLogs([])}>Clear</button>}
                            </div>
                            <div className="log-body">
                                {logs.length === 0 ? (
                                    <div className="empty-state" style={{ padding: '20px' }}><div className="icon">📋</div><div className="desc">Logs appear here as you run the pipeline</div></div>
                                ) : logs.map((log, i) => (
                                    <div key={i} className="log-line">
                                        <span className="log-time">{log.time}</span>
                                        <span className={`log-type ${log.type}`}>{log.type}</span>
                                        <span className={`log-message ${log.type === 'error' ? 'error' : ''} ${log.message.includes('✅') || log.message.includes('GREEN') || log.message.includes('passing') ? 'success' : ''}`}>
                                            {log.message}
                                        </span>
                                    </div>
                                ))}
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
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setNarration('')}>✕</button>
                </div>
            )}
        </div>
    );
}

export default App;
