import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCw, FiCheck } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';

const fields = [
  { key: 'equipment_id', label: 'Equipment ID', type: 'text', required: true },
  { key: 'parameter_name', label: 'Parameter Name', type: 'text', required: true },
  { key: 'rule_violated', label: 'Rule Violated', type: 'text' },
  { key: 'current_value', label: 'Current Value', type: 'number' },
  { key: 'control_limit_upper', label: 'UCL', type: 'number' },
  { key: 'control_limit_lower', label: 'LCL', type: 'number' },
  { key: 'center_line', label: 'Center Line', type: 'number' },
  { key: 'severity', label: 'Severity', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  { key: 'process_step', label: 'Process Step', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
];

function SpcAlertsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/spc-alerts');
      setItems(res.data.data || res.data || []);
    } catch (err) { toast.error('Failed to fetch SPC alerts'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try { await api.post('/spc-alerts', data); toast.success('Alert created'); fetchItems(); }
    catch (err) { toast.error('Failed to create'); }
  };

  const handleUpdate = async (id, data) => {
    try { await api.put(`/spc-alerts/${id}`, data); toast.success('Updated'); setSelected(null); fetchItems(); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/spc-alerts/${id}`); toast.success('Deleted'); fetchItems(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  const handleAcknowledge = async (e, item) => {
    e.stopPropagation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      await api.put(`/spc-alerts/${item._id || item.id}`, {
        ...item,
        status: 'acknowledged',
        acknowledged_by: user.name || 'User',
      });
      toast.success('Alert acknowledged');
      fetchItems();
    } catch (err) {
      toast.error('Failed to acknowledge');
    }
  };

  return (
    <div className="page">
      <Navbar title="SPC Alerts" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>SPC Alerts</h2>
          <div className="toolbar-actions">
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Alert
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
                  <th>Equipment ID</th>
                  <th>Parameter Name</th>
                  <th>Severity</th>
                  <th>Rule Violated</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="empty-row">No alerts found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td className="mono">{item.equipment_id}</td>
                    <td>{item.parameter_name}</td>
                    <td><span className={`status-dot status-${item.severity || 'low'}`}>{item.severity || '-'}</span></td>
                    <td>{item.rule_violated || '-'}</td>
                    <td><span className={`status-dot status-${item.status || 'active'}`}>{item.status || 'active'}</span></td>
                    <td>
                      {item.status === 'active' && (
                        <button className="btn btn-sm btn-secondary" onClick={(e) => handleAcknowledge(e, item)}>
                          <FiCheck size={12} /> Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="SPC Alert Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New SPC Alert" />}
    </div>
  );
}

export default SpcAlertsPage;
