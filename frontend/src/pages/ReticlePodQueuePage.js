import React, { useEffect, useState } from 'react';
import api from '../services/api';

const emptyForm = { reticle: '', lot: '', tool: '', podState: '', priority: 'normal', etaMinutes: 30, risk: '' };

export default function ReticlePodQueuePage() {
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState({ total: 0, hot: 0, delayed: 0 });
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const res = await api.get('/reticle-pod-queue');
    setQueue(res.data.queue || []);
    setSummary(res.data.summary || { total: 0, hot: 0, delayed: 0 });
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    await api.post('/reticle-pod-queue', form);
    setForm(emptyForm);
    load();
  };

  return (
    <div className="page-container">
      <h1>Reticle Pod Queue</h1>
      <p>Coordinate reticle pod readiness, scanner assignment, and hot-lot delays.</p>
      <div className="dashboard-grid" style={{ margin: '20px 0' }}>
        {['total', 'hot', 'delayed'].map(key => <div className="feature-card" key={key}><h3>{key}</h3><p style={{ fontSize: 28 }}>{summary[key]}</p></div>)}
      </div>
      <form className="feature-card" onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {['reticle', 'lot', 'tool', 'podState', 'risk'].map(field => <input key={field} placeholder={field} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} />)}
        <input type="number" value={form.etaMinutes} onChange={e => setForm({ ...form, etaMinutes: e.target.value })} />
        <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option>normal</option><option>hot lot</option><option>expedite</option></select>
        <button className="btn btn-primary" type="submit">Add Pod</button>
      </form>
      <table className="data-table" style={{ marginTop: 20 }}>
        <thead><tr>{['Reticle', 'Lot', 'Tool', 'Pod State', 'Priority', 'ETA', 'Risk'].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{queue.map(row => <tr key={row.id}><td>{row.reticle}</td><td>{row.lot}</td><td>{row.tool}</td><td>{row.podState}</td><td>{row.priority}</td><td>{row.etaMinutes}m</td><td>{row.risk}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
