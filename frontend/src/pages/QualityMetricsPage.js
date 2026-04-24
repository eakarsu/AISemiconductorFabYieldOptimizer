import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';

const fields = [
  { key: 'wafer_lot_id', label: 'Wafer Lot ID', type: 'text', required: true },
  { key: 'metric_name', label: 'Metric Name', type: 'text', required: true },
  { key: 'metric_value', label: 'Metric Value', type: 'number', required: true },
  { key: 'unit', label: 'Unit', type: 'text' },
  { key: 'target_value', label: 'Target', type: 'number' },
  { key: 'lower_spec_limit', label: 'Lower Spec Limit', type: 'number' },
  { key: 'upper_spec_limit', label: 'Upper Spec Limit', type: 'number' },
  { key: 'process_step', label: 'Process Step', type: 'text' },
  { key: 'equipment_id', label: 'Equipment ID', type: 'text' },
  { key: 'measurement_site', label: 'Measurement Site', type: 'text' },
  { key: 'cpk', label: 'Cpk', type: 'number' },
  { key: 'cp', label: 'Cp', type: 'number' },
];

function QualityMetricsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/quality-metrics');
      setItems(res.data.data || res.data || []);
    } catch (err) { toast.error('Failed to fetch quality metrics'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try { await api.post('/quality-metrics', data); toast.success('Metric created'); fetchItems(); }
    catch (err) { toast.error('Failed to create'); }
  };

  const handleUpdate = async (id, data) => {
    try { await api.put(`/quality-metrics/${id}`, data); toast.success('Updated'); setSelected(null); fetchItems(); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/quality-metrics/${id}`); toast.success('Deleted'); fetchItems(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  return (
    <div className="page">
      <Navbar title="Quality Metrics" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Quality Metrics</h2>
          <div className="toolbar-actions">
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Metric
            </button>
            <button className="btn btn-ghost" onClick={fetchItems}><FiRefreshCw size={14} /></button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Wafer Lot ID</th>
                  <th>Metric Name</th>
                  <th>Metric Value</th>
                  <th>Unit</th>
                  <th>Target Value</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="empty-row">No metrics found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td className="mono">{item.wafer_lot_id}</td>
                    <td>{item.metric_name}</td>
                    <td className="mono">{item.metric_value}</td>
                    <td>{item.unit || '-'}</td>
                    <td className="mono">{item.target_value || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Quality Metric Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Quality Metric" />}
    </div>
  );
}

export default QualityMetricsPage;
