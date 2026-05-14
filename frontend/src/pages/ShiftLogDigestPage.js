import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiClipboard } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AIResultDisplay from '../components/AIResultDisplay';

function ShiftLogDigestPage() {
  const [shiftLabel, setShiftLabel] = useState('');
  const [rawLog, setRawLog] = useState('');
  const [context, setContext] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rawLog.trim()) {
      toast.error('raw_log_entries is required');
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/shift-logs/digest', {
        shift_label: shiftLabel || undefined,
        raw_log_entries: rawLog,
        context: context || undefined,
      });
      setAiResult(res.data.digest || res.data);
      toast.success('Shift digest generated');
    } catch (err) {
      if (err.response?.status === 503) {
        toast.error('AI service unavailable: OpenRouter API key not configured (503).');
      } else {
        toast.error(err.response?.data?.error || 'Shift digest failed');
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1><FiClipboard /> Shift Log Digest</h1>
          <p>Summarize raw shift entries into a structured handoff: events, anomalies, follow-ups, KPIs.</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Shift label</label>
                <input className="form-control" value={shiftLabel} onChange={(e) => setShiftLabel(e.target.value)} placeholder="e.g. 2026-05-08 Day Shift A" />
              </div>
              <div className="form-group">
                <label>Context (optional)</label>
                <input className="form-control" value={context} onChange={(e) => setContext(e.target.value)} placeholder="e.g. ramping new node, tool X under PM" />
              </div>
            </div>

            <div className="form-group">
              <label>Raw log entries *</label>
              <textarea className="form-control" rows={12} value={rawLog} onChange={(e) => setRawLog(e.target.value)} placeholder={'Paste raw shift log entries here. One per line works fine.'} />
            </div>

            <button type="submit" className="btn btn-primary" disabled={aiLoading}>
              {aiLoading ? 'Summarizing...' : 'Generate Shift Digest'}
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

export default ShiftLogDigestPage;
