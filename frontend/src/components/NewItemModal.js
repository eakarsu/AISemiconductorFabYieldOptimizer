import React, { useState } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';

function NewItemModal({ fields, onClose, onSubmit, title }) {
  const initial = {};
  fields.forEach((f) => {
    initial[f.key] = f.default || '';
  });
  const [formData, setFormData] = useState(initial);
  const [saving, setSaving] = useState(false);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title || 'New Item'}</h3>
          <button className="btn btn-ghost" onClick={onClose}><FiX size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {fields.map((f) => (
              <div className="form-group" key={f.key}>
                <label>{f.label}{f.required && ' *'}</label>
                {f.type === 'select' ? (
                  <select
                    value={formData[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    required={f.required}
                  >
                    <option value="">Select...</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    value={formData[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    rows={3}
                    required={f.required}
                    placeholder={f.placeholder || ''}
                  />
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={formData[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    required={f.required}
                    placeholder={f.placeholder || ''}
                    step={f.type === 'number' ? 'any' : undefined}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <FiPlus size={14} /> {saving ? 'Creating...' : 'Create'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewItemModal;
