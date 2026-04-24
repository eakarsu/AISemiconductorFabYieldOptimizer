import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
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
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/process-recipes');
      setItems(res.data.data || res.data || []);
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

  return (
    <div className="page">
      <Navbar title="Process Recipes" />
      <div className="page-content">
        <div className="page-toolbar">
          <h2>Process Recipes</h2>
          <div className="toolbar-actions">
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <FiPlus size={14} /> New Recipe
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
                  <th>Recipe Name</th>
                  <th>Process Type</th>
                  <th>Technology Node</th>
                  <th>Version</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="empty-row">No recipes found</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item._id || i} onClick={() => setSelected(item)} className="clickable-row">
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
        )}
      </div>

      {selected && <DetailModal item={selected} fields={fields} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} title="Process Recipe Details" />}
      {showNew && <NewItemModal fields={fields} onClose={() => setShowNew(false)} onSubmit={handleCreate} title="New Process Recipe" />}
    </div>
  );
}

export default ProcessRecipesPage;
