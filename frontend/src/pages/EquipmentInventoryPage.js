import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DetailModal from '../components/DetailModal';
import NewItemModal from '../components/NewItemModal';

const fields = [
  { key: 'equipment_name', label: 'Equipment Name', type: 'text', required: true },
  { key: 'equipment_type', label: 'Equipment Type', type: 'select', options: ['PVD', 'CVD', 'Etch', 'Lithography', 'Track', 'Inspection', 'Metrology', 'Implant', 'CMP', 'Wet_Clean', 'Furnace'], required: true },
  { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
  { key: 'model_number', label: 'Model Number', type: 'text' },
  { key: 'serial_number', label: 'Serial Number', type: 'text', required: true },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'bay', label: 'Bay', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['operational', 'maintenance', 'offline', 'idle'] },
  { key: 'installation_date', label: 'Installation Date', type: 'date' },
  { key: 'last_pm_date', label: 'Last PM Date', type: 'date' },
  { key: 'next_pm_date', label: 'Next PM Date', type: 'date' },
  { key: 'specifications', label: 'Specifications', type: 'textarea' },
];

function EquipmentInventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/equipment-inventory');
      setItems(res.data.data || res.data || []);
    } catch (err) { toast.error('Failed to fetch equipment'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    try { await api.post('/equipment-inventory', data); toast.success('Equipment created'); fetchItems(); }
    catch (err) { toast.error('Failed to create'); }
  };

  const handleUpdate = async (id, data) => {
    try { await api.put(`/equipment-inventory/${id}`, data); toast.success('Updated'); setSelected(null); fetchItems(); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/equipment-inventory/${id}`); toast.success('Deleted'); fetchItems(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  return (
    <div className="page">
      <Navbar title="Equipment Inventory" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Equipment Inventory</h2>
          <div className="toolbar-actions">
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Equipment
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
                  <th>Equipment Name</th>
                  <th>Equipment Type</th>
                  <th>Serial Number</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="empty-row">No equipment found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
                    <td>{item.equipment_name}</td>
                    <td><span className="badge badge-info">{item.equipment_type}</span></td>
                    <td className="mono">{item.serial_number}</td>
                    <td>{item.location || '-'}</td>
                    <td><span className={`status-dot status-${item.status || 'operational'}`}>{item.status || 'operational'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Equipment Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Equipment" />}
    </div>
  );
}

export default EquipmentInventoryPage;
