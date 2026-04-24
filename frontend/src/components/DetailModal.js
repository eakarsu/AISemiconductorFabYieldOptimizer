import React, { useState } from 'react';
import { FiX, FiEdit2, FiTrash2, FiSave, FiXCircle } from 'react-icons/fi';

function DetailModal({ item, fields, onClose, onUpdate, onDelete, title }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...item });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(item._id || item.id, formData);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(item._id || item.id);
    onClose();
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object' && val instanceof Date) return new Date(val).toLocaleString();
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title || 'Details'}</h3>
          <button className="btn btn-ghost" onClick={onClose}><FiX size={20} /></button>
        </div>
        <div className="modal-body">
          {confirmDelete ? (
            <div className="delete-confirm">
              <p>Are you sure you want to delete this item? This action cannot be undone.</p>
              <div className="delete-confirm-actions">
                <button className="btn btn-danger" onClick={handleDelete}>Yes, Delete</button>
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            </div>
          ) : editing ? (
            <div className="detail-form">
              {fields.map((f) => (
                <div className="form-group" key={f.key}>
                  <label>{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={formData[f.key] || ''} onChange={(e) => handleChange(f.key, e.target.value)}>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      value={formData[f.key] || ''}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <input
                      type={f.type || 'text'}
                      value={formData[f.key] || ''}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="detail-grid">
              {fields.map((f) => (
                <div className="detail-item" key={f.key}>
                  <span className="detail-label">{f.label}</span>
                  <span className="detail-value">{formatValue(item[f.key])}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {!confirmDelete && (
            <>
              {editing ? (
                <>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    <FiSave size={14} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setEditing(false); setFormData({ ...item }); }}>
                    <FiXCircle size={14} /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={() => setEditing(true)}>
                    <FiEdit2 size={14} /> Edit
                  </button>
                  <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
                    <FiTrash2 size={14} /> Delete
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailModal;
