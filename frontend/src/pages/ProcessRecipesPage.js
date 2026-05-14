import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCw, FiTrendingUp, FiCpu } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';

const fields = [
  { key: 'recipe_name', label: 'Recipe Name', type: 'text', required: true },
  { key: 'process_type', label: 'Process Type', type: 'select', options: ['deposition', 'etch', 'lithography', 'CMP', 'implant', 'oxidation', 'coat', 'ash', 'wet_clean', 'anneal'] },
  { key: 'technology_node', label: 'Technology Node', type: 'text' },
  { key: 'version', label: 'Version', type: 'text' },
  { key: 'equipment_type', label: 'Equipment Type', type: 'text' },
  { key: 'steps', label: 'Steps', type: 'textarea' },
  { key: 'parameters', label: 'Parameters', type: 'textarea' },
  { key: 'approved_by', label: 'Approved By', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'draft', 'deprecated'] },
];

function ProcessRecipesPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [optimizeId, setOptimizeId] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optResult, setOptResult] = useState(null);
  const [showOptPanel, setShowOptPanel] = useState(false);
  const [showRecPanel, setShowRecPanel] = useState(false);
  const [recForm, setRecForm] = useState({ process_type: '', technology_node: '', equipment_type: '', target_yield: '', constraints: '', notes: '' });
  const [recommending, setRecommending] = useState(false);
  const [recResult, setRecResult] = useState(null);

  const fetchItems = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/process-recipes?page=${page}&limit=20`);
      setItems(res.data.data || res.data || []);
      if (res.data.pagination) setPagination(res.data.pagination);
    } catch (err) { toast.error('Failed to fetch recipes'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try { await api.post('/process-recipes', data); toast.success('Recipe created'); fetchItems(); }
    catch (err) { toast.error('Failed to create'); }
  };

  const handleUpdate = async (id, data) => {
    try { await api.put(`/process-recipes/${id}`, data); toast.success('Updated'); setSelected(null); fetchItems(); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/process-recipes/${id}`); toast.success('Deleted'); fetchItems(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  const handleRecommend = async () => {
    if (!recForm.process_type) { toast.error('process_type is required'); return; }
    setRecommending(true);
    setRecResult(null);
    try {
      const payload = {
        process_type: recForm.process_type,
        technology_node: recForm.technology_node || undefined,
        equipment_type: recForm.equipment_type || undefined,
        target_yield: recForm.target_yield ? Number(recForm.target_yield) : undefined,
        constraints: recForm.constraints || undefined,
        notes: recForm.notes || undefined,
      };
      const res = await api.post('/process-recipes/recommend', payload);
      setRecResult(res.data.recommendation);
      toast.success('Recipe recommendation ready');
    } catch (err) {
      if (err.response?.status === 503) {
        toast.error('AI service unavailable: OPENROUTER_API_KEY is not configured.');
      } else {
        toast.error('Recommend failed: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setRecommending(false);
    }
  };

  const handleOptimize = async () => {
    if (!optimizeId.trim()) { toast.error('Enter a recipe ID'); return; }
    setOptimizing(true);
    setOptResult(null);
    try {
      const res = await api.post(`/process-recipes/${optimizeId}/optimize`);
      setOptResult(res.data.optimization);
      toast.success('Recipe optimization complete');
    } catch (err) {
      toast.error('Optimization failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="page">
      <Navbar title="Process Recipes" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Process Recipes <span style={{ color: '#64748b', fontSize: 14 }}>({pagination.total} total)</span></h2>
          <div className="toolbar-actions">
            <button className="btn btn-ai" onClick={() => { setShowOptPanel(!showOptPanel); setOptResult(null); }}>
              <FiTrendingUp size={14} /> Recipe Optimizer
            </button>
            <button className="btn btn-ai" onClick={() => { setShowRecPanel(!showRecPanel); setRecResult(null); }}>
              <FiCpu size={14} /> AI Recipe Recommender
            </button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><FiPlus size={14} /> New Recipe</button>
            <button className="btn btn-ghost" onClick={() => fetchItems(pagination.page)}><FiRefreshCw size={14} /></button>
          </div>
        </div>

        {showRecPanel && (
          <div className="ai-panel" style={{ marginBottom: 16 }}>
            <h3><FiCpu size={16} style={{ marginRight: 6 }} />AI Recipe Recommender</h3>
            <p style={{ color: '#94a3b8', marginBottom: 12 }}>Generate a brand-new recipe blueprint from constraints. Uses recent recipes of the same process type as grounding context.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label>Process type *</label>
                <select value={recForm.process_type} onChange={e => setRecForm({ ...recForm, process_type: e.target.value })}>
                  <option value="">-- Select --</option>
                  {['deposition', 'etch', 'lithography', 'CMP', 'implant', 'oxidation', 'coat', 'ash', 'wet_clean', 'anneal'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Technology node</label>
                <input value={recForm.technology_node} onChange={e => setRecForm({ ...recForm, technology_node: e.target.value })} placeholder="e.g. 7nm" />
              </div>
              <div className="form-group">
                <label>Equipment type</label>
                <input value={recForm.equipment_type} onChange={e => setRecForm({ ...recForm, equipment_type: e.target.value })} placeholder="e.g. ICP etcher" />
              </div>
              <div className="form-group">
                <label>Target yield (%)</label>
                <input type="number" value={recForm.target_yield} onChange={e => setRecForm({ ...recForm, target_yield: e.target.value })} placeholder="92" />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Constraints</label>
                <input value={recForm.constraints} onChange={e => setRecForm({ ...recForm, constraints: e.target.value })} placeholder="thermal budget, chemistry restrictions, etc." />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 3' }}>
                <label>Notes</label>
                <input value={recForm.notes} onChange={e => setRecForm({ ...recForm, notes: e.target.value })} placeholder="any extra context" />
              </div>
            </div>
            <button className="btn btn-ai" onClick={handleRecommend} disabled={recommending}>
              <FiCpu size={14} /> {recommending ? 'Generating...' : 'Recommend Recipe'}
            </button>
            {recResult && (
              <div style={{ marginTop: 16, background: '#0f172a', padding: 12, borderRadius: 8 }}>
                <pre style={{ color: '#e2e8f0', fontSize: 12, overflow: 'auto', maxHeight: 360 }}>
                  {JSON.stringify(recResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {showOptPanel && (
          <div className="ai-panel" style={{ marginBottom: 16 }}>
            <h3><FiTrendingUp size={16} style={{ marginRight: 6 }} />AI Recipe Optimizer</h3>
            <p style={{ color: '#94a3b8', marginBottom: 12 }}>Enter a recipe ID to get AI-powered parameter adjustment recommendations for yield improvement.</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div className="form-group">
                <label>Recipe ID</label>
                <input value={optimizeId} onChange={e => setOptimizeId(e.target.value)} placeholder="e.g. 1" style={{ width: 120 }} />
              </div>
              <button className="btn btn-ai" onClick={handleOptimize} disabled={optimizing}>
                <FiTrendingUp size={14} /> {optimizing ? 'Optimizing...' : 'Optimize Recipe'}
              </button>
            </div>

            {optResult && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: '#0f172a', padding: 12, borderRadius: 8 }}>
                    <div style={{ color: '#64748b', fontSize: 12 }}>Current Yield</div>
                    <div style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700 }}>{optResult.current_estimated_yield?.toFixed(1)}%</div>
                  </div>
                  <div style={{ background: '#0f172a', padding: 12, borderRadius: 8 }}>
                    <div style={{ color: '#64748b', fontSize: 12 }}>Optimized Yield</div>
                    <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>{optResult.optimized_estimated_yield?.toFixed(1)}%</div>
                  </div>
                  <div style={{ background: '#0f172a', padding: 12, borderRadius: 8 }}>
                    <div style={{ color: '#64748b', fontSize: 12 }}>Improvement</div>
                    <div style={{ color: '#6366f1', fontSize: 20, fontWeight: 700 }}>+{optResult.yield_improvement_percent?.toFixed(1)}%</div>
                  </div>
                </div>
                <div style={{ background: '#0f172a', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}><strong style={{ color: '#e2e8f0' }}>Strategy:</strong> {optResult.optimization_strategy}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13 }}><strong style={{ color: '#e2e8f0' }}>Risk:</strong> {optResult.risk_assessment}</div>
                </div>
                <h4 style={{ color: '#6366f1', marginBottom: 8 }}>Parameter Adjustments</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Parameter</th><th>Current</th><th>Suggested</th><th>Yield Impact</th><th>Reason</th></tr></thead>
                    <tbody>
                      {optResult.parameter_adjustments?.map((p, i) => (
                        <tr key={i}>
                          <td>{p.parameter}</td>
                          <td className="mono">{p.current_value}</td>
                          <td className="mono" style={{ color: '#22c55e' }}>{p.suggested_value}</td>
                          <td style={{ color: '#6366f1' }}>+{p.yield_impact_percent?.toFixed(1)}%</td>
                          <td style={{ color: '#94a3b8', fontSize: 12 }}>{p.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                  <tr><th>ID</th><th>Recipe Name</th><th>Process Type</th><th>Technology Node</th><th>Version</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={6} className="empty-row">No recipes found</td></tr>
                  ) : items.map((item, i) => (
                    <tr key={item.id || i} onClick={() => setSelected(item)} className="clickable-row">
                      <td style={{ color: '#64748b' }}>{item.id}</td>
                      <td>{item.recipe_name}</td>
                      <td><span className="badge badge-info">{item.process_type}</span></td>
                      <td>{item.technology_node || '-'}</td>
                      <td className="mono">{item.version || '-'}</td>
                      <td><span className={`status-dot status-${item.status || 'draft'}`}>{item.status || 'draft'}</span></td>
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

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Process Recipe Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Process Recipe" />}
    </div>
  );
}

export default ProcessRecipesPage;
