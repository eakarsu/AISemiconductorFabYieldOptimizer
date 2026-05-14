import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiCpu, FiRefreshCw, FiUpload, FiEye, FiMapPin } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';
import AIResultDisplay from '../components/AIResultDisplay';

const fields = [
  { key: 'wafer_lot_id', label: 'Wafer Lot ID', type: 'text', required: true },
  { key: 'defect_type', label: 'Defect Type', type: 'select', options: ['PARTICLE', 'SCRATCH', 'PATTERN', 'VOID', 'BRIDGING', 'RESIDUE', 'CRACK', 'CONTAMINATION', 'DELAMINATION', 'CORROSION'], required: true },
  { key: 'location_x', label: 'Location X mm', type: 'number' },
  { key: 'location_y', label: 'Location Y mm', type: 'number' },
  { key: 'size_um', label: 'Size um', type: 'number' },
  { key: 'severity', label: 'Severity', type: 'select', options: ['critical', 'major', 'minor', 'cosmetic'] },
  { key: 'layer', label: 'Layer', type: 'text' },
  { key: 'process_step', label: 'Process Step', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
];

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

function DefectLocationMap({ defect }) {
  if (!defect || (defect.location_x == null && defect.location_y == null)) return null;
  const x = ((defect.location_x + 150) / 300) * 100;
  const y = ((150 - defect.location_y) / 300) * 100;
  const severityColors = { critical: '#ef4444', major: '#f97316', minor: '#eab308', cosmetic: '#22c55e' };
  const color = severityColors[defect.severity] || '#6366f1';
  return (
    <div style={{ position: 'relative', width: 160, height: 160, background: '#1e293b', borderRadius: '50%', margin: '12px auto', border: '2px solid #334155' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 2, height: '100%', background: '#334155', transform: 'translateX(-50%)' }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 2, background: '#334155', transform: 'translateY(-50%)' }} />
      <div style={{ position: 'absolute', left: `${Math.min(95, Math.max(5, x))}%`, top: `${Math.min(95, Math.max(5, y))}%`, width: 10, height: 10, background: color, borderRadius: '50%', transform: 'translate(-50%,-50%)', boxShadow: `0 0 8px ${color}` }} title={`(${defect.location_x}, ${defect.location_y})`} />
      <div style={{ position: 'absolute', bottom: -20, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>Location Map ({defect.location_x}, {defect.location_y})</div>
    </div>
  );
}

function WaferDefectsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiForm, setAiForm] = useState({ defect_id: '', location_x: '', location_y: '', size_um: '', layer: '', process_step: '', description: '' });
  const [uploadTarget, setUploadTarget] = useState(null);
  const [visionDefectId, setVisionDefectId] = useState('');
  const [visionResult, setVisionResult] = useState(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const fileRef = useRef();

  const fetchItems = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/wafer-defects?page=${page}&limit=20`);
      setItems(res.data.data || res.data || []);
      if (res.data.pagination) setPagination(res.data.pagination);
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
    } catch (err) { toast.error('Failed to create defect'); }
  };

  const handleUpdate = async (id, data) => {
    try {
      await api.put(`/wafer-defects/${id}`, data);
      toast.success('Defect updated');
      setSelected(null);
      fetchItems();
    } catch (err) { toast.error('Failed to update defect'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/wafer-defects/${id}`);
      toast.success('Defect deleted');
      fetchItems();
    } catch (err) { toast.error('Failed to delete defect'); }
  };

  const handleClassify = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/wafer-defects/classify', aiForm);
      setAiResult(res.data.classification || res.data);
      toast.success('Classification complete');
    } catch (err) { toast.error('AI classification failed'); }
    finally { setAiLoading(false); }
  };

  const handleImageUpload = async (defectId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      await api.post(`/wafer-defects/${defectId}/upload-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Image uploaded');
      fetchItems();
    } catch (err) { toast.error('Image upload failed'); }
  };

  const handleVisionAnalyze = async () => {
    if (!visionDefectId) { toast.error('Enter a defect ID'); return; }
    setVisionLoading(true);
    setVisionResult(null);
    try {
      const res = await api.post(`/wafer-defects/${visionDefectId}/analyze-image`);
      setVisionResult(res.data.classification);
      toast.success('Vision analysis complete');
    } catch (err) { toast.error('Vision analysis failed: ' + (err.response?.data?.error || err.message)); }
    finally { setVisionLoading(false); }
  };

  const severityColor = { critical: '#ef4444', major: '#f97316', minor: '#eab308', cosmetic: '#22c55e' };

  return (
    <div className="page">
      <Navbar title="Wafer Defect Classification" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Wafer Defects <span style={{ color: '#64748b', fontSize: 14 }}>({pagination.total} total)</span></h2>
          <div className="toolbar-actions">
            <button className="btn btn-ai" onClick={() => { setShowAI(!showAI); setAiResult(null); }}>
              <FiCpu size={14} /> Classify
            </button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Defect
            </button>
            <button className="btn btn-ghost" onClick={() => fetchItems(pagination.page)}>
              <FiRefreshCw size={14} />
            </button>
          </div>
        </div>

        {showAI && (
          <div className="ai-panel" style={{ marginBottom: 16 }}>
            <h3>AI Defect Classification (Text-Based)</h3>
            <div className="ai-form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {['defect_id', 'location_x', 'location_y', 'size_um', 'layer', 'process_step', 'description'].map(k => (
                <div className="form-group" key={k}>
                  <label>{k.replace(/_/g, ' ')}</label>
                  <input value={aiForm[k]} onChange={e => setAiForm({ ...aiForm, [k]: e.target.value })} placeholder={k} />
                </div>
              ))}
            </div>
            <button className="btn btn-ai" onClick={handleClassify} disabled={aiLoading}>
              <FiCpu size={14} /> {aiLoading ? 'Classifying...' : 'Classify'}
            </button>
            <AIResultDisplay result={aiResult} loading={aiLoading} title="Classification Result" />

            <hr style={{ margin: '20px 0', borderColor: '#334155' }} />
            <h3><FiEye size={16} style={{ marginRight: 6 }} />Vision Analysis (SEM Image)</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group">
                <label>Defect ID</label>
                <input value={visionDefectId} onChange={e => setVisionDefectId(e.target.value)} placeholder="Defect record ID" style={{ width: 120 }} />
              </div>
              <div className="form-group">
                <label>Upload Image to Defect ID</label>
                <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={e => { if (e.target.files[0] && visionDefectId) handleImageUpload(visionDefectId, e.target.files[0]); }} />
                <button className="btn btn-ghost" onClick={() => fileRef.current.click()}>
                  <FiUpload size={14} /> Upload Image
                </button>
              </div>
              <button className="btn btn-ai" onClick={handleVisionAnalyze} disabled={visionLoading}>
                <FiEye size={14} /> {visionLoading ? 'Analyzing...' : 'Run Vision Analysis'}
              </button>
            </div>
            {visionResult && (
              <div style={{ marginTop: 16, background: '#0f172a', padding: 16, borderRadius: 8 }}>
                <h4 style={{ color: '#6366f1', marginBottom: 8 }}>Vision Analysis Result</h4>
                <DefectLocationMap defect={{ location_x: visionResult.location?.x_estimate, location_y: visionResult.location?.y_estimate, severity: visionResult.severity }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 24 }}>
                  {Object.entries(visionResult).map(([k, v]) => typeof v !== 'object' && (
                    <div key={k} style={{ background: '#1e293b', padding: 8, borderRadius: 6 }}>
                      <div style={{ color: '#64748b', fontSize: 11 }}>{k.replace(/_/g, ' ')}</div>
                      <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
                {visionResult.location && (
                  <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
                    Location: Zone={visionResult.location.zone}, X={visionResult.location.x_estimate}, Y={visionResult.location.y_estimate}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Wafer Lot ID</th>
                    <th>Defect Type</th>
                    <th>Severity</th>
                    <th>Layer</th>
                    <th>Process Step</th>
                    <th>AI Classified</th>
                    <th>Image</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={8} className="empty-row">No defects found</td></tr>
                  ) : items.map((item, i) => (
                    <tr key={item.id || i} onClick={() => setSelected(item)} className="clickable-row">
                      <td className="mono">{item.id}</td>
                      <td className="mono">{item.wafer_lot_id}</td>
                      <td><span className="badge">{item.defect_type}</span></td>
                      <td><span style={{ color: severityColor[item.severity] || '#94a3b8', fontWeight: 600 }}>{item.severity || '-'}</span></td>
                      <td>{item.layer || '-'}</td>
                      <td>{item.process_step || '-'}</td>
                      <td>{item.classified_by_ai ? <span style={{ color: '#22c55e' }}>Yes ({(item.ai_confidence * 100).toFixed(0)}%)</span> : '-'}</td>
                      <td>{item.image_url ? <a href={`${BACKEND}${item.image_url}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#6366f1' }}>View</a> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => fetchItems(p)} className={`btn ${p === pagination.page ? 'btn-primary' : 'btn-ghost'}`} style={{ minWidth: 36 }}>{p}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Wafer Defect Details">
          <DefectLocationMap defect={selected} />
        </DetailModal>
      )}
      {showNew && (
        <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Wafer Defect" />
      )}
    </div>
  );
}

export default WaferDefectsPage;
