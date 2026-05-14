import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';

const fields = [
  { key: 'fab_name', label: 'Fab Name', type: 'text', required: true },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'technology_nodes', label: 'Technology Nodes', type: 'text' },
  { key: 'capacity_wafers_per_month', label: 'Capacity (Wafers/Month)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'maintenance'] },
];

function FacilitiesPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const fetchItems = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/facilities?page=${page}&limit=20`);
      setItems(res.data.data || res.data || []);
      if (res.data.pagination) setPagination(res.data.pagination);
    } catch (err) { toast.error('Failed to fetch facilities'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try { await api.post('/facilities', data); toast.success('Facility created'); fetchItems(); }
    catch (err) { toast.error('Failed to create'); }
  };

  const handleUpdate = async (id, data) => {
    try { await api.put(`/facilities/${id}`, data); toast.success('Updated'); setSelected(null); fetchItems(); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/facilities/${id}`); toast.success('Deleted'); fetchItems(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  return (
    <div className="page">
      <Navbar title="Facilities (Multi-Tenancy)" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Facilities <span style={{ color: '#64748b', fontSize: 14 }}>({pagination.total} total)</span></h2>
          <div className="toolbar-actions">
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><FiPlus size={14} /> New Facility</button>
            <button className="btn btn-ghost" onClick={() => fetchItems(pagination.page)}><FiRefreshCw size={14} /></button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fab Name</th>
                    <th>Location</th>
                    <th>Technology Nodes</th>
                    <th>Capacity (W/mo)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={6} className="empty-row">No facilities found</td></tr>
                  ) : items.map((item, i) => (
                    <tr key={item.id || i} onClick={() => setSelected(item)} className="clickable-row">
                      <td>{item.id}</td>
                      <td style={{ fontWeight: 600 }}>{item.fab_name}</td>
                      <td>{item.location || '-'}</td>
                      <td>{item.technology_nodes || '-'}</td>
                      <td>{item.capacity_wafers_per_month ? item.capacity_wafers_per_month.toLocaleString() : '-'}</td>
                      <td><span style={{ color: item.status === 'active' ? '#22c55e' : '#94a3b8' }}>{item.status}</span></td>
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

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Facility Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Facility" />}
    </div>
  );
}

export default FacilitiesPage;
