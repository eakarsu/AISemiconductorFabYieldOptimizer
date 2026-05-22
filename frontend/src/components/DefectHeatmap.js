import React, { useEffect, useState } from 'react';
import api from '../services/api';

function DefectHeatmap() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/custom-views/defect-heatmap');
        if (!alive) return;
        setPayload(res.data);
      } catch (e) {
        if (alive) setError(e?.response?.data?.error || e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const colorFor = (v, max) => {
    if (!max) return '#1f2937';
    const t = Math.min(1, Math.max(0, v / max));
    // Blue (low) -> Red (high)
    const r = Math.round(40 + t * 200);
    const g = Math.round(60 - t * 40);
    const b = Math.round(180 - t * 130);
    return `rgb(${r}, ${Math.max(0, g)}, ${Math.max(0, b)})`;
  };

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ color: '#f3f4f6', margin: 0, fontSize: 18 }}>Defect Type x Process Step Heatmap</h3>
        <p style={{ color: '#9ca3af', margin: '4px 0 0 0', fontSize: 12 }}>
          Defect count concentration across the fab process flow
        </p>
      </div>

      {loading && <p style={{ color: '#9ca3af' }}>Loading heatmap...</p>}
      {error && <p style={{ color: '#f87171' }}>Error: {error}</p>}
      {!loading && !error && payload && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 4, width: '100%', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={thStyle}>Defect Type \\ Step</th>
                {payload.process_steps.map((p) => (
                  <th key={p} style={thStyle}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payload.matrix.map((row) => (
                <tr key={row.defect_type}>
                  <td style={rowLabelStyle}>{row.defect_type}</td>
                  {payload.process_steps.map((p) => {
                    const v = row[p] || 0;
                    return (
                      <td
                        key={p}
                        title={`${row.defect_type} @ ${p}: ${v}`}
                        style={{
                          background: colorFor(v, payload.max_value),
                          color: v / Math.max(1, payload.max_value) > 0.55 ? '#fff' : '#e5e7eb',
                          padding: '12px 6px',
                          textAlign: 'center',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 13,
                          minWidth: 60,
                        }}
                      >
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#9ca3af' }}>
            <span>Low</span>
            <div style={{
              width: 200, height: 10, borderRadius: 5,
              background: 'linear-gradient(90deg, rgb(40,60,180), rgb(240,20,50))',
            }} />
            <span>High</span>
            <span style={{ marginLeft: 'auto' }}>Max cell: {payload.max_value}</span>
          </div>
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
const thStyle = {
  color: '#9ca3af',
  fontSize: 11,
  fontWeight: 600,
  padding: '8px 6px',
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};
const rowLabelStyle = {
  color: '#e5e7eb',
  fontWeight: 600,
  padding: '8px 10px',
  background: '#1f2937',
  borderRadius: 6,
  fontSize: 13,
};

export default DefectHeatmap;
