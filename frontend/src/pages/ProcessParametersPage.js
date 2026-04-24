import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiCpu, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';
import AIResultDisplay from '../components/AIResultDisplay';

const fields = [
  { key: 'recipe_id', label: 'Recipe ID', type: 'text', required: true },
  { key: 'parameter_name', label: 'Parameter Name', type: 'text', required: true },
  { key: 'target_value', label: 'Target Value', type: 'number' },
  { key: 'lower_limit', label: 'Lower Limit', type: 'number' },
  { key: 'upper_limit', label: 'Upper Limit', type: 'number' },
  { key: 'unit', label: 'Unit', type: 'text' },
  { key: 'process_step', label: 'Process Step', type: 'text' },
  { key: 'equipment_id', label: 'Equipment ID', type: 'text' },
  { key: 'measurement_frequency', label: 'Measurement Frequency', type: 'text' },
];

function ProcessParametersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiForm, setAiForm] = useState({ process_step: '', equipment_id: '', target_yield: '95' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/process-parameters');
      setItems(res.data.data || res.data || []);
    } catch (err) {
      toast.error('Failed to fetch process parameters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try {
      await api.post('/process-parameters', data);
      toast.success('Parameter created');
      fetchItems();
    } catch (err) {
      toast.error('Failed to create parameter');
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await api.put(`/process-parameters/${id}`, data);
      toast.success('Parameter updated');
      setSelected(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to update parameter');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/process-parameters/${id}`);
      toast.success('Parameter deleted');
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete parameter');
    }
  };

  const handleOptimize = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/process-parameters/optimize', aiForm);
      setAiResult(res.data.data || res.data);
      toast.success('Optimization complete');
    } catch (err) {
      toast.error('AI optimization failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="page">
      <Navbar title="Process Parameter Optimization" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Process Parameters</h2>
          <div className="toolbar-actions">
            <button className="btn btn-ai" onClick={() => { setShowAI(!showAI); setAiResult(null); }}>
              <FiCpu size={14} /> Optimize Parameters
            </button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Parameter
            </button>
            <button className="btn btn-ghost" onClick={fetchItems}><FiRefreshCw size={14} /></button>
          </div>
        </div>

        {showAI && (
          <div className="ai-panel">
            <h3>AI Parameter Optimization</h3>
            <div className="ai-form-row">
              <div className="form-group">
                <label>Process Step</label>
                <input value={aiForm.process_step} onChange={(e) => setAiForm({ ...aiForm, process_step: e.target.value })} placeholder="e.g. lithography" />
              </div>
              <div className="form-group">
                <label>Equipment ID</label>
                <input value={aiForm.equipment_id} onChange={(e) => setAiForm({ ...aiForm, equipment_id: e.target.value })} placeholder="e.g. EQP-001" />
              </div>
              <div className="form-group">
                <label>Target Yield (%)</label>
                <input type="number" value={aiForm.target_yield} onChange={(e) => setAiForm({ ...aiForm, target_yield: e.target.value })} />
              </div>
              <button className="btn btn-ai" onClick={handleOptimize} disabled={aiLoading}>
                <FiCpu size={14} /> {aiLoading ? 'Optimizing...' : 'Optimize'}
              </button>
            </div>
            <AIResultDisplay result={aiResult} loading={aiLoading} title="Parameter Optimization Result" />
          </div>
        )}

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipe ID</th>
                  <th>Parameter Name</th>
                  <th>Target Value</th>
                  <th>Unit</th>
                  <th>Process Step</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="empty-row">No parameters found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td className="mono">{item.recipe_id}</td>
                    <td>{item.parameter_name}</td>
                    <td className="mono">{item.target_value || '-'}</td>
                    <td>{item.unit || '-'}</td>
                    <td>{item.process_step || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Process Parameter Details" />
      )}
      {showNew && (
        <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Process Parameter" />
      )}
    </div>
  );
}

export default ProcessParametersPage;
