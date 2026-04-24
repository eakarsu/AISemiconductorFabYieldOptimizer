import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';

const fields = [
  { key: 'lot_number', label: 'Lot Number', type: 'text', required: true },
  { key: 'product_name', label: 'Product Name', type: 'text', required: true },
  { key: 'technology_node', label: 'Technology Node', type: 'text' },
  { key: 'wafer_count', label: 'Wafer Count', type: 'number', required: true },
  { key: 'start_date', label: 'Start Date', type: 'date' },
  { key: 'target_completion_date', label: 'Target Completion', type: 'date' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  { key: 'status', label: 'Status', type: 'select', options: ['queued', 'in_progress', 'on_hold', 'completed', 'scrapped'] },
  { key: 'customer', label: 'Customer', type: 'text' },
];

function WaferLotsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/wafer-lots');
      setItems(res.data.data || res.data || []);
    } catch (err) { toast.error('Failed to fetch wafer lots'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try { await api.post('/wafer-lots', data); toast.success('Lot created'); fetchItems(); }
    catch (err) { toast.error('Failed to create lot'); }
  };

  const handleUpdate = async (id, data) => {
    try { await api.put(`/wafer-lots/${id}`, data); toast.success('Lot updated'); setSelected(null); fetchItems(); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/wafer-lots/${id}`); toast.success('Lot deleted'); fetchItems(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  return (
    <div className="page">
      <Navbar title="Wafer Lot Management" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Wafer Lots</h2>
          <div className="toolbar-actions">
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Lot
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
                  <th>Lot Number</th>
                  <th>Product Name</th>
                  <th>Technology Node</th>
                  <th>Wafer Count</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="empty-row">No lots found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td className="mono">{item.lot_number}</td>
                    <td>{item.product_name}</td>
                    <td>{item.technology_node || '-'}</td>
                    <td className="mono">{item.wafer_count}</td>
                    <td><span className={`status-dot status-${item.priority || 'low'}`}>{item.priority || '-'}</span></td>
                    <td><span className={`status-dot status-${item.status || 'queued'}`}>{item.status || 'queued'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Wafer Lot Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Wafer Lot" />}
    </div>
  );
}

export default WaferLotsPage;
