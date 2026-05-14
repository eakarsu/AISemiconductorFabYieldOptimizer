import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiAlertTriangle, FiTool, FiList } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';

function WarRoomPage() {
  const [lotId, setLotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!lotId.trim()) { toast.error('Enter a lot ID'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post(`/excursions/${lotId}/war-room`);
      setResult(res.data.analysis);
      toast.success('War room analysis complete');
    } catch (err) {
      toast.error('War room analysis failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const severityColors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

  return (
    <div className="page">
      <Navbar title="Excursion War Room" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2 style={{ color: '#ef4444' }}><FiAlertTriangle size={20} style={{ marginRight: 8 }} />Excursion War Room</h2>
        </div>

        <div style={{ background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid #991b1b', marginBottom: 20 }}>
          <p style={{ color: '#fca5a5', marginBottom: 12 }}>Enter a wafer lot ID to run AI-powered root cause analysis for an active excursion.</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Lot ID</label>
              <input value={lotId} onChange={e => setLotId(e.target.value)} placeholder="e.g. LOT-001" onKeyDown={e => e.key === 'Enter' && handleAnalyze()} />
            </div>
            <button className="btn btn-ai" onClick={handleAnalyze} disabled={loading} style={{ background: '#991b1b', borderColor: '#ef4444' }}>
              <FiAlertTriangle size={14} /> {loading ? 'Analyzing...' : 'Launch War Room'}
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" />
            <p style={{ color: '#94a3b8', marginTop: 12 }}>AI analyzing excursion data...</p>
          </div>
        )}

        {result && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
              <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, border: `1px solid ${severityColors[result.severity_level] || '#334155'}` }}>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Severity</div>
                <div style={{ color: severityColors[result.severity_level] || '#e2e8f0', fontSize: 20, fontWeight: 700, textTransform: 'uppercase' }}>{result.severity_level}</div>
              </div>
              <div style={{ background: '#1e293b', padding: 16, borderRadius: 8 }}>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Estimated Yield Impact</div>
                <div style={{ color: '#ef4444', fontSize: 20, fontWeight: 700 }}>-{result.estimated_yield_impact_percent}%</div>
              </div>
              <div style={{ background: '#1e293b', padding: 16, borderRadius: 8 }}>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Lots at Risk</div>
                <div style={{ color: '#f97316', fontSize: 20, fontWeight: 700 }}>{result.lots_at_risk?.length || 0}</div>
              </div>
            </div>

            <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <h3 style={{ color: '#e2e8f0', marginBottom: 8 }}>Excursion Summary</h3>
              <p style={{ color: '#94a3b8' }}>{result.excursion_summary}</p>
            </div>

            <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <h3 style={{ color: '#6366f1', marginBottom: 12 }}><FiList size={16} style={{ marginRight: 6 }} />Cause Chain</h3>
              {result.cause_chain?.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>{c.step}</div>
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{c.cause}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>{c.evidence}</div>
                    <div style={{ color: '#22c55e', fontSize: 12 }}>Confidence: {(c.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <h3 style={{ color: '#f97316', marginBottom: 12 }}><FiTool size={16} style={{ marginRight: 6 }} />Suspect Tools</h3>
              {result.suspect_tools?.map((t, i) => (
                <div key={i} style={{ background: '#0f172a', padding: 12, borderRadius: 6, marginBottom: 8, borderLeft: '3px solid #f97316' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Equipment: {t.equipment_id}</span>
                    <span style={{ color: '#f97316' }}>{(t.confidence * 100).toFixed(0)}% confidence</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{t.reason}</div>
                  <div style={{ color: '#22c55e', fontSize: 12, marginTop: 4 }}>Action: {t.action}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <h3 style={{ color: '#22c55e', marginBottom: 12 }}>Recommended Actions</h3>
              {result.recommended_actions?.sort((a, b) => a.priority - b.priority).map((a, i) => (
                <div key={i} style={{ background: '#0f172a', padding: 12, borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ background: '#6366f1', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>P{a.priority}</span>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{a.action}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                    <span>Owner: {a.owner}</span>
                    <span>Timeline: {a.timeline}</span>
                    <span style={{ color: '#22c55e' }}>{a.expected_impact}</span>
                  </div>
                </div>
              ))}
            </div>

            {result.containment_steps?.length > 0 && (
              <div style={{ background: '#1e293b', padding: 16, borderRadius: 8 }}>
                <h3 style={{ color: '#eab308', marginBottom: 8 }}>Containment Steps</h3>
                <ul style={{ paddingLeft: 20 }}>
                  {result.containment_steps.map((s, i) => <li key={i} style={{ color: '#94a3b8', marginBottom: 4 }}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WarRoomPage;
