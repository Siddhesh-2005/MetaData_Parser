import { useState, useRef, useCallback } from 'react';

const PLACEHOLDER = `/papers/btech-2-sem-engineering-mathematics-2-21n501-2024.pdf
/papers/btech-2-sem-managerial-economics-and-financial-accounting-21n505-2024.pdf
/papers/btech-ag-7-sem-environmental-engineering-and-disaster-management-7e1711-mar-2021.pdf
/papers/btech-ag-7-sem-environmental-engineering-and-disaster-management-7e1811-dec-2025.pdf
/papers/btech-aid-cai-cds-5-sem-data-mining-concepts-and-techniques-5e1821-dec-2025.pdf
/papers/ba-1-sem-geography-fundamental-of-physical-geography-uhn-24014-dec-2024.pdf`.trim();

export default function App() {
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
    const file = e.dataTransfer.files[0];
    handleFile(file);
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

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.results, null, 2)], {
      type: 'application/json',
    });
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

  const lineCount = inputText ? inputText.split('\n').filter(l => l.trim()).length : 0;
  const errorCount = result ? result.results.filter(r => r.error).length : 0;
  const successCount = result ? result.results.filter(r => !r.error).length : 0;

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>⬡</span>
            <div>
              <div style={styles.logoTitle}>Metadata Parser</div>
              <div style={styles.logoSub}>POST /papers/parse</div>
            </div>
          </div>
          <div style={styles.statusDot}>
            <span style={styles.dot} />
            <span style={styles.statusText}></span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.grid}>

          {/* LEFT — Input Panel */}
          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelLabel}>INPUT</span>
              {lineCount > 0 && (
                <span style={styles.badge}>{lineCount} paths</span>
              )}
            </div>

            {/* Drop Zone */}
            <div
              style={{
                ...styles.dropZone,
                ...(dragOver ? styles.dropZoneActive : {}),
              }}
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
              <div style={styles.dropIcon}>↑</div>
              <div style={styles.dropText}>
                {fileName
                  ? <><span style={styles.accentText}>{fileName}</span> loaded</>
                  : <>Drop <span style={styles.accentText}>.txt file</span> or click to browse</>
                }
              </div>
            </div>

            <div style={styles.divider}>
              <span style={styles.dividerText}>or paste paths below</span>
            </div>

            {/* Textarea */}
            <textarea
              style={styles.textarea}
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); setError(null); }}
              placeholder={PLACEHOLDER}
              spellCheck={false}
            />

            {/* Error */}
            {error && (
              <div style={styles.errorBox}>
                <span style={styles.errorIcon}>✕</span>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
              <button
                style={styles.clearBtn}
                onClick={handleClear}
                disabled={!inputText && !result}
              >
                Clear
              </button>
              <button
                style={{
                  ...styles.parseBtn,
                  ...(loading ? styles.parseBtnLoading : {}),
                }}
                onClick={handleParse}
                disabled={loading}
              >
                {loading ? (
                  <span style={styles.spinner}>⟳</span>
                ) : '▶ Parse PDFs'}
              </button>
            </div>
          </section>

          {/* RIGHT — Output Panel */}
          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelLabel}>OUTPUT</span>
              {result && (
                <div style={styles.headerRight}>
                  {successCount > 0 && (
                    <span style={{ ...styles.badge, ...styles.badgeSuccess }}>
                      {successCount} ok
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span style={{ ...styles.badge, ...styles.badgeError }}>
                      {errorCount} err
                    </span>
                  )}
                  <button style={styles.downloadBtn} onClick={handleDownload}>
                    ↓ Download JSON
                  </button>
                </div>
              )}
            </div>

            <div style={styles.preWrapper}>
              {!result && !loading && (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>{ }</div>
                  <div style={styles.emptyText}>
                    Results will appear here after parsing
                  </div>
                  <div style={styles.emptyHint}>
                    JSON output • one object per path
                  </div>
                </div>
              )}
              {loading && (
                <div style={styles.emptyState}>
                  <div style={{ ...styles.emptyIcon, color: 'var(--accent)', animation: 'spin 1s linear infinite' }}>⟳</div>
                  <div style={styles.emptyText}>Parsing…</div>
                </div>
              )}
              {result && (
                <pre style={styles.pre}>
                  {JSON.stringify(result.results, null, 2)}
                </pre>
              )}
            </div>
          </section>

        </div>

        {/* Stats row */}
        {result && (
          <div style={styles.statsRow}>
            {[
              { label: 'Total Parsed', val: result.count },
              { label: 'Valid', val: successCount },
              { label: 'Errors', val: errorCount },
              { label: 'Success Rate', val: result.count ? `${Math.round((successCount / result.count) * 100)}%` : '—' },
            ].map(({ label, val }) => (
              <div key={label} style={styles.statCard}>
                <div style={styles.statVal}>{val}</div>
                <div style={styles.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        textarea::placeholder { color: #3a4a3d; font-family: var(--mono); font-size: 12px; }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        button { cursor: pointer; }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg)',
  },
  header: {
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerInner: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '14px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    fontSize: 28,
    color: 'var(--accent)',
    lineHeight: 1,
  },
  logoTitle: {
    fontFamily: 'var(--sans)',
    fontWeight: 600,
    fontSize: 16,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  logoSub: {
    fontFamily: 'var(--mono)',
    fontSize: 11,
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
  },
  statusDot: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--accent)',
    boxShadow: '0 0 8px var(--accent)',
  },
  statusText: {
    fontFamily: 'var(--mono)',
    fontSize: 11,
    color: 'var(--accent)',
    letterSpacing: '0.1em',
  },
  main: {
    flex: 1,
    maxWidth: 1400,
    width: '100%',
    margin: '0 auto',
    padding: '32px 24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    alignItems: 'start',
  },
  panel: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--surface2)',
    minHeight: 44,
  },
  panelLabel: {
    fontFamily: 'var(--mono)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.12em',
  },
  badge: {
    fontFamily: 'var(--mono)',
    fontSize: 11,
    background: 'var(--border)',
    color: 'var(--text-secondary)',
    padding: '2px 8px',
    borderRadius: 4,
    letterSpacing: '0.05em',
  },
  badgeSuccess: {
    background: 'rgba(0,230,118,0.1)',
    color: 'var(--accent)',
  },
  badgeError: {
    background: 'rgba(255,82,82,0.1)',
    color: 'var(--error)',
  },
  headerRight: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  dropZone: {
    margin: 16,
    border: '1px dashed var(--border-bright)',
    borderRadius: 6,
    padding: '18px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    background: 'transparent',
  },
  dropZoneActive: {
    border: '1px dashed var(--accent)',
    background: 'var(--accent-glow)',
  },
  dropIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: 'var(--surface2)',
    border: '1px solid var(--border-bright)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  dropText: {
    fontFamily: 'var(--sans)',
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  accentText: {
    color: 'var(--accent)',
    fontWeight: 500,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 16px',
    marginBottom: 12,
  },
  dividerText: {
    fontFamily: 'var(--mono)',
    fontSize: 11,
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  },
  textarea: {
    fontFamily: 'var(--mono)',
    fontSize: 12,
    lineHeight: 1.7,
    color: 'var(--text-primary)',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: 14,
    margin: '0 16px',
    resize: 'vertical',
    minHeight: 220,
    outline: 'none',
    transition: 'border-color 0.15s ease',
    width: 'calc(100% - 32px)',
  },
  errorBox: {
    margin: '10px 16px 0',
    padding: '10px 14px',
    background: 'var(--error-bg)',
    border: '1px solid rgba(255,82,82,0.2)',
    borderRadius: 6,
    color: 'var(--error)',
    fontFamily: 'var(--mono)',
    fontSize: 12,
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
  errorIcon: {
    flexShrink: 0,
    fontWeight: 700,
  },
  actions: {
    display: 'flex',
    gap: 10,
    padding: 16,
    justifyContent: 'flex-end',
  },
  clearBtn: {
    fontFamily: 'var(--sans)',
    fontWeight: 500,
    fontSize: 13,
    padding: '9px 18px',
    borderRadius: 6,
    border: '1px solid var(--border-bright)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s ease',
  },
  parseBtn: {
    fontFamily: 'var(--sans)',
    fontWeight: 600,
    fontSize: 13,
    padding: '9px 24px',
    borderRadius: 6,
    border: 'none',
    background: 'var(--accent)',
    color: '#000',
    letterSpacing: '-0.01em',
    transition: 'all 0.15s ease',
    minWidth: 130,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  parseBtnLoading: {
    background: 'var(--accent-dim)',
  },
  spinner: {
    display: 'inline-block',
    fontSize: 16,
    animation: 'spin 0.8s linear infinite',
  },
  downloadBtn: {
    fontFamily: 'var(--mono)',
    fontSize: 11,
    fontWeight: 600,
    padding: '5px 12px',
    borderRadius: 5,
    border: '1px solid var(--accent-dim)',
    background: 'var(--accent-glow)',
    color: 'var(--accent)',
    letterSpacing: '0.04em',
    transition: 'all 0.15s ease',
  },
  preWrapper: {
    flex: 1,
    minHeight: 420,
    position: 'relative',
    overflow: 'hidden',
  },
  pre: {
    fontFamily: 'var(--mono)',
    fontSize: 12,
    lineHeight: 1.65,
    color: 'var(--text-primary)',
    padding: 16,
    margin: 0,
    overflow: 'auto',
    height: '100%',
    maxHeight: 520,
    whiteSpace: 'pre',
  },
  emptyState: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 32,
  },
  emptyIcon: {
    fontSize: 32,
    color: 'var(--text-muted)',
    fontFamily: 'var(--mono)',
  },
  emptyText: {
    fontFamily: 'var(--sans)',
    fontSize: 14,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  emptyHint: {
    fontFamily: 'var(--mono)',
    fontSize: 11,
    color: 'var(--text-muted)',
    letterSpacing: '0.06em',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '14px 18px',
    textAlign: 'center',
  },
  statVal: {
    fontFamily: 'var(--mono)',
    fontSize: 24,
    fontWeight: 600,
    color: 'var(--accent)',
    lineHeight: 1,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'var(--sans)',
    fontSize: 11,
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
};