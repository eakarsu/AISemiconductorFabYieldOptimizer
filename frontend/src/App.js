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
import WarRoomPage from './pages/WarRoomPage';
import FacilitiesPage from './pages/FacilitiesPage';
import ProcessOptimizationPage from './pages/ProcessOptimizationPage';
import DefectPredictionPage from './pages/DefectPredictionPage';
import EquipmentHealthForecastPage from './pages/EquipmentHealthForecastPage';
import MultiObjectiveOptimizePage from './pages/MultiObjectiveOptimizePage';
import ShiftLogDigestPage from './pages/ShiftLogDigestPage';
import CustomViewsPage from './pages/CustomViewsPage';
import ReticlePodQueuePage from './pages/ReticlePodQueuePage';

// === Batch 07 Gaps & Frontend Mounts ===
import CfYieldPredictionByProcessParameters from './pages/CfYieldPredictionByProcessParameters';
import CfRootCauseAnalysisAutomation from './pages/CfRootCauseAnalysisAutomation';
import CfProcessRecipeOptimization from './pages/CfProcessRecipeOptimization';
import CfEquipmentPredictiveMaintenance from './pages/CfEquipmentPredictiveMaintenance';
import CfDefectPatternRecognition from './pages/CfDefectPatternRecognition';
import CfMultiobjectiveOptimization from './pages/CfMultiobjectiveOptimization';
import GapNoYieldpredictionModeldriven from './pages/GapNoYieldpredictionModeldriven';
import GapNoRootcauseanalysisAiOnlyManualRecords from './pages/GapNoRootcauseanalysisAiOnlyManualRecords';
import GapNoProcessoptimizationParameterRecs from './pages/GapNoProcessoptimizationParameterRecs';
import GapNoDefectpredictionRatetypeMl from './pages/GapNoDefectpredictionRatetypeMl';
import GapNoEquipmenthealthforecast from './pages/GapNoEquipmenthealthforecast';
import GapNoReciperecommendationAi from './pages/GapNoReciperecommendationAi';
import GapNoRealtimeSpcChartingRecordsOnly from './pages/GapNoRealtimeSpcChartingRecordsOnly';
import GapNoIntegrationWithFabEquipmentSecsgem from './pages/GapNoIntegrationWithFabEquipmentSecsgem';
import GapNoEquipmentCalibrationTracking from './pages/GapNoEquipmentCalibrationTracking';
import GapNoMeserpIntegration from './pages/GapNoMeserpIntegration';
import GapNoAlertingnotificationsSystem from './pages/GapNoAlertingnotificationsSystem';
import GapLimitedAuditrbacForSensitiveRecipeData from './pages/GapLimitedAuditrbacForSensitiveRecipeData';
import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

// === End Batch 07 ===


function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

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
        <Route path="/war-room" element={<PrivateRoute><WarRoomPage /></PrivateRoute>} />
        <Route path="/facilities" element={<PrivateRoute><FacilitiesPage /></PrivateRoute>} />
        <Route path="/process-optimization" element={<PrivateRoute><ProcessOptimizationPage /></PrivateRoute>} />
        <Route path="/defect-prediction" element={<PrivateRoute><DefectPredictionPage /></PrivateRoute>} />
        <Route path="/equipment-health-forecast" element={<PrivateRoute><EquipmentHealthForecastPage /></PrivateRoute>} />
        <Route path="/multi-objective-optimize" element={<PrivateRoute><MultiObjectiveOptimizePage /></PrivateRoute>} />
        <Route path="/shift-log-digest" element={<PrivateRoute><ShiftLogDigestPage /></PrivateRoute>} />
        <Route path="/custom-views" element={<PrivateRoute><CustomViewsPage /></PrivateRoute>} />
        <Route path="/reticle-pod-queue" element={<PrivateRoute><ReticlePodQueuePage /></PrivateRoute>} />
          // === Batch 07 Gaps & Frontend Mounts ===
          <Route path='/cf-yield-prediction-by-process-parameters' element={<CfYieldPredictionByProcessParameters />} />
          <Route path='/cf-root-cause-analysis-automation' element={<CfRootCauseAnalysisAutomation />} />
          <Route path='/cf-process-recipe-optimization' element={<CfProcessRecipeOptimization />} />
          <Route path='/cf-equipment-predictive-maintenance' element={<CfEquipmentPredictiveMaintenance />} />
          <Route path='/cf-defect-pattern-recognition' element={<CfDefectPatternRecognition />} />
          <Route path='/cf-multiobjective-optimization' element={<CfMultiobjectiveOptimization />} />
          <Route path='/gap-no-yieldprediction-modeldriven' element={<GapNoYieldpredictionModeldriven />} />
          <Route path='/gap-no-rootcauseanalysis-ai-only-manual-records' element={<GapNoRootcauseanalysisAiOnlyManualRecords />} />
          <Route path='/gap-no-processoptimization-parameter-recs' element={<GapNoProcessoptimizationParameterRecs />} />
          <Route path='/gap-no-defectprediction-ratetype-ml' element={<GapNoDefectpredictionRatetypeMl />} />
          <Route path='/gap-no-equipmenthealthforecast' element={<GapNoEquipmenthealthforecast />} />
          <Route path='/gap-no-reciperecommendation-ai' element={<GapNoReciperecommendationAi />} />
          <Route path='/gap-no-realtime-spc-charting-records-only' element={<GapNoRealtimeSpcChartingRecordsOnly />} />
          <Route path='/gap-no-integration-with-fab-equipment-secsgem' element={<GapNoIntegrationWithFabEquipmentSecsgem />} />
          <Route path='/gap-no-equipment-calibration-tracking' element={<GapNoEquipmentCalibrationTracking />} />
          <Route path='/gap-no-meserp-integration' element={<GapNoMeserpIntegration />} />
          <Route path='/gap-no-alertingnotifications-system' element={<GapNoAlertingnotificationsSystem />} />
          <Route path='/gap-limited-auditrbac-for-sensitive-recipe-data' element={<GapLimitedAuditrbacForSensitiveRecipeData />} />
          // === End Batch 07 ===
      </Routes>
    </div>
  );
}

export default App;
