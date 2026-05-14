import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCw, FiCheck, FiActivity, FiSearch } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';

const fields = [
  { key: 'equipment_id', label: 'Equipment ID', type: 'text', required: true },
  { key: 'parameter_name', label: 'Parameter Name', type: 'text', required: true },
  { key: 'rule_violated', label: 'Rule Violated', type: 'text' },
  { key: 'current_value', label: 'Current Value', type: 'number' },
  { key: 'control_limit_upper', label: 'UCL', type: 'number' },
  { key: 'control_limit_lower', label: 'LCL', type: 'number' },
  { key: 'center_line', label: 'Center Line', type: 'number' },
  { key: 'severity', label: 'Severity', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  { key: 'process_step', label: 'Process Step', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
];

function SpcAlertsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/spc-alerts');
      setItems(res.data.data || res.data || []);
    } catch (err) { toast.error('Failed to fetch SPC alerts'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try { await api.post('/spc-alerts', data); toast.success('Alert created'); fetchItems(); }
    catch (err) { toast.error('Failed to create'); }
  };

  const handleUpdate = async (id, data) => {
    try { await api.put(`/spc-alerts/${id}`, data); toast.success('Updated'); setSelected(null); fetchItems(); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/spc-alerts/${id}`); toast.success('Deleted'); fetchItems(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  const handleAcknowledge = async (e, item) => {
    e.stopPropagation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      await api.put(`/spc-alerts/${item._id || item.id}`, {
        ...item,
        status: 'acknowledged',
        acknowledged_by: user.name || 'User',
      });
      toast.success('Alert acknowledged');
      fetchItems();
    } catch (err) {
      toast.error('Failed to acknowledge');
    }
  };

  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyzePattern = async (e, item) => {
    e.stopPropagation();
    const aid = item._id || item.id;
    setAnalyzingId(aid);
    setAnalysis(null);
    try {
      const res = await api.post(`/spc-alerts/${aid}/analyze-pattern`);
      setAnalysis(res.data);
      toast.success('Pattern analysis complete');
    } catch (err) {
      if (err.response?.status === 503) {
        toast.error('AI service unavailable: OPENROUTER_API_KEY is not configured.');
      } else {
        toast.error('Pattern analysis failed: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleEvaluateSPC = async () => {
    setEvaluating(true);
    setEvalResult(null);
    try {
      const res = await api.post('/spc-alerts/evaluate');
      setEvalResult(res.data);
      toast.success(`SPC evaluation complete: ${res.data.violations_found} violations found`);
      fetchItems();
    } catch (err) {
      toast.error('SPC evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="page">
      <Navbar title="SPC Alerts" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>SPC Alerts</h2>
          <div className="toolbar-actions">
            <button className="btn btn-ai" onClick={handleEvaluateSPC} disabled={evaluating}>
              <FiActivity size={14} /> {evaluating ? 'Evaluating...' : 'Run SPC Rules Evaluator'}
            </button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Alert
            </button>
            <button className="btn btn-ghost" onClick={fetchItems}><FiRefreshCw size={14} /></button>
          </div>
        </div>
        {evalResult && (
          <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #334155' }}>
            <h4 style={{ color: '#6366f1', marginBottom: 8 }}>SPC Evaluation Results</h4>
            <p style={{ color: '#94a3b8' }}>Evaluated <strong style={{ color: '#e2e8f0' }}>{evalResult.evaluated_parameters}</strong> parameters, found <strong style={{ color: evalResult.violations_found > 0 ? '#ef4444' : '#22c55e' }}>{evalResult.violations_found}</strong> violations.</p>
          </div>
        )}

        {analysis && (
          <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #334155' }}>
            <h4 style={{ color: '#6366f1', marginBottom: 8 }}>AI Pattern Analysis — alert {analysis.alert_id} ({analysis.parameter_name})</h4>
            <pre style={{ color: '#e2e8f0', fontSize: 12, overflow: 'auto', maxHeight: 360 }}>
              {JSON.stringify(analysis.analysis, null, 2)}
            </pre>
          </div>
        )}

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipment ID</th>
                  <th>Parameter Name</th>
                  <th>Severity</th>
                  <th>Rule Violated</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="empty-row">No alerts found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td className="mono">{item.equipment_id}</td>
                    <td>{item.parameter_name}</td>
                    <td><span className={`status-dot status-${item.severity || 'low'}`}>{item.severity || '-'}</span></td>
                    <td>{item.rule_violated || '-'}</td>
                    <td><span className={`status-dot status-${item.status || 'active'}`}>{item.status || 'active'}</span></td>
                    <td>
                      {item.status === 'active' && (
                        <button className="btn btn-sm btn-secondary" onClick={(e) => handleAcknowledge(e, item)}>
                          <FiCheck size={12} /> Acknowledge
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-ai"
                        style={{ marginLeft: 8 }}
                        onClick={(e) => handleAnalyzePattern(e, item)}
                        disabled={analyzingId === (item._id || item.id)}
                      >
                        <FiSearch size={12} /> {analyzingId === (item._id || item.id) ? 'Analyzing...' : 'AI Analyze'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="SPC Alert Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New SPC Alert" />}
    </div>
  );
}

export default SpcAlertsPage;
