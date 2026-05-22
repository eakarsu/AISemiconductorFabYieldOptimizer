import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

function WaferYieldTrendChart() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/custom-views/yield-trend');
        if (!alive) return;
        setData(res.data.data || []);
        setSummary(res.data.summary || null);
      } catch (e) {
        if (alive) setError(e?.response?.data?.error || e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>Wafer Yield Trend</h3>
          <p style={subStyle}>Predicted vs actual yield across recent wafer lots</p>
        </div>
        {summary && (
          <div style={{ display: 'flex', gap: 16 }}>
            <Stat label="Avg Predicted" value={`${summary.avg_predicted_yield}%`} color="#60a5fa" />
            <Stat label="Avg Actual"    value={`${summary.avg_actual_yield}%`}    color="#34d399" />
            <Stat label="Delta"         value={`${summary.delta > 0 ? '+' : ''}${summary.delta}%`} color={summary.delta >= 0 ? '#34d399' : '#f87171'} />
          </div>
        )}
      </div>

      {loading && <p style={{ color: '#9ca3af' }}>Loading trend...</p>}
      {error && <p style={{ color: '#f87171' }}>Error: {error}</p>}
      {!loading && !error && (
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="lot" stroke="#9ca3af" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(data.length / 10))} />
              <YAxis stroke="#9ca3af" domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb' }} />
              <Legend wrapperStyle={{ color: '#e5e7eb' }} />
              <Line type="monotone" dataKey="predicted" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} name="Predicted Yield %" />
              <Line type="monotone" dataKey="actual"    stroke="#34d399" strokeWidth={2} dot={{ r: 2 }} name="Actual Yield %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const cardStyle = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
};
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12, flexWrap: 'wrap' };
const titleStyle = { color: '#f3f4f6', margin: 0, fontSize: 18 };
const subStyle = { color: '#9ca3af', margin: '4px 0 0 0', fontSize: 12 };

export default WaferYieldTrendChart;
