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
    const [repoPath, setRepoPath] = useState('');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
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

    // Voxtral Voice — record mic audio, send to Mistral for transcription
    const startVoxtralRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];

            // Helper function to create a WAV file from an AudioBuffer
            const bufferToWav = (abuffer, len) => {
                let numOfChan = abuffer.numberOfChannels,
                    length = len * numOfChan * 2 + 44,
                    buffer = new ArrayBuffer(length),
                    view = new DataView(buffer),
                    channels = [], i, sample,
                    offset = 0,
                    pos = 0;

                // write WAVE header
                setUint32(0x46464952);                         // "RIFF"
                setUint32(length - 8);                         // file length - 8
                setUint32(0x45564157);                         // "WAVE"
                setUint32(0x20746d66);                         // "fmt " chunk
                setUint32(16);                                 // length = 16
                setUint16(1);                                  // PCM (uncompressed)
                setUint16(numOfChan);
                setUint32(abuffer.sampleRate);
                setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
                setUint16(numOfChan * 2);                      // block-align
                setUint16(16);                                 // 16-bit (hardcoded in this demo)

                setUint32(0x61746164);                         // "data" - chunk
                setUint32(length - pos - 4);                   // chunk length

                // write interleaved data
                for (i = 0; i < abuffer.numberOfChannels; i++)
                    channels.push(abuffer.getChannelData(i));

                while (pos < length) {
                    for (i = 0; i < numOfChan; i++) {
                        // interleave channels
                        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
                        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
                        view.setInt16(pos, sample, true);          // write 16-bit sample
                        pos += 2;
                    }
                    offset++                                     // next source sample
                }

                return new Blob([buffer], { type: "audio/wav" });

                function setUint16(data) {
                    view.setUint16(pos, data, true);
                    pos += 2;
                }

                function setUint32(data) {
                    view.setUint32(pos, data, true);
                    pos += 4;
                }
            };

            const mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                const webmBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });

                if (webmBlob.size < 1000) {
                    addLog('error', '🎤 Recording too short — speak clearly for at least 2 seconds');
                    setRecording(false);
                    return;
                }

                addLog('info', `🎤 Processing audio... converting to WAV format`);
                setNarration('Sending audio to Mistral Voxtral for transcription...');
                setLoading('transcribe');

                try {
                    // Convert WebM to WAV via Web Audio API
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const arrayBuffer = await webmBlob.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const wavBlob = bufferToWav(audioBuffer, audioBuffer.length);

                    // Convert WAV to base64
                    const reader = new FileReader();
                    const base64Promise = new Promise((resolve) => {
                        reader.onloadend = () => {
                            const base64 = reader.result.split(',')[1];
                            resolve(base64);
                        };
                    });
                    reader.readAsDataURL(wavBlob);
                    const audioBase64 = await base64Promise;

                    // Send to Voxtral
                    const data = await api('/transcribe', { audio: audioBase64 });
                    setTranscript(prev => prev + (prev ? ' ' : '') + data.transcript);
                    addLog('info', `✅ Voxtral transcription: "${data.transcript.slice(0, 80)}..."`);
                    setNarration(`Voice captured and transcribed by Mistral Voxtral. Edit if needed, then generate.`);
                } catch (err) {
                    addLog('error', '❌ Voxtral transcription failed: ' + err.message);
                    setNarration('Transcription failed — type your command instead');
                } finally {
                    setLoading('');
                }
            };

            mediaRecorder.start(250); // Collect chunks every 250ms
            mediaRecorderRef.current = mediaRecorder;
            setRecording(true);
            addLog('info', '🎤 Recording... speak your skill command (powered by Voxtral 🟣)');
            setNarration('🎤 Recording... speak clearly, then click stop');
        } catch (err) {
            addLog('error', '❌ Mic access denied: ' + err.message);
            setError('Microphone access denied. Please allow mic access and try again.');
        }
    };

    const stopVoxtralRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setRecording(false);
    };

    const generateSkillSpecAction = async () => {
        if (!transcript.trim()) { setError('Please enter or record a transcript first'); return; }
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
        setTranscript(''); setNarration('Ready for a new skill. Speak or type your command.');
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
                        <div className="tagline">Voice-to-Skill Engine • Powered by Mistral AI</div>
                    </div>
                </div>
                <div className="header-status">
                    {loading && <div className="status-badge active"><span className="dot"></span>{loading === 'transcribe' ? 'Voxtral...' : 'Processing...'}</div>}
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
                        <h2>📝 Voice & Input</h2>
                        <select value={goldenPathId} onChange={(e) => setGoldenPathId(e.target.value)}
                            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                            <option value="fix-ci">/fix-ci</option>
                            <option value="ship-demo">/ship-demo</option>
                        </select>
                    </div>
                    <div className="panel-body">
                        {/* Repo Path */}
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Target Repository</label>
                            <input type="text" value={repoPath} onChange={(e) => setRepoPath(e.target.value)}
                                placeholder="Leave empty for demo-repo • Or enter: /path/to/your/project"
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-glass)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>

                        <textarea className="transcript-area" value={transcript} onChange={(e) => setTranscript(e.target.value)}
                            placeholder={"🎤 Click the mic button to record with Voxtral, or type here...\n\nExamples:\n• Create /fix-ci that runs tests, finds failures, patches code, reruns tests\n• Create /ship-demo that runs tests and generates release notes\n• Create /lint-fix that runs eslint --fix on all JS files"}
                            style={{ height: 'calc(100% - 200px)' }}
                        />
                        <div className="mic-section">
                            <button className={`mic-button ${recording ? 'recording' : ''}`}
                                onClick={recording ? stopVoxtralRecording : startVoxtralRecording}
                                disabled={loading === 'transcribe'}
                                title={recording ? 'Stop recording' : 'Start Voxtral voice recording'}>
                                {loading === 'transcribe' ? '⏳' : recording ? '⏹' : '🎤'}
                            </button>
                            <div>
                                <div className="mic-label">{recording ? '🔴 Recording... click to stop' : loading === 'transcribe' ? '⏳ Transcribing with Voxtral...' : 'Push-to-talk (Mistral Voxtral 🟣)'}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {recording ? 'Speak clearly — audio will be sent to Voxtral for transcription' : 'Powered by voxtral-mini • Mistral AI speech-to-text'}
                                </div>
                            </div>
                        </div>
                        <div className="golden-toggle">
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
                                <div className="desc">Record your voice or type a command, then click "Generate SkillSpec"</div>
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
