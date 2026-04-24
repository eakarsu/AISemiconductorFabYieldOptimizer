import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import WaferDefectsPage from './pages/WaferDefectsPage';
import ProcessParametersPage from './pages/ProcessParametersPage';
import YieldPredictionsPage from './pages/YieldPredictionsPage';
import RootCauseAnalysisPage from './pages/RootCauseAnalysisPage';
import EquipmentMatchingPage from './pages/EquipmentMatchingPage';
import DefectPatternsPage from './pages/DefectPatternsPage';
import WaferLotsPage from './pages/WaferLotsPage';
import EquipmentInventoryPage from './pages/EquipmentInventoryPage';
import ProcessRecipesPage from './pages/ProcessRecipesPage';
import QualityMetricsPage from './pages/QualityMetricsPage';
import MaintenanceSchedulesPage from './pages/MaintenanceSchedulesPage';
import SpcAlertsPage from './pages/SpcAlertsPage';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/wafer-defects" element={<PrivateRoute><WaferDefectsPage /></PrivateRoute>} />
        <Route path="/process-parameters" element={<PrivateRoute><ProcessParametersPage /></PrivateRoute>} />
        <Route path="/yield-predictions" element={<PrivateRoute><YieldPredictionsPage /></PrivateRoute>} />
        <Route path="/root-cause-analysis" element={<PrivateRoute><RootCauseAnalysisPage /></PrivateRoute>} />
        <Route path="/equipment-matching" element={<PrivateRoute><EquipmentMatchingPage /></PrivateRoute>} />
        <Route path="/defect-patterns" element={<PrivateRoute><DefectPatternsPage /></PrivateRoute>} />
        <Route path="/wafer-lots" element={<PrivateRoute><WaferLotsPage /></PrivateRoute>} />
        <Route path="/equipment-inventory" element={<PrivateRoute><EquipmentInventoryPage /></PrivateRoute>} />
        <Route path="/process-recipes" element={<PrivateRoute><ProcessRecipesPage /></PrivateRoute>} />
        <Route path="/quality-metrics" element={<PrivateRoute><QualityMetricsPage /></PrivateRoute>} />
        <Route path="/maintenance-schedules" element={<PrivateRoute><MaintenanceSchedulesPage /></PrivateRoute>} />
        <Route path="/spc-alerts" element={<PrivateRoute><SpcAlertsPage /></PrivateRoute>} />
      </Routes>
    </div>
  );
}

export default App;
