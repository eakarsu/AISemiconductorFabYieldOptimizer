import React, { useState } from 'react';
import { FiFileText, FiDownload, FiExternalLink } from 'react-icons/fi';
import api from '../services/api';

function ProcessSpecSheetPdf() {
  const [recipeId, setRecipeId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [meta, setMeta] = useState(null);

  const fetchPdf = async (mode = 'preview') => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/custom-views/spec-sheet/${encodeURIComponent(recipeId)}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMeta({ size: blob.size, generated_at: new Date().toLocaleString() });
      if (mode === 'download') {
        const a = document.createElement('a');
        a.href = url;
        a.download = `spec-sheet-${recipeId}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
      } else {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(url);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to fetch PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <FiFileText color="#a78bfa" size={20} />
        <div>
          <h3 style={{ color: '#f3f4f6', margin: 0, fontSize: 18 }}>Process Spec Sheet PDF</h3>
          <p style={{ color: '#9ca3af', margin: '4px 0 0 0', fontSize: 12 }}>
            Generate a printable, server-rendered spec sheet for any process recipe.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}>
          <label style={lblStyle}>Recipe ID</label>
          <input
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
            placeholder="e.g. 1"
            style={inputStyle}
          />
        </div>
        <button
          onClick={() => fetchPdf('preview')}
          disabled={loading || !recipeId}
          style={btnPrimary}
        >
          <FiExternalLink size={14} /> {loading ? 'Generating...' : 'Generate Preview'}
        </button>
        <button
          onClick={() => fetchPdf('download')}
          disabled={loading || !recipeId}
          style={btnSecondary}
        >
          <FiDownload size={14} /> Download
        </button>
      </div>

      {error && <p style={{ color: '#f87171', marginTop: 10 }}>Error: {error}</p>}
      {meta && (
        <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 10 }}>
          Last generated: {meta.generated_at} - {(meta.size / 1024).toFixed(1)} KB
        </p>
      )}

      {previewUrl && (
        <div style={{ marginTop: 14, border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden' }}>
          <iframe
            title="spec-sheet-preview"
            src={previewUrl}
            style={{ width: '100%', height: 480, border: 'none', background: '#fff' }}
          />
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
};
const lblStyle = { display: 'block', color: '#9ca3af', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #374151',
  background: '#0b1220', color: '#e5e7eb', fontSize: 14,
};
const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px',
  borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
};
const btnPrimary = { ...btnBase, background: '#a78bfa', color: '#0b0e14' };
const btnSecondary = { ...btnBase, background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' };

export default ProcessSpecSheetPdf;
