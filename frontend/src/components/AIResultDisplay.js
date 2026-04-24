import React from 'react';
import { FiCpu, FiClock, FiCheckCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';

function AIResultDisplay({ result, loading, title }) {
  if (loading) {
    return (
      <div className="ai-result-container ai-loading">
        <div className="ai-thinking">
          <div className="ai-thinking-dots">
            <span /><span /><span />
          </div>
          <p>AI is analyzing...</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const getSeverityClass = (val) => {
    if (!val) return '';
    const v = String(val).toLowerCase();
    if (['critical', 'high', 'fail', 'red', 'severe'].some((s) => v.includes(s))) return 'severity-critical';
    if (['warning', 'medium', 'amber', 'moderate'].some((s) => v.includes(s))) return 'severity-warning';
    if (['low', 'good', 'pass', 'green', 'normal'].some((s) => v.includes(s))) return 'severity-good';
    return 'severity-info';
  };

  const renderValue = (key, val) => {
    if (val === null || val === undefined) return <span className="ai-val">-</span>;
    if (typeof val === 'boolean') return <span className={`ai-badge ${val ? 'severity-good' : 'severity-critical'}`}>{val ? 'Yes' : 'No'}</span>;
    if (typeof val === 'number') {
      if (key.toLowerCase().includes('confidence') || key.toLowerCase().includes('score') || key.toLowerCase().includes('probability')) {
        const pct = val > 1 ? val : val * 100;
        return (
          <div className="ai-confidence">
            <div className="ai-confidence-bar">
              <div className="ai-confidence-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span>{pct.toFixed(1)}%</span>
          </div>
        );
      }
      return <span className="ai-val ai-num">{val}</span>;
    }
    if (Array.isArray(val)) {
      return (
        <ul className="ai-list">
          {val.map((item, i) => (
            <li key={i}>
              {typeof item === 'object' ? (
                <div className="ai-nested">
                  {Object.entries(item).map(([k, v]) => (
                    <div key={k} className="ai-nested-item">
                      <span className="ai-nested-key">{formatKey(k)}:</span> {renderValue(k, v)}
                    </div>
                  ))}
                </div>
              ) : (
                <span className={getSeverityClass(item)}>{String(item)}</span>
              )}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof val === 'object') {
      return (
        <div className="ai-nested-section">
          {Object.entries(val).map(([k, v]) => (
            <div key={k} className="ai-result-row">
              <span className="ai-result-label">{formatKey(k)}</span>
              {renderValue(k, v)}
            </div>
          ))}
        </div>
      );
    }
    return <span className={`ai-val ${getSeverityClass(val)}`}>{String(val)}</span>;
  };

  const formatKey = (key) => {
    return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
  };

  const topLevelEntries = Object.entries(result).filter(([k]) => !['__v', '_id', 'id'].includes(k));

  return (
    <div className="ai-result-container ai-result-animate">
      <div className="ai-result-header">
        <div className="ai-result-title">
          <FiCpu size={20} />
          <h4>{title || 'AI Analysis Result'}</h4>
        </div>
        <div className="ai-result-meta">
          <span><FiClock size={12} /> {new Date().toLocaleString()}</span>
          <span><FiCheckCircle size={12} /> Analysis Complete</span>
        </div>
      </div>
      <div className="ai-result-body">
        {topLevelEntries.map(([key, val]) => (
          <div key={key} className="ai-result-section">
            <div className="ai-result-row">
              <span className="ai-result-label">
                {key.toLowerCase().includes('warning') || key.toLowerCase().includes('alert') ? <FiAlertTriangle size={14} /> : <FiInfo size={14} />}
                {formatKey(key)}
              </span>
              <div className="ai-result-value">{renderValue(key, val)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AIResultDisplay;
