import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiTrendingUp, FiGrid, FiFileText, FiAlertTriangle, FiArrowLeft, FiCpu,
} from 'react-icons/fi';
import WaferYieldTrendChart from '../components/WaferYieldTrendChart';
import DefectHeatmap from '../components/DefectHeatmap';
import ProcessSpecSheetPdf from '../components/ProcessSpecSheetPdf';
import YieldRuleEditor from '../components/YieldRuleEditor';

const VIEWS = [
  { id: 'yield-trend',    label: 'Wafer Yield Trend',         icon: FiTrendingUp,    kind: 'VIZ',     desc: 'Predicted vs actual yield over time' },
  { id: 'defect-heatmap', label: 'Defect Type Heatmap',       icon: FiGrid,          kind: 'VIZ',     desc: 'Defect type x process step concentration' },
  { id: 'spec-sheet',     label: 'Process Spec Sheet PDF',    icon: FiFileText,      kind: 'NON-VIZ', desc: 'Generate printable recipe spec sheets' },
  { id: 'yield-rules',    label: 'Yield Rule Editor',         icon: FiAlertTriangle, kind: 'NON-VIZ', desc: 'CRUD critical-defect thresholds' },
];

function CustomViewsPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState('yield-trend');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b0e14' }}>
      {/* Sidebar */}
      <aside data-testid="fab-views-sidebar" style={sidebarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 16px' }}>
          <FiCpu size={22} color="#a78bfa" />
          <div>
            <div style={{ color: '#f3f4f6', fontWeight: 700, fontSize: 15 }}>Fab Views</div>
            <div style={{ color: '#9ca3af', fontSize: 11 }}>Custom analytics</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {VIEWS.map((v) => {
            const isActive = v.id === active;
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setActive(v.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: isActive ? '#1f2937' : 'transparent',
                  border: '1px solid ' + (isActive ? '#374151' : 'transparent'),
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  color: isActive ? '#f3f4f6' : '#cbd5e1',
                  textAlign: 'left',
                }}
              >
                <Icon size={16} color={isActive ? '#a78bfa' : '#9ca3af'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{v.label}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{v.desc}</div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: v.kind === 'VIZ' ? '#60a5fa' : '#fbbf24',
                  border: '1px solid ' + (v.kind === 'VIZ' ? '#1e3a8a' : '#78350f'),
                  padding: '2px 6px', borderRadius: 4,
                }}>{v.kind}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #1f2937' }}>
          <button onClick={() => navigate('/')} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: '1px solid #374151',
            color: '#cbd5e1', padding: '8px 12px', borderRadius: 6,
            cursor: 'pointer', width: '100%', fontSize: 13,
          }}>
            <FiArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        <header style={{ marginBottom: 20 }}>
          <h1 style={{ color: '#f3f4f6', margin: 0, fontSize: 24 }}>Fab Views</h1>
          <p style={{ color: '#9ca3af', margin: '4px 0 0 0', fontSize: 13 }}>
            Custom semiconductor fab yield analytics, spec sheets, and rule management.
          </p>
        </header>

        {active === 'yield-trend'    && <WaferYieldTrendChart />}
        {active === 'defect-heatmap' && <DefectHeatmap />}
        {active === 'spec-sheet'     && <ProcessSpecSheetPdf />}
        {active === 'yield-rules'    && <YieldRuleEditor />}
      </main>
    </div>
  );
}

const sidebarStyle = {
  width: 280,
  background: '#111827',
  borderRight: '1px solid #1f2937',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
};

export default CustomViewsPage;
