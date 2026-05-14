import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiActivity } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AIResultDisplay from '../components/AIResultDisplay';

function EquipmentHealthForecastPage() {
  const [equipmentId, setEquipmentId] = useState('');
  const [days, setDays] = useState(30);
  const [includePM, setIncludePM] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/yield-predictions/equipment-health-forecast', {
        equipment_id: equipmentId,
        days: Number(days),
        include_pm_schedule: includePM,
      });
      setAiResult(res.data.data || res.data);
      toast.success('Forecast complete');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Forecast failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1><FiActivity /> Equipment Health Forecast</h1>
          <p>N-day equipment health forecast plus PM schedule and parts to stage.</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Equipment ID</label>
                <input className="form-control" value={equipmentId} onChange={e => setEquipmentId(e.target.value)} placeholder="e.g. EQ-CMP-3 or numeric ID" />
              </div>
              <div className="form-group">
                <label>Forecast horizon (days)</label>
                <input type="number" min="1" max="180" className="form-control" value={days} onChange={e => setDays(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Include PM schedule?</label>
                <select className="form-control" value={String(includePM)} onChange={e => setIncludePM(e.target.value === 'true')}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={aiLoading}>
              {aiLoading ? 'Forecasting...' : 'Run Health Forecast'}
            </button>
          </form>
        </div>

        {(aiLoading || aiResult) && (
          <div style={{ marginTop: 16 }}>
            <AIResultDisplay data={aiResult} loading={aiLoading} />
          </div>
        )}
      </div>
    </div>
  );
}

export default EquipmentHealthForecastPage;
