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
  { key: 'predicted_yield', label: 'Predicted Yield %', type: 'number' },
  { key: 'actual_yield', label: 'Actual Yield %', type: 'number' },
  { key: 'model_version', label: 'Model Version', type: 'text' },
  { key: 'prediction_type', label: 'Prediction Type', type: 'select', options: ['statistical', 'ml_model', 'hybrid'] },
  { key: 'confidence_interval_low', label: 'Confidence Low %', type: 'number' },
  { key: 'confidence_interval_high', label: 'Confidence High %', type: 'number' },
  { key: 'features_used', label: 'Features Used', type: 'textarea' },
];

function YieldPredictionsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiForm, setAiForm] = useState({ wafer_lot_id: '', prediction_type: '' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/yield-predictions');
      setItems(res.data.data || res.data || []);
    } catch (err) {
      toast.error('Failed to fetch yield predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try {
      await api.post('/yield-predictions', data);
      toast.success('Prediction created');
      fetchItems();
    } catch (err) { toast.error('Failed to create prediction'); }
  };

  const handleUpdate = async (id, data) => {
    try {
      await api.put(`/yield-predictions/${id}`, data);
      toast.success('Prediction updated');
      setSelected(null);
      fetchItems();
    } catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/yield-predictions/${id}`);
      toast.success('Prediction deleted');
      fetchItems();
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handlePredict = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/yield-predictions/predict', aiForm);
      setAiResult(res.data.data || res.data);
      toast.success('Prediction complete');
    } catch (err) { toast.error('AI prediction failed'); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="page">
      <Navbar title="Yield Prediction" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Yield Predictions</h2>
          <div className="toolbar-actions">
            <button className="btn btn-ai" onClick={() => { setShowAI(!showAI); setAiResult(null); }}>
              <FiCpu size={14} /> Predict Yield
            </button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Prediction
            </button>
            <button className="btn btn-ghost" onClick={fetchItems}><FiRefreshCw size={14} /></button>
          </div>
        </div>

        {showAI && (
          <div className="ai-panel">
            <h3>AI Yield Prediction</h3>
            <div className="ai-form-row">
              <div className="form-group">
                <label>Wafer Lot ID</label>
                <input value={aiForm.wafer_lot_id} onChange={(e) => setAiForm({ ...aiForm, wafer_lot_id: e.target.value })} placeholder="e.g. LOT-001" />
              </div>
              <div className="form-group">
                <label>Prediction Type</label>
                <select value={aiForm.prediction_type} onChange={(e) => setAiForm({ ...aiForm, prediction_type: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="statistical">Statistical</option>
                  <option value="ml_model">ML Model</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <button className="btn btn-ai" onClick={handlePredict} disabled={aiLoading}>
                <FiCpu size={14} /> {aiLoading ? 'Predicting...' : 'Predict'}
              </button>
            </div>
            <AIResultDisplay result={aiResult} loading={aiLoading} title="Yield Prediction Result" />
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
                  <th>Predicted Yield</th>
                  <th>Actual Yield</th>
                  <th>Prediction Type</th>
                  <th>Model Version</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="empty-row">No predictions found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td className="mono">{item.wafer_lot_id}</td>
                    <td className="mono">{item.predicted_yield ? `${item.predicted_yield}%` : '-'}</td>
                    <td className="mono">{item.actual_yield ? `${item.actual_yield}%` : '-'}</td>
                    <td>{item.prediction_type || '-'}</td>
                    <td>{item.model_version || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Yield Prediction Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Yield Prediction" />}
    </div>
  );
}

export default YieldPredictionsPage;
