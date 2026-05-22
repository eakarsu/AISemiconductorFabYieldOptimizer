import React, { useEffect, useState } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiSave, FiX, FiAlertTriangle } from 'react-icons/fi';
import api from '../services/api';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const DEFECT_TYPES = ['particle', 'scratch', 'pattern_defect', 'stain', 'void', 'contamination'];
const PROCESS_STEPS = ['Lithography', 'Etch', 'CVD', 'PVD', 'CMP', 'Wet Clean', 'Implant'];

function YieldRuleEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [newRule, setNewRule] = useState({
    name: '', defect_type: 'particle', process_step: 'Lithography',
    threshold_ppm: 100, severity: 'high', active: true, notes: '',
  });

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/custom-views/yield-rules');
      setRules(res.data.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createRule = async () => {
    if (!newRule.name) { setError('Rule name is required'); return; }
    try {
      await api.post('/custom-views/yield-rules', newRule);
      setNewRule({ ...newRule, name: '', notes: '' });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  };

  const startEdit = (r) => { setEditingId(r.id); setEditDraft({ ...r }); };
  const cancelEdit = () => { setEditingId(null); setEditDraft({}); };
  const saveEdit = async () => {
    try {
      await api.put(`/custom-views/yield-rules/${editingId}`, editDraft);
      cancelEdit();
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  };
  const deleteRule = async (id) => {
    if (!window.confirm('Delete this yield rule?')) return;
    try {
      await api.delete(`/custom-views/yield-rules/${id}`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <FiAlertTriangle color="#f59e0b" size={20} />
        <div>
          <h3 style={{ color: '#f3f4f6', margin: 0, fontSize: 18 }}>Yield Rule Editor</h3>
          <p style={{ color: '#9ca3af', margin: '4px 0 0 0', fontSize: 12 }}>
            CRUD critical-defect thresholds used by the yield/SPC pipelines.
          </p>
        </div>
      </div>

      {error && <p style={{ color: '#f87171' }}>Error: {error}</p>}

      {/* Create form */}
      <div style={{ ...rowGrid, background: '#0b1220', padding: 12, borderRadius: 8, marginBottom: 14 }}>
        <input style={inputStyle} placeholder="Rule name"
          value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
        <select style={inputStyle}
          value={newRule.defect_type} onChange={(e) => setNewRule({ ...newRule, defect_type: e.target.value })}>
          {DEFECT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select style={inputStyle}
          value={newRule.process_step} onChange={(e) => setNewRule({ ...newRule, process_step: e.target.value })}>
          {PROCESS_STEPS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input style={inputStyle} type="number" placeholder="ppm threshold"
          value={newRule.threshold_ppm}
          onChange={(e) => setNewRule({ ...newRule, threshold_ppm: e.target.value })} />
        <select style={inputStyle}
          value={newRule.severity} onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button style={addBtn} onClick={createRule}>
          <FiPlus size={14} /> Add Rule
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading rules...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0b1220' }}>
                {['Name', 'Defect Type', 'Process Step', 'Threshold (ppm)', 'Severity', 'Active', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => {
                const editing = editingId === r.id;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #1f2937' }}>
                    {editing ? (
                      <>
                        <td style={tdStyle}><input style={inputStyle} value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} /></td>
                        <td style={tdStyle}><select style={inputStyle} value={editDraft.defect_type} onChange={(e) => setEditDraft({ ...editDraft, defect_type: e.target.value })}>{DEFECT_TYPES.map((d) => <option key={d}>{d}</option>)}</select></td>
                        <td style={tdStyle}><select style={inputStyle} value={editDraft.process_step} onChange={(e) => setEditDraft({ ...editDraft, process_step: e.target.value })}>{PROCESS_STEPS.map((p) => <option key={p}>{p}</option>)}</select></td>
                        <td style={tdStyle}><input style={inputStyle} type="number" value={editDraft.threshold_ppm} onChange={(e) => setEditDraft({ ...editDraft, threshold_ppm: e.target.value })} /></td>
                        <td style={tdStyle}><select style={inputStyle} value={editDraft.severity} onChange={(e) => setEditDraft({ ...editDraft, severity: e.target.value })}>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select></td>
                        <td style={tdStyle}><input type="checkbox" checked={!!editDraft.active} onChange={(e) => setEditDraft({ ...editDraft, active: e.target.checked })} /></td>
                        <td style={tdStyle}>
                          <button style={iconBtn} onClick={saveEdit}><FiSave size={14} /></button>
                          <button style={iconBtn} onClick={cancelEdit}><FiX size={14} /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={tdStyle}>{r.name}</td>
                        <td style={tdStyle}>{r.defect_type}</td>
                        <td style={tdStyle}>{r.process_step}</td>
                        <td style={tdStyle}>{r.threshold_ppm}</td>
                        <td style={tdStyle}><SevBadge sev={r.severity} /></td>
                        <td style={tdStyle}>{r.active ? 'Yes' : 'No'}</td>
                        <td style={tdStyle}>
                          <button style={iconBtn} onClick={() => startEdit(r)}><FiEdit2 size={14} /></button>
                          <button style={{ ...iconBtn, color: '#f87171' }} onClick={() => deleteRule(r.id)}><FiTrash2 size={14} /></button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {rules.length === 0 && (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af' }}>No rules yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SevBadge({ sev }) {
  const colors = { low: '#60a5fa', medium: '#fbbf24', high: '#fb923c', critical: '#f87171' };
  return (
    <span style={{
      background: colors[sev] || '#374151', color: '#0b0e14', padding: '2px 8px',
      borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    }}>
      {sev}
    </span>
  );
}

const cardStyle = { background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20, marginBottom: 20 };
const rowGrid = { display: 'grid', gridTemplateColumns: 'minmax(140px, 1.4fr) repeat(4, minmax(110px, 1fr)) auto', gap: 8, alignItems: 'center' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #374151', background: '#0b1220', color: '#e5e7eb', fontSize: 13 };
const addBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#34d399', color: '#0b0e14', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 };
const thStyle = { color: '#9ca3af', fontSize: 11, fontWeight: 600, padding: '10px 8px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 };
const tdStyle = { padding: '8px', color: '#e5e7eb' };
const iconBtn = { background: 'transparent', border: '1px solid #374151', color: '#e5e7eb', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', marginRight: 4 };

export default YieldRuleEditor;
