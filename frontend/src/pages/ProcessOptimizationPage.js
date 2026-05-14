import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiCpu } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AIResultDisplay from '../components/AIResultDisplay';

function ProcessOptimizationPage() {
  const [waferLotId, setWaferLotId] = useState('');
  const [targetYield, setTargetYield] = useState(95);
  const [constraints, setConstraints] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/yield-predictions/process-optimization', {
        wafer_lot_id: waferLotId,
        target_yield: Number(targetYield),
        constraints,
      });
      setAiResult(res.data.data || res.data);
      toast.success('Optimization complete');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Optimization failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1><FiCpu /> Process Optimization</h1>
          <p>Pareto-optimal parameter adjustments to hit a target yield.</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Wafer Lot ID</label>
                <input className="form-control" value={waferLotId} onChange={e => setWaferLotId(e.target.value)} placeholder="e.g. LOT-2024-0317" />
              </div>
              <div className="form-group">
                <label>Target yield (%)</label>
                <input type="number" min="0" max="100" step="0.1" className="form-control" value={targetYield} onChange={e => setTargetYield(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Constraints (optional)</label>
              <textarea className="form-control" rows={3} value={constraints} onChange={e => setConstraints(e.target.value)} placeholder="e.g. lithography exposure must stay within ±5% of recipe X" />
            </div>

            <button type="submit" className="btn btn-primary" disabled={aiLoading}>
              {aiLoading ? 'Optimizing...' : 'Run Process Optimization'}
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

export default ProcessOptimizationPage;
