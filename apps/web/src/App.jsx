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
    const [error, setError] = useState(null);
    const [runResult, setRunResult] = useState(null);
    const [activeTab, setActiveTab] = useState('preview');
    const [patchedFile, setPatchedFile] = useState(null);
    const [repoPath, setRepoPath] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);

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

    const analyzeRepoAction = async () => {
        try {
            setAnalyzing(true);
            setSuggestions([]);
            addLog('info', '🔍 Analyzing codebase context with Mistral Large...');
            const body = repoPath.trim() ? { repo_root: repoPath.trim() } : {};
            const data = await api('/analyze-repo', body);
            setSuggestions(data.suggestions || []);
            addLog('info', `✅ Generated ${data.suggestions?.length || 0} codebase-aware suggestions`);
        } catch (err) {
            setError(err.message);
            addLog('error', '❌ Codebase analysis failed: ' + err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const generateSkillSpecAction = async () => {
        if (!transcript.trim()) { setError('Please enter a transcript first'); return; }
        try {
            setLoading('skillspec'); setError(null);
            let sid = sessionId;
            if (!sid) { const d = await api('/sessions', {}); sid = d.session_id; setSessionId(sid); addLog('info', '✅ Session: ' + sid.slice(0, 8) + '...'); }
            addLog('step', '▶ Generating SkillSpec from transcript...');
            setNarration('Analyzing your intent with Mistral Large...');
            const body = { transcript: transcript.trim(), use_golden_path: useGoldenPath, golden_path_id: goldenPathId };
            if (repoPath.trim()) body.repo_root = repoPath.trim();
            const data = await api(`/sessions/${sid}/skillspec`, body);
            setSkillSpec(data.skillSpec);
            if (data.golden_path) addLog('info', '⚡ Using golden path template');
            else addLog('info', '🧠 Live Mistral Large generation');
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
            setNarration('Generating skill code with Codestral...');
            const data = await api(`/sessions/${sessionId}/skill/generate`, { skillSpec });
            setSkillFiles(data.files);
            setSkillFileContents(data.file_contents || null);
            addLog('info', `✅ Skill generated: ${data.files.length} files`);
            data.files.forEach(f => addLog('stdout', `  📄 ${f.path} (${f.size} bytes)`));
            if (data.golden_path) addLog('info', '⚡ Using golden path template files');
            else addLog('info', '🧠 Live Codestral generation');
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
            const body = repoPath.trim() ? { repo_root: repoPath.trim() } : {};
            const data = await api(`/sessions/${sessionId}/skill/install`, body);
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
            addLog('step', dryRun ? '▶ DRY RUN — preview commands...' : '▶ EXECUTING skill...');
            setNarration(dryRun ? 'Simulating execution...' : '🔄 Auto-resetting demo repo → Executing...');
            const body = { dry_run: dryRun };
            if (repoPath.trim()) body.repo_root = repoPath.trim();
            const data = await api(`/sessions/${sessionId}/skill/run`, body);
            setRunResult(data);
            if (data.patched_file) setPatchedFile(data.patched_file);
            if (data.logs) data.logs.forEach(log => addLog(log.type, log.message));
            if (data.success) {
                addLog('info', dryRun ? '✅ Dry run — all steps verified' : '🎉 ALL STEPS COMPLETED — TESTS GREEN!');
                setNarration(dryRun ? 'Dry run verified.' : `✅ ${skillSpec.title} — all tests passing!`);
            } else {
                addLog('error', '⚠️ Some steps had non-zero exit codes');
                setNarration('Some steps failed. Check logs.');
            }
        } catch (err) {
            setError(err.message); addLog('error', '❌ Execution failed: ' + err.message);
        } finally { setLoading(''); }
    };

    const resetDemo = async () => {
        try {
            await api('/sessions/demo/reset', {});
            addLog('info', '🔄 Demo repo reset to original buggy state');
            setRunResult(null); setPatchedFile(null);
            setNarration('Demo repo reset. Ready for another run!');
        } catch (err) { addLog('error', '❌ Reset: ' + err.message); }
    };

    const resetAll = () => {
        setSessionId(null); setSkillSpec(null); setSkillFiles(null);
        setSkillFileContents(null); setInstalled(false); setRunResult(null);
        setPatchedFile(null); setLogs([]); setError(null); setActiveTab('preview');
        setTranscript(''); setNarration('Ready for a new skill. Type your command.');
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
                        <div className="tagline">Text-to-Skill Engine • Powered by Mistral AI</div>
                    </div>
                </div>
                <div className="header-status">
                    {loading && <div className="status-badge active"><span className="dot"></span>Processing...</div>}
                    <div className="status-badge"><span className="dot"></span>Mistral API</div>
                    {ps.isComplete && <div className="status-badge" style={{ borderColor: 'rgba(74,222,128,0.3)', color: 'var(--success)' }}><span className="dot" style={{ background: 'var(--success)' }}></span>Tests Green</div>}
                    <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '11px' }} onClick={resetAll}>🔄 New Skill</button>
                </div>
            </header>

            {/* Main 3-panel layout */}
            <main className="main-content">
                {/* LEFT: Transcript */}
                <div className="panel fade-in">
                    <div className="panel-header">
                        <h2>📝 Input</h2>
                        <select value={goldenPathId} onChange={(e) => setGoldenPathId(e.target.value)}
                            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                            <option value="fix-ci">/fix-ci</option>
                            <option value="ship-demo">/ship-demo</option>
                        </select>
                    </div>
                    <div className="panel-body">
                        {/* Repo Path */}
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Target Repository</label>
                                <button className="btn btn-secondary" onClick={analyzeRepoAction} disabled={analyzing} style={{ padding: '2px 8px', fontSize: '10px' }}>
                                    {analyzing ? '⏳ Analyzing...' : '🔍 Analyze Codebase'}
                                </button>
                            </div>
                            <input type="text" value={repoPath} onChange={(e) => setRepoPath(e.target.value)}
                                placeholder="Leave empty for demo-repo • Or enter: /path/to/your/project"
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-glass)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>

                        {suggestions.length > 0 && (
                            <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {suggestions.map((s, i) => (
                                    <button key={i} onClick={() => setTranscript(s.command)}
                                        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: 'var(--accent-secondary)', padding: '6px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}>
                                        ✨ {s.title}
                                    </button>
                                ))}
                            </div>
                        )}

                        <textarea className="transcript-area" value={transcript} onChange={(e) => setTranscript(e.target.value)}
                            placeholder={"Type your command here...\n\nExamples:\n• Create /fix-ci that runs tests, finds failures, patches code, reruns tests\n• Create /ship-demo that runs tests and generates release notes\n• Create /lint-fix that runs eslint --fix on all JS files"}
                            style={{ height: suggestions.length > 0 ? 'calc(100% - 170px)' : 'calc(100% - 130px)' }}
                        />

                        <div className="golden-toggle" style={{ marginTop: 'auto' }}>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={useGoldenPath} onChange={(e) => setUseGoldenPath(e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                            <span>{useGoldenPath ? '⚡ Golden Path ON (prebaked, guaranteed)' : '🧠 Live Mode (Mistral generates in real-time)'}</span>
                        </div>
                    </div>
                </div>

                {/* CENTER: Skill Preview / File Viewer */}
                <div className="panel fade-in">
                    <div className="panel-header">
                        <h2>🔮 Skill Preview</h2>
                        {skillSpec && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {['preview', 'files', 'json', 'diff'].map(tab => (
                                    (tab !== 'files' || skillFileContents) && (tab !== 'diff' || patchedFile) && (
                                        <button key={tab} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', opacity: activeTab === tab ? 1 : 0.5, textTransform: 'capitalize' }} onClick={() => setActiveTab(tab)}>{tab}</button>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="panel-body">
                        {!skillSpec ? (
                            <div className="empty-state">
                                <div className="icon">🔮</div>
                                <div className="title">No skill generated yet</div>
                                <div className="desc">Type a command, then click "Generate SkillSpec"</div>
                            </div>
                        ) : activeTab === 'preview' ? (
                            <div className="skill-preview-card">
                                <div className="skill-name">
                                    <span>{skillSpec.invocation}</span>
                                    {useGoldenPath && <span className="tag golden">⚡ Golden</span>}
                                    {!useGoldenPath && <span className="tag tool">🧠 Live</span>}
                                </div>
                                <div className="skill-desc"><strong>{skillSpec.title}</strong><br />{skillSpec.description}</div>
                                <div className="skill-meta">
                                    <span className={`tag risk-${skillSpec.risk_level}`}>{skillSpec.risk_level.toUpperCase()} RISK</span>
                                    {skillSpec.allowed_tools?.map(tool => <span key={tool} className="tag tool">{tool}</span>)}
                                </div>
                                <ul className="steps-list">
                                    {skillSpec.steps?.map((step, i) => (
                                        <li key={step.step_id} className="step-item">
                                            <span className={`step-number ${runResult?.steps?.[i]?.exit_code === 0 ? 'done' : runResult?.steps?.[i]?.exit_code > 0 ? 'failed' : ''}`}>
                                                {runResult?.steps?.[i]?.exit_code === 0 ? '✓' : runResult?.steps?.[i]?.exit_code > 0 ? '✗' : i + 1}
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
                                            <div key={f.path} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', padding: '3px 0', cursor: 'pointer' }}
                                                onClick={() => setActiveTab('files')}>📄 {f.path} <span style={{ color: 'var(--text-muted)' }}>({f.size}b)</span></div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'files' && skillFileContents ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {skillFileContents.map(f => (
                                    <div key={f.path} style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                        <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)' }}>📄 {f.path}</div>
                                        <pre style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '300px', overflowY: 'auto' }}>{f.content}</pre>
                                    </div>
                                ))}
                            </div>
                        ) : activeTab === 'json' ? (
                            <div className="json-viewer">{JSON.stringify(skillSpec, null, 2)}</div>
                        ) : activeTab === 'diff' && patchedFile ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid rgba(248,113,113,0.2)', overflow: 'hidden' }}>
                                    <div style={{ padding: '8px 14px', background: 'rgba(248,113,113,0.05)', borderBottom: '1px solid rgba(248,113,113,0.1)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--danger)' }}>❌ BEFORE (buggy)</div>
                                    <pre style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.8', color: 'var(--danger)', margin: 0, opacity: 0.8 }}>
                                        {`function add(a, b) {
  return a - b; // BUG: wrong operator
}`}
                                    </pre>
                                </div>
                                <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid rgba(74,222,128,0.2)', overflow: 'hidden' }}>
                                    <div style={{ padding: '8px 14px', background: 'rgba(74,222,128,0.05)', borderBottom: '1px solid rgba(74,222,128,0.1)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>✅ AFTER (patched by {skillSpec.invocation})</div>
                                    <pre style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.8', color: 'var(--success)', margin: 0 }}>{patchedFile}</pre>
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
                                        <span className={`log-message ${log.type === 'error' ? 'error' : ''} ${log.message.includes('✅') || log.message.includes('GREEN') || log.message.includes('passing') || log.message.includes('PASS') ? 'success' : ''}`}>
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
