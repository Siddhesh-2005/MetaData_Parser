import { useState, useRef, useCallback } from 'react';

const PLACEHOLDER = `/papers/btech-2-sem-engineering-mathematics-2-21n501-2024.pdf
/papers/btech-2-sem-managerial-economics-and-financial-accounting-21n505-2024.pdf
/papers/btech-ag-7-sem-environmental-engineering-and-disaster-management-7e1711-mar-2021.pdf
/papers/btech-ag-7-sem-environmental-engineering-and-disaster-management-7e1811-dec-2025.pdf
/papers/btech-aid-cai-cds-5-sem-data-mining-concepts-and-techniques-5e1821-dec-2025.pdf
/papers/ba-1-sem-geography-fundamental-of-physical-geography-uhn-24014-dec-2024.pdf`.trim();

export default function App() {
  const [dark, setDark] = useState(true);
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith('.txt')) {
      setError('Please upload a .txt file containing PDF paths.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setInputText(e.target.result);
      setError(null);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleParse = async () => {
    const text = inputText.trim();
    if (!text) {
      setError('Please paste PDF paths or upload a .txt file.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/papers/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list: text }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Server error: ${res.status}`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err.message || 'Failed to connect to the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parsed-pdfs.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setInputText('');
    setResult(null);
    setError(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const lineCount    = inputText ? inputText.split('\n').filter(l => l.trim()).length : 0;
  const errorCount   = result ? result.results.filter(r => r.error).length : 0;
  const successCount = result ? result.results.filter(r => !r.error).length : 0;

  return (
    <div className="app-root" data-theme={dark ? 'dark' : 'light'}>

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">

          <div className="logo">
            <span className="logo-icon">⬡</span>
            <div>
              <div className="logo-title">Metadata Parser</div>
              <div className="logo-sub">POST /papers/parse</div>
            </div>
          </div>

          <div className="header-actions">
            {/* Theme toggle */}
            <button
              className="theme-toggle"
              onClick={() => setDark(d => !d)}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="toggle-track">
                <span className={`toggle-thumb ${dark ? 'is-dark' : 'is-light'}`} />
              </span>
              <span className="toggle-label">{dark ? '🌙' : '☀️'}</span>
            </button>

            <div className="status-dot">
              <span className="dot" />
              <span className="status-text"></span>
            </div>
          </div>

        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main">
        <div className="panels-grid">

          {/* INPUT panel */}
          <section className="panel">
            <div className="panel-header">
              <span className="panel-label">INPUT</span>
              {lineCount > 0 && (
                <span className="badge">{lineCount} paths</span>
              )}
            </div>

            {/* Drop zone */}
            <div
              className={`drop-zone${dragOver ? ' drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".txt"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <div className="drop-icon">↑</div>
              <div className="drop-text">
                {fileName
                  ? <><span className="accent-text">{fileName}</span> loaded</>
                  : <>Drop <span className="accent-text">.txt file</span> or click to browse</>
                }
              </div>
            </div>

            <div className="divider">
              <span className="divider-text">or paste paths below</span>
            </div>

            <textarea
              className="pdf-textarea"
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); setError(null); }}
              placeholder={PLACEHOLDER}
              spellCheck={false}
            />

            {error && (
              <div className="error-box">
                <span className="error-icon">✕</span>
                {error}
              </div>
            )}

            <div className="actions">
              <button
                className="btn-clear"
                onClick={handleClear}
                disabled={!inputText && !result}
              >
                Clear
              </button>
              <button
                className={`btn-parse${loading ? ' loading' : ''}`}
                onClick={handleParse}
                disabled={loading}
              >
                {loading
                  ? <span className="spinner">⟳</span>
                  : '▶ Parse PDFs'
                }
              </button>
            </div>
          </section>

          {/* OUTPUT panel */}
          <section className="panel">
            <div className="panel-header">
              <span className="panel-label">OUTPUT</span>
              {result && (
                <div className="panel-header-right">
                  {successCount > 0 && (
                    <span className="badge badge-success">{successCount} ok</span>
                  )}
                  {errorCount > 0 && (
                    <span className="badge badge-error">{errorCount} err</span>
                  )}
                  <button className="btn-download" onClick={handleDownload}>
                    ↓ Download JSON
                  </button>
                </div>
              )}
            </div>

            <div className="pre-wrapper">
              {!result && !loading && (
                <div className="empty-state">
                  <div className="empty-icon">{ }</div>
                  <div className="empty-text">Results will appear here after parsing</div>
                  <div className="empty-hint">JSON output • one object per path</div>
                </div>
              )}
              {loading && (
                <div className="empty-state">
                  <div className="empty-icon spinning">⟳</div>
                  <div className="empty-text">Parsing…</div>
                </div>
              )}
              {result && (
                <pre className="result-pre">
                  {JSON.stringify(result.results, null, 2)}
                </pre>
              )}
            </div>
          </section>

        </div>

        {/* Stats row */}
        {result && (
          <div className="stats-row">
            {[
              { label: 'Total Parsed',  val: result.count },
              { label: 'Valid',         val: successCount },
              { label: 'Errors',        val: errorCount },
              { label: 'Success Rate',  val: result.count ? `${Math.round((successCount / result.count) * 100)}%` : '—' },
            ].map(({ label, val }) => (
              <div key={label} className="stat-card">
                <div className="stat-val">{val}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  );
}