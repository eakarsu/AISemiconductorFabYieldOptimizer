import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiCpu, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';
import AIResultDisplay from '../components/AIResultDisplay';

const fields = [
  { key: 'pattern_name', label: 'Pattern Name', type: 'text', required: true },
  { key: 'pattern_type', label: 'Pattern Type', type: 'select', options: ['center_hotspot', 'edge_ring', 'radial_scratch', 'cluster', 'systematic', 'random', 'zone', 'arc', 'concentric', 'diagonal', 'spiral', 'uniform', 'localized', 'cross'] },
  { key: 'defect_count', label: 'Defect Count', type: 'number' },
  { key: 'affected_area_percentage', label: 'Affected Area %', type: 'number' },
  { key: 'wafer_zone', label: 'Wafer Zone', type: 'text' },
  { key: 'process_step', label: 'Process Step', type: 'text' },
  { key: 'equipment_id', label: 'Equipment ID', type: 'text' },
  { key: 'signature', label: 'Signature', type: 'textarea' },
  { key: 'description', label: 'Description', type: 'textarea' },
];

function DefectPatternsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiForm, setAiForm] = useState({ pattern_name: '', process_step: '' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/defect-patterns');
      setItems(res.data.data || res.data || []);
    } catch (err) { toast.error('Failed to fetch defect patterns'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try { await api.post('/defect-patterns', data); toast.success('Pattern created'); fetchItems(); }
    catch (err) { toast.error('Failed to create'); }
  };

  const handleUpdate = async (id, data) => {
    try { await api.put(`/defect-patterns/${id}`, data); toast.success('Updated'); setSelected(null); fetchItems(); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/defect-patterns/${id}`); toast.success('Deleted'); fetchItems(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  const handleRecognize = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/defect-patterns/recognize', aiForm);
      setAiResult(res.data.data || res.data);
      toast.success('Pattern recognition complete');
    } catch (err) { toast.error('AI recognition failed'); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="page">
      <Navbar title="Defect Pattern Recognition" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Defect Patterns</h2>
          <div className="toolbar-actions">
            <button className="btn btn-ai" onClick={() => { setShowAI(!showAI); setAiResult(null); }}>
              <FiCpu size={14} /> Recognize Pattern
            </button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Pattern
            </button>
            <button className="btn btn-ghost" onClick={fetchItems}><FiRefreshCw size={14} /></button>
          </div>
        </div>

        {showAI && (
          <div className="ai-panel">
            <h3>AI Defect Pattern Recognition</h3>
            <div className="ai-form-row">
              <div className="form-group">
                <label>Pattern Name</label>
                <input value={aiForm.pattern_name} onChange={(e) => setAiForm({ ...aiForm, pattern_name: e.target.value })} placeholder="e.g. Center Hotspot" />
              </div>
              <div className="form-group">
                <label>Process Step</label>
                <input value={aiForm.process_step} onChange={(e) => setAiForm({ ...aiForm, process_step: e.target.value })} placeholder="e.g. lithography" />
              </div>
              <button className="btn btn-ai" onClick={handleRecognize} disabled={aiLoading}>
                <FiCpu size={14} /> {aiLoading ? 'Recognizing...' : 'Recognize'}
              </button>
            </div>
            <AIResultDisplay result={aiResult} loading={aiLoading} title="Pattern Recognition Result" />
          </div>
        )}

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pattern Name</th>
                  <th>Pattern Type</th>
                  <th>Defect Count</th>
                  <th>Wafer Zone</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={4} className="empty-row">No patterns found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td>{item.pattern_name}</td>
                    <td><span className="badge badge-info">{item.pattern_type}</span></td>
                    <td className="mono">{item.defect_count || '-'}</td>
                    <td>{item.wafer_zone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Defect Pattern Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Defect Pattern" />}
    </div>
  );
}

export default DefectPatternsPage;
