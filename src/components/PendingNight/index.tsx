import { useState, useMemo } from 'react';
import { PendingNight as PendingNightType, NoteTagDefinition, ChecklistItemDefinition, Notes } from '../../types';

interface PendingNightProps {
  pending: PendingNightType;
  interventions: string[];
  posteriorMean: number[];
  baseline: number;
  noteTagDefinitions: NoteTagDefinition[];
  checklistItems: ChecklistItemDefinition[];
  onRecordScore: (score: number, notes: Notes) => void;
  onPreview: (score: number) => void;
  onCancel: () => void;
  onSleep: () => void;
  onTogglePendingIntervention: (index: number, active: boolean) => void;
  onCheckChecklistItem: (index: number, label: string, checked: boolean) => void;
  onToggleNoteTag: (label: string, checked: boolean) => void;
}

export function PendingNight({
  pending,
  interventions,
  posteriorMean,
  baseline,
  noteTagDefinitions,
  checklistItems,
  onRecordScore,
  onPreview,
  onCancel,
  onSleep,
  onTogglePendingIntervention,
  onCheckChecklistItem,
  onToggleNoteTag
}: PendingNightProps) {
  const [score, setScore] = useState('');
  const [checklistCompleted, setChecklistCompleted] = useState<Record<number, boolean>>({});
  const emptyNotes: Notes = {
    tags: noteTagDefinitions.map(d => ({ label: d.label, value: false })),
    text: ''
  };
  const [notes, setNotes] = useState<Notes>(emptyNotes);

  const isAsleep = pending.asleep;

  // Compute predicted score using posterior mean (average estimate)
  const predictedScoreAvg = useMemo(() => {
    let expected = baseline;
    for (let i = 0; i < interventions.length; i++) {
      if (pending.interventions[i]) {
        expected += posteriorMean[i] || 0;
      }
    }
    return expected;
  }, [posteriorMean, interventions.length, pending.interventions]);

  // Compute predicted score using Thompson samples (sampled estimate)
  const predictedScoreSampled = useMemo(() => {
    let expected = baseline;
    const samples = pending.samples || [];
    for (let i = 0; i < interventions.length; i++) {
      if (pending.interventions[i]) {
        expected += samples[i] || 0;
      }
    }
    return expected;
  }, [pending.samples, interventions.length, pending.interventions]);

  const activeInterventions = interventions
    .map((name, i) => ({ name, index: i }))
    .filter(({ index }) => pending.interventions[index]);

  const numScore = parseInt(score, 10);
  const isValidScore = !isNaN(numScore) && numScore >= 0 && numScore <= 100;

  const handleRecord = () => {
    if (isValidScore) {
      onRecordScore(numScore, notes);
      setScore('');
      setChecklistCompleted({});
      setNotes(emptyNotes);
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
    const newValue = !pending.interventions[index];
    onTogglePendingIntervention(index, newValue);
  };

  const toggleTag = (tagLabel: string) => {
    const currentTag = notes.tags.find(t => t.label === tagLabel);
    const newValue = !(currentTag?.value ?? false);
    setNotes(prev => ({
      ...prev,
      tags: prev.tags.map(t =>
        t.label === tagLabel ? { ...t, value: newValue } : t
      )
    }));
    onToggleNoteTag(tagLabel, newValue);
  };

  const toggleChecklistItem = (index: number) => {
    const newValue = !checklistCompleted[index];
    setChecklistCompleted(prev => ({
      ...prev,
      [index]: newValue
    }));
    onCheckChecklistItem(index, checklistItems[index].label, newValue);
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
                  className={`intervention-checklist-item ${pending.interventions[index] ? 'completed' : ''}`}
                >
                  <input
                    type="checkbox"
                    id={`intervention-${index}`}
                    checked={pending.interventions[index] || false}
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
        {!isAsleep && checklistItems.length > 0 && (
          <div className="evening-checklist">
            <div className="evening-checklist-divider" />
            {checklistItems.map((item, idx) => (
              <div
                key={idx}
                className={`evening-checklist-item ${checklistCompleted[idx] ? 'completed' : ''}`}
              >
                <input
                  type="checkbox"
                  id={`checklist-${idx}`}
                  checked={checklistCompleted[idx] || false}
                  onChange={() => toggleChecklistItem(idx)}
                />
                <label htmlFor={`checklist-${idx}`}>
                  {item.description}
                </label>
              </div>
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
              {notes.tags.map(tag => (
                <div key={tag.label} className={`note-checkbox ${tag.value ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    id={`note-${tag.label}`}
                    checked={tag.value}
                    onChange={() => toggleTag(tag.label)}
                  />
                  <label htmlFor={`note-${tag.label}`}>{noteTagDefinitions.find(d => d.label === tag.label)?.description ?? tag.label}</label>
                </div>
              ))}
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
