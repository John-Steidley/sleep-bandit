import { useState } from 'react';
import { PosteriorCurve, UncertaintyBar, ProbabilityBar } from '../visualizations';

interface InterventionRowProps {
  name: string;
  disabled: boolean;
  mean: number;
  std: number;
  minStd: number;
  pPositive: number;
  sample: number | null;
  isActive: boolean;
  groupName: string | null;
  onRename: (newName: string) => void;
  onToggleDisabled: () => void;
}

export function InterventionRow({
  name,
  disabled,
  mean,
  std,
  minStd,
  pPositive,
  sample,
  isActive,
  groupName,
  onRename,
  onToggleDisabled
}: InterventionRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);

  const handleStartEdit = () => {
    setEditValue(name);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(name);
      setIsEditing(false);
    }
  };

  return (
    <div className={`intervention-row ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}>
      <div className="intervention-name">
        <button
          className={`toggle-btn ${disabled ? 'off' : 'on'}`}
          onClick={onToggleDisabled}
          title={disabled ? 'Enable intervention' : 'Disable intervention'}
        >
          {disabled ? '\u25cb' : '\u25cf'}
        </button>
        {isEditing ? (
          <input
            className="intervention-name-input"
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <div className="intervention-name-wrapper">
            <span className="intervention-name-text" onClick={handleStartEdit} title="Click to edit">
              {name}
            </span>
            {groupName && <span className="intervention-group-indicator">{groupName}</span>}
            {disabled && <span className="intervention-disabled-indicator">paused</span>}
          </div>
        )}
      </div>
      <div className={`intervention-stats ${sample !== null ? 'with-sample' : ''}`}>
        <div className="stat effect">
          <div className="stat-header">
            <span className="stat-label">Effect estimate</span>
            <span className={`stat-value ${mean > 0 ? 'positive' : mean < 0 ? 'negative' : ''}`}>
              {mean > 0 ? '+' : ''}{mean.toFixed(1)} <span className="stat-unit">+/-{std.toFixed(1)}</span>
            </span>
          </div>
          <div className="effect-viz">
            <PosteriorCurve mean={mean} std={std} minStd={minStd} />
            <UncertaintyBar mean={mean} std={std} />
          </div>
        </div>
        <div className="stat prob">
          <span className="stat-label">P(helpful)</span>
          <ProbabilityBar probability={pPositive} />
        </div>
        {sample !== null && (
          <div className="stat sample">
            <span className="stat-label">Tonight</span>
            <span className={`stat-value ${sample > 0 ? 'positive' : 'negative'}`}>
              {sample > 0 ? '+' : ''}{sample.toFixed(2)}
              {sample > 0 ? ' \u2713' : ' \u2717'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
