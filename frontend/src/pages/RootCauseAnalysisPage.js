import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiCpu, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';
import AIResultDisplay from '../components/AIResultDisplay';

const fields = [
  { key: 'wafer_lot_id', label: 'Wafer Lot ID', type: 'text', required: true },
  { key: 'failure_mode', label: 'Failure Mode', type: 'text', required: true },
  { key: 'root_cause', label: 'Root Cause', type: 'textarea' },
  { key: 'contributing_factors', label: 'Contributing Factors', type: 'textarea' },
  { key: 'corrective_action', label: 'Corrective Action', type: 'textarea' },
  { key: 'preventive_action', label: 'Preventive Action', type: 'textarea' },
  { key: 'severity', label: 'Severity', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  { key: 'status', label: 'Status', type: 'select', options: ['open', 'investigating', 'confirmed', 'resolved'] },
  { key: 'assigned_to', label: 'Assigned To', type: 'text' },
];

function RootCauseAnalysisPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiForm, setAiForm] = useState({ wafer_lot_id: '', failure_mode: '', severity: '' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/root-cause-analysis');
      setItems(res.data.data || res.data || []);
    } catch (err) { toast.error('Failed to fetch analyses'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try { await api.post('/root-cause-analysis', data); toast.success('Analysis created'); fetchItems(); }
    catch (err) { toast.error('Failed to create'); }
  };

  const handleUpdate = async (id, data) => {
    try { await api.put(`/root-cause-analysis/${id}`, data); toast.success('Updated'); setSelected(null); fetchItems(); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/root-cause-analysis/${id}`); toast.success('Deleted'); fetchItems(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  const handleAnalyze = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/root-cause-analysis/analyze', aiForm);
      setAiResult(res.data.data || res.data);
      toast.success('Analysis complete');
    } catch (err) { toast.error('AI analysis failed'); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="page">
      <Navbar title="Root Cause Analysis" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Root Cause Analyses</h2>
          <div className="toolbar-actions">
            <button className="btn btn-ai" onClick={() => { setShowAI(!showAI); setAiResult(null); }}>
              <FiCpu size={14} /> Analyze Root Cause
            </button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Analysis
            </button>
            <button className="btn btn-ghost" onClick={fetchItems}><FiRefreshCw size={14} /></button>
          </div>
        </div>

        {showAI && (
          <div className="ai-panel">
            <h3>AI Root Cause Analysis</h3>
            <div className="ai-form-row">
              <div className="form-group">
                <label>Wafer Lot ID</label>
                <input value={aiForm.wafer_lot_id} onChange={(e) => setAiForm({ ...aiForm, wafer_lot_id: e.target.value })} placeholder="e.g. LOT-001" />
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <label>Failure Mode</label>
                <input value={aiForm.failure_mode} onChange={(e) => setAiForm({ ...aiForm, failure_mode: e.target.value })} placeholder="Describe the failure mode..." />
              </div>
              <div className="form-group">
                <label>Severity</label>
                <select value={aiForm.severity} onChange={(e) => setAiForm({ ...aiForm, severity: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <button className="btn btn-ai" onClick={handleAnalyze} disabled={aiLoading}>
                <FiCpu size={14} /> {aiLoading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            <AIResultDisplay result={aiResult} loading={aiLoading} title="Root Cause Analysis Result" />
          </div>
        )}

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Wafer Lot ID</th>
                  <th>Failure Mode</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="empty-row">No analyses found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td className="mono">{item.wafer_lot_id}</td>
                    <td>{item.failure_mode}</td>
                    <td><span className={`status-dot status-${item.severity || 'low'}`}>{item.severity || '-'}</span></td>
                    <td><span className={`status-dot status-${item.status || 'open'}`}>{item.status || 'open'}</span></td>
                    <td>{item.assigned_to || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Root Cause Analysis Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Root Cause Analysis" />}
    </div>
  );
}

export default RootCauseAnalysisPage;
