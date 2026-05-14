import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiAlertTriangle } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AIResultDisplay from '../components/AIResultDisplay';

function DefectPredictionPage() {
  const [waferLotId, setWaferLotId] = useState('');
  const [recentTrendsContext, setRecentTrendsContext] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/yield-predictions/defect-prediction', {
        wafer_lot_id: waferLotId,
        context: recentTrendsContext,
      });
      setAiResult(res.data.data || res.data);
      toast.success('Defect prediction complete');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Prediction failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1><FiAlertTriangle /> Defect Prediction</h1>
          <p>Predicted defect class rates with mitigation per class.</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Wafer Lot ID</label>
              <input className="form-control" value={waferLotId} onChange={e => setWaferLotId(e.target.value)} placeholder="e.g. LOT-2024-0317" />
            </div>
            <div className="form-group">
              <label>Recent context (optional)</label>
              <textarea className="form-control" rows={4} value={recentTrendsContext} onChange={e => setRecentTrendsContext(e.target.value)} placeholder="e.g. tool drift on CMP-3 last week, recent recipe change in implant step" />
            </div>

            <button type="submit" className="btn btn-primary" disabled={aiLoading}>
              {aiLoading ? 'Predicting...' : 'Run Defect Prediction'}
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

export default DefectPredictionPage;
