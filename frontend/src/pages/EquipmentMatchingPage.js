import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiCpu, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';
import AIResultDisplay from '../components/AIResultDisplay';

const fields = [
  { key: 'equipment_id', label: 'Equipment ID', type: 'text', required: true },
  { key: 'process_step', label: 'Process Step', type: 'text', required: true },
  { key: 'compatibility_score', label: 'Compatibility Score', type: 'number' },
  { key: 'qualification_status', label: 'Qualification Status', type: 'select', options: ['qualified', 'pending', 'conditional', 'disqualified'] },
  { key: 'last_qualified_date', label: 'Last Qualified Date', type: 'date' },
  { key: 'performance_metrics', label: 'Performance Metrics', type: 'textarea' },
  { key: 'restrictions', label: 'Restrictions', type: 'textarea' },
];

function EquipmentMatchingPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiForm, setAiForm] = useState({ equipment_id: '', process_step: '' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/equipment-matching');
      setItems(res.data.data || res.data || []);
    } catch (err) { toast.error('Failed to fetch equipment matches'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try { await api.post('/equipment-matching', data); toast.success('Match created'); fetchItems(); }
    catch (err) { toast.error('Failed to create'); }
  };

  const handleUpdate = async (id, data) => {
    try { await api.put(`/equipment-matching/${id}`, data); toast.success('Updated'); setSelected(null); fetchItems(); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/equipment-matching/${id}`); toast.success('Deleted'); fetchItems(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  const handleMatch = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/equipment-matching/match', aiForm);
      setAiResult(res.data.data || res.data);
      toast.success('Matching complete');
    } catch (err) { toast.error('AI matching failed'); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="page">
      <Navbar title="Equipment Matching" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Equipment Matches</h2>
          <div className="toolbar-actions">
            <button className="btn btn-ai" onClick={() => { setShowAI(!showAI); setAiResult(null); }}>
              <FiCpu size={14} /> Match Equipment
            </button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Match
            </button>
            <button className="btn btn-ghost" onClick={fetchItems}><FiRefreshCw size={14} /></button>
          </div>
        </div>

        {showAI && (
          <div className="ai-panel">
            <h3>AI Equipment Matching</h3>
            <div className="ai-form-row">
              <div className="form-group">
                <label>Equipment ID</label>
                <input value={aiForm.equipment_id} onChange={(e) => setAiForm({ ...aiForm, equipment_id: e.target.value })} placeholder="e.g. EQP-001" />
              </div>
              <div className="form-group">
                <label>Process Step</label>
                <input value={aiForm.process_step} onChange={(e) => setAiForm({ ...aiForm, process_step: e.target.value })} placeholder="e.g. etching" />
              </div>
              <button className="btn btn-ai" onClick={handleMatch} disabled={aiLoading}>
                <FiCpu size={14} /> {aiLoading ? 'Matching...' : 'Match'}
              </button>
            </div>
            <AIResultDisplay result={aiResult} loading={aiLoading} title="Equipment Matching Result" />
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
                  <th>Process Step</th>
                  <th>Compatibility Score</th>
                  <th>Qualification Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={4} className="empty-row">No matches found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td className="mono">{item.equipment_id}</td>
                    <td>{item.process_step}</td>
                    <td className="mono">{item.compatibility_score || '-'}</td>
                    <td><span className={`status-dot status-${item.qualification_status || 'pending'}`}>{item.qualification_status || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Equipment Match Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Equipment Match" />}
    </div>
  );
}

export default EquipmentMatchingPage;
