import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';

const fields = [
  { key: 'equipment_id', label: 'Equipment ID', type: 'text', required: true },
  { key: 'maintenance_type', label: 'Type', type: 'select', options: ['preventive', 'corrective', 'calibration', 'cleaning', 'parts_replacement'], required: true },
  { key: 'scheduled_date', label: 'Scheduled Date', type: 'date', required: true },
  { key: 'estimated_duration_hours', label: 'Est. Hours', type: 'number' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'assigned_technician', label: 'Assigned Technician', type: 'text' },
  { key: 'parts_required', label: 'Parts Required', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
];

function MaintenanceSchedulesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/maintenance-schedules');
      setItems(res.data.data || res.data || []);
    } catch (err) { toast.error('Failed to fetch schedules'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try { await api.post('/maintenance-schedules', data); toast.success('Schedule created'); fetchItems(); }
    catch (err) { toast.error('Failed to create'); }
  };

  const handleUpdate = async (id, data) => {
    try { await api.put(`/maintenance-schedules/${id}`, data); toast.success('Updated'); setSelected(null); fetchItems(); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/maintenance-schedules/${id}`); toast.success('Deleted'); fetchItems(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  return (
    <div className="page">
      <Navbar title="Maintenance Scheduling" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Maintenance Schedules</h2>
          <div className="toolbar-actions">
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Schedule
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
                  <th>Type</th>
                  <th>Scheduled Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="empty-row">No schedules found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td className="mono">{item.equipment_id}</td>
                    <td><span className="badge badge-info">{item.maintenance_type}</span></td>
                    <td>{item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString() : '-'}</td>
                    <td><span className={`status-dot status-${item.priority || 'low'}`}>{item.priority || '-'}</span></td>
                    <td><span className={`status-dot status-${item.status || 'scheduled'}`}>{item.status || 'scheduled'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Maintenance Schedule Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Maintenance Schedule" />}
    </div>
  );
}

export default MaintenanceSchedulesPage;
