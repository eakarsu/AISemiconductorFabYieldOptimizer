import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiCpu, FiSliders, FiTrendingUp, FiSearch, FiLink, FiGrid,
  FiBox, FiServer, FiFileText, FiBarChart2, FiTool, FiAlertTriangle,
  FiLogOut, FiZap, FiGlobe
} from 'react-icons/fi';

const features = [
  { title: 'Wafer Defect Classification', desc: 'AI-powered defect detection and classification. Includes SEM image vision analysis.', icon: FiCpu, path: '/wafer-defects', ai: true },
  { title: 'Process Parameter Optimization', desc: 'Optimize fab process parameters for maximum yield using AI', icon: FiSliders, path: '/process-parameters', ai: true },
  { title: 'Yield Prediction', desc: 'Predict wafer yield with ML models trained on historical data', icon: FiTrendingUp, path: '/yield-predictions', ai: true },
  { title: 'Root Cause Analysis', desc: 'AI-driven root cause analysis for yield excursions', icon: FiSearch, path: '/root-cause-analysis', ai: true },
  { title: 'Excursion War Room', desc: 'AI-powered real-time war room for active yield excursions with cause chain', icon: FiZap, path: '/war-room', ai: true },
  { title: 'Equipment Matching', desc: 'Match equipment configurations for optimal performance', icon: FiLink, path: '/equipment-matching', ai: true },
  { title: 'Defect Pattern Recognition', desc: 'Recognize spatial defect patterns on wafer maps', icon: FiGrid, path: '/defect-patterns', ai: true },
  { title: 'Wafer Lot Management', desc: 'Track and manage wafer lots through the fab process', icon: FiBox, path: '/wafer-lots', ai: false },
  { title: 'Equipment Inventory', desc: 'Manage fab equipment inventory and status tracking', icon: FiServer, path: '/equipment-inventory', ai: false },
  { title: 'Process Recipes', desc: 'Create and manage process recipes. AI optimizer suggests yield improvements.', icon: FiFileText, path: '/process-recipes', ai: true },
  { title: 'Quality Metrics', desc: 'Monitor and track quality metrics across the fab', icon: FiBarChart2, path: '/quality-metrics', ai: false },
  { title: 'Maintenance Scheduling', desc: 'Schedule and track equipment maintenance activities', icon: FiTool, path: '/maintenance-schedules', ai: false },
  { title: 'SPC Alerts', desc: 'SPC alerts with Western Electric Rules auto-evaluation engine', icon: FiAlertTriangle, path: '/spc-alerts', ai: true },
  { title: 'Facilities', desc: 'Multi-tenant fab facility management', icon: FiGlobe, path: '/facilities', ai: false },
  { title: 'Fab Views', desc: 'Custom yield trend, defect heatmap, spec sheet PDF, and yield rule editor', icon: FiGrid, path: '/custom-views', ai: false },
  { title: 'Reticle Pod Queue', desc: 'Reticle pod readiness, scanner assignment, and hot-lot delay tracking', icon: FiBox, path: '/reticle-pod-queue', ai: false },
];

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.info('Logged out');
    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <FiCpu size={28} className="header-logo-icon" />
          <div>
            <h1>AI Semiconductor Fab Yield Optimizer</h1>
            <p className="header-subtitle">Intelligent Manufacturing Analytics Platform</p>
          </div>
        </div>
        <div className="dashboard-header-right">
          <span className="user-badge">{user.username || user.email || 'User'}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            <FiLogOut size={14} /> Logout
          </button>
        </div>
      </header>
      <main className="dashboard-grid">
        {features.map((f, i) => (
          <div
            key={i}
            className={`feature-card ${f.ai ? 'ai-card' : 'mgmt-card'}`}
            onClick={() => navigate(f.path)}
          >
            <div className="feature-card-header">
              <div className={`feature-icon ${f.ai ? 'ai-icon' : 'mgmt-icon'}`}>
                <f.icon size={24} />
              </div>
              <span className={`badge ${f.ai ? 'badge-ai' : 'badge-mgmt'}`}>
                {f.ai ? 'AI Powered' : 'Management'}
              </span>
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </main>
    </div>
  );
}

export default Dashboard;
