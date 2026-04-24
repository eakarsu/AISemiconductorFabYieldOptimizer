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
  { key: 'defect_type', label: 'Defect Type', type: 'select', options: ['particle_contamination', 'scratch', 'pattern_defect', 'void', 'bridging', 'residue', 'film_peeling', 'overlay_shift', 'cd_variation', 'etch_pit', 'staining', 'crystal_defect', 'metal_contamination', 'gate_oxide_defect', 'contact_open'], required: true },
  { key: 'location_x', label: 'Location X mm', type: 'number' },
  { key: 'location_y', label: 'Location Y mm', type: 'number' },
  { key: 'size_um', label: 'Size um', type: 'number' },
  { key: 'severity', label: 'Severity', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  { key: 'layer', label: 'Layer', type: 'text' },
  { key: 'process_step', label: 'Process Step', type: 'text' },
  { key: 'image_url', label: 'Image URL', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
];

function WaferDefectsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiForm, setAiForm] = useState({ wafer_lot_id: '', image_url: '', defect_type: '' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/wafer-defects');
      setItems(res.data.data || res.data || []);
    } catch (err) {
      toast.error('Failed to fetch wafer defects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try {
      await api.post('/wafer-defects', data);
      toast.success('Defect created');
      fetchItems();
    } catch (err) {
      toast.error('Failed to create defect');
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await api.put(`/wafer-defects/${id}`, data);
      toast.success('Defect updated');
      setSelected(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to update defect');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/wafer-defects/${id}`);
      toast.success('Defect deleted');
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete defect');
    }
  };

  const handleClassify = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/wafer-defects/classify', aiForm);
      setAiResult(res.data.data || res.data);
      toast.success('Classification complete');
    } catch (err) {
      toast.error('AI classification failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="page">
      <Navbar title="Wafer Defect Classification" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Wafer Defects</h2>
          <div className="toolbar-actions">
            <button className="btn btn-ai" onClick={() => { setShowAI(!showAI); setAiResult(null); }}>
              <FiCpu size={14} /> Classify Defect
            </button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Defect
            </button>
            <button className="btn btn-ghost" onClick={fetchItems}>
              <FiRefreshCw size={14} />
            </button>
          </div>
        </div>

        {showAI && (
          <div className="ai-panel">
            <h3>AI Defect Classification</h3>
            <div className="ai-form-row">
              <div className="form-group">
                <label>Wafer Lot ID</label>
                <input value={aiForm.wafer_lot_id} onChange={(e) => setAiForm({ ...aiForm, wafer_lot_id: e.target.value })} placeholder="e.g. WFR-001" />
              </div>
              <div className="form-group">
                <label>Defect Type</label>
                <select value={aiForm.defect_type} onChange={(e) => setAiForm({ ...aiForm, defect_type: e.target.value })}>
                  <option value="">Select type...</option>
                  <option value="particle_contamination">Particle Contamination</option>
                  <option value="scratch">Scratch</option>
                  <option value="pattern_defect">Pattern Defect</option>
                  <option value="void">Void</option>
                  <option value="bridging">Bridging</option>
                  <option value="residue">Residue</option>
                  <option value="film_peeling">Film Peeling</option>
                  <option value="overlay_shift">Overlay Shift</option>
                  <option value="cd_variation">CD Variation</option>
                  <option value="etch_pit">Etch Pit</option>
                  <option value="staining">Staining</option>
                  <option value="crystal_defect">Crystal Defect</option>
                  <option value="metal_contamination">Metal Contamination</option>
                  <option value="gate_oxide_defect">Gate Oxide Defect</option>
                  <option value="contact_open">Contact Open</option>
                </select>
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input value={aiForm.image_url} onChange={(e) => setAiForm({ ...aiForm, image_url: e.target.value })} placeholder="Optional image URL" />
              </div>
              <button className="btn btn-ai" onClick={handleClassify} disabled={aiLoading}>
                <FiCpu size={14} /> {aiLoading ? 'Classifying...' : 'Classify'}
              </button>
            </div>
            <AIResultDisplay result={aiResult} loading={aiLoading} title="Defect Classification Result" />
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
                  <th>Defect Type</th>
                  <th>Severity</th>
                  <th>Layer</th>
                  <th>Process Step</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="empty-row">No defects found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td className="mono">{item.wafer_lot_id}</td>
                    <td><span className={`badge badge-${item.severity || 'info'}`}>{item.defect_type}</span></td>
                    <td><span className={`status-dot status-${item.severity || 'low'}`}>{item.severity || '-'}</span></td>
                    <td>{item.layer || '-'}</td>
                    <td>{item.process_step || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <DetailModal
          item={selected}
          fields={fields}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          title="Wafer Defect Details"
        />
      )}
      {showNew && (
        <NewItemModal
          fields={fields}
          onClose={() => setShowNew(false)}
          onSubmit={handleCreate}
          title="New Wafer Defect"
        />
      )}
    </div>
  );
}

export default WaferDefectsPage;
