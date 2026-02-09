import { useState, useMemo } from 'react';
import { PendingNight as PendingNightType, Notes } from '../../types';
import { BASELINE } from '../../lib/bayesian';

interface PendingNightProps {
  pending: PendingNightType;
  interventions: string[];
  posteriorMean: number[];
  onRecordScore: (score: number, notes: Notes) => void;
  onPreview: (score: number) => void;
  onCancel: () => void;
  onSleep: () => void;
}

export function PendingNight({
  pending,
  interventions,
  posteriorMean,
  onRecordScore,
  onPreview,
  onCancel,
  onSleep
}: PendingNightProps) {
  const [score, setScore] = useState('');
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState<Notes>({
    wokeUpLong: false,
    nightmares: false,
    nightSweats: false,
    text: ''
  });

  const isAsleep = pending.asleep;

  // Compute predicted score using posterior mean (average estimate)
  const predictedScoreAvg = useMemo(() => {
    let expected = BASELINE;
    for (let i = 0; i < interventions.length; i++) {
      if (isAsleep) {
        // Morning mode: assume all rolled interventions were completed
        if (pending.interventions[i]) {
          expected += posteriorMean[i] || 0;
        }
      } else {
        // Night mode: based on checked interventions
        if (completed[i]) {
          expected += posteriorMean[i] || 0;
        }
      }
    }
    return expected;
  }, [completed, posteriorMean, interventions.length, isAsleep, pending.interventions]);

  // Compute predicted score using Thompson samples (sampled estimate)
  const predictedScoreSampled = useMemo(() => {
    let expected = BASELINE;
    const samples = pending.samples || [];
    for (let i = 0; i < interventions.length; i++) {
      if (isAsleep) {
        // Morning mode: assume all rolled interventions were completed
        if (pending.interventions[i]) {
          expected += samples[i] || 0;
        }
      } else {
        // Night mode: based on checked interventions
        if (completed[i]) {
          expected += samples[i] || 0;
        }
      }
    }
    return expected;
  }, [completed, pending.samples, interventions.length, isAsleep, pending.interventions]);

  const activeInterventions = interventions
    .map((name, i) => ({ name, index: i }))
    .filter(({ index }) => pending.interventions[index]);

  const numScore = parseInt(score, 10);
  const isValidScore = !isNaN(numScore) && numScore >= 0 && numScore <= 100;

  const handleRecord = () => {
    if (isValidScore) {
      onRecordScore(numScore, notes);
      setScore('');
      setCompleted({});
      setNotes({ wokeUpLong: false, nightmares: false, nightSweats: false, text: '' });
    }
  };

  const handlePreview = () => {
    if (isValidScore) {
      onPreview(numScore);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRecord();
    }
  };

  const toggleCompleted = (index: number) => {
    setCompleted(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleNote = (key: keyof Omit<Notes, 'text'>) => {
    setNotes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="pending-night">
      <div className="pending-header">
        <h3>{isAsleep ? "\u2600\ufe0f Last Night's Roll" : "\ud83c\udf19 Tonight's Roll"}</h3>
        <span className="pending-date">{new Date(pending.date).toLocaleDateString()}</span>
      </div>
      <div className="pending-interventions">
        {activeInterventions.length === 0 ? (
          <p className="no-interventions">No interventions (baseline night)</p>
        ) : (
          <div className={`intervention-checklist ${isAsleep ? 'read-only' : ''}`}>
            {activeInterventions.map(({ name, index }) => (
              isAsleep ? (
                // Morning mode: read-only with green checkmarks
                <div
                  key={index}
                  className="intervention-checklist-item morning-complete"
                >
                  <span className="check-icon">{'\u2713'}</span>
                  <label>{name}</label>
                </div>
              ) : (
                // Night mode: interactive checkboxes
                <div
                  key={index}
                  className={`intervention-checklist-item ${completed[index] ? 'completed' : ''}`}
                >
                  <input
                    type="checkbox"
                    id={`intervention-${index}`}
                    checked={completed[index] || false}
                    onChange={() => toggleCompleted(index)}
                  />
                  <label htmlFor={`intervention-${index}`}>
                    {name}
                  </label>
                </div>
              )
            ))}
          </div>
        )}
        <div className="predicted-scores">
          <div className="predicted-score">
            <span className="predicted-label">Predicted (avg)</span>
            <span className="predicted-value">{predictedScoreAvg.toFixed(1)}</span>
          </div>
          <div className="predicted-score sampled">
            <span className="predicted-label">Predicted (sampled)</span>
            <span className="predicted-value">{predictedScoreSampled.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Night mode: preview score and actions */}
      {!isAsleep && (
        <>
          <div className="score-form">
            <label>
              Preview with score:
              <input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="0-100"
              />
            </label>
          </div>
          <div className="night-actions">
            <button className="sleep-btn" onClick={onSleep}>{'\ud83d\ude34'} Sleep</button>
            <button className="preview-btn" onClick={handlePreview} disabled={!isValidScore}>Preview Update</button>
            <button className="secondary" onClick={onCancel}>Cancel Roll</button>
          </div>
        </>
      )}

      {/* Morning mode content */}
      {isAsleep && (
        <>
          <div className="notes-section">
            <h4>Morning Notes</h4>
            <div className="notes-checkboxes">
              <div className={`note-checkbox ${notes.wokeUpLong ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  id="note-woke-up"
                  checked={notes.wokeUpLong}
                  onChange={() => toggleNote('wokeUpLong')}
                />
                <label htmlFor="note-woke-up">Woke up in middle of night (1+ hours)</label>
              </div>
              <div className={`note-checkbox ${notes.nightmares ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  id="note-nightmares"
                  checked={notes.nightmares}
                  onChange={() => toggleNote('nightmares')}
                />
                <label htmlFor="note-nightmares">Had nightmares</label>
              </div>
              <div className={`note-checkbox ${notes.nightSweats ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  id="note-night-sweats"
                  checked={notes.nightSweats}
                  onChange={() => toggleNote('nightSweats')}
                />
                <label htmlFor="note-night-sweats">Had night sweats</label>
              </div>
            </div>
            <textarea
              className="notes-textarea"
              placeholder="Any other notes about last night's sleep..."
              value={notes.text}
              onChange={(e) => setNotes(prev => ({ ...prev, text: e.target.value }))}
            />
          </div>
          <div className="score-form">
            <label>
              Morning sleep score:
              <input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0-100"
              />
            </label>
            <div className="morning-actions">
              <button className="record-btn" onClick={handleRecord} disabled={!isValidScore}>Record Score</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
