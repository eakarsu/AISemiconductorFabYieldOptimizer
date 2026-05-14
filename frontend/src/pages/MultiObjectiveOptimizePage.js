import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiTarget } from 'react-icons/fi';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AIResultDisplay from '../components/AIResultDisplay';

const DEFAULT_OBJECTIVES = JSON.stringify([
  { name: 'yield', weight: 0.5, direction: 'maximize' },
  { name: 'throughput', weight: 0.3, direction: 'maximize' },
  { name: 'cost', weight: 0.2, direction: 'minimize' },
], null, 2);

function MultiObjectiveOptimizePage() {
  const [currentState, setCurrentState] = useState('{\n  "current_yield_pct": 91.2,\n  "throughput_wph": 120,\n  "unit_cost_usd": 850\n}');
  const [objectivesJson, setObjectivesJson] = useState(DEFAULT_OBJECTIVES);
  const [constraints, setConstraints] = useState('');
  const [candidateLevers, setCandidateLevers] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult(null);
    let parsedState;
    let parsedObjectives;
    try {
      parsedState = JSON.parse(currentState);
    } catch {
      toast.error('current_state must be valid JSON');
      setAiLoading(false);
      return;
    }
    try {
      parsedObjectives = JSON.parse(objectivesJson);
    } catch {
      toast.error('objectives must be valid JSON');
      setAiLoading(false);
      return;
    }
    try {
      const res = await api.post('/yield-predictions/multi-objective-optimize', {
        current_state: parsedState,
        objectives: parsedObjectives,
        constraints: constraints || undefined,
        candidate_levers: candidateLevers
          ? candidateLevers.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      setAiResult(res.data.optimization || res.data);
      toast.success('Multi-objective optimization complete');
    } catch (err) {
      if (err.response?.status === 503) {
        toast.error('AI service unavailable: OpenRouter API key not configured (503).');
      } else {
        toast.error(err.response?.data?.error || 'Multi-objective optimization failed');
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
          <h1><FiTarget /> Multi-Objective Optimization</h1>
          <p>Trade off yield, throughput, cost, and other objectives. Returns a Pareto frontier of options.</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Current state (JSON)</label>
              <textarea className="form-control" rows={5} value={currentState} onChange={(e) => setCurrentState(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Objectives (JSON array of {`{name, weight, direction}`})</label>
              <textarea className="form-control" rows={6} value={objectivesJson} onChange={(e) => setObjectivesJson(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Constraints (optional, free text)</label>
              <textarea className="form-control" rows={3} value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder="e.g. exposure dose must remain within ±5% of recipe target" />
            </div>

            <div className="form-group">
              <label>Candidate levers (comma-separated)</label>
              <input className="form-control" value={candidateLevers} onChange={(e) => setCandidateLevers(e.target.value)} placeholder="exposure_dose, etch_time, post_bake_temp" />
            </div>

            <button type="submit" className="btn btn-primary" disabled={aiLoading}>
              {aiLoading ? 'Optimizing...' : 'Run Multi-Objective Optimization'}
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

export default MultiObjectiveOptimizePage;
