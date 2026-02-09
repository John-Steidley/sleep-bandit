import { useState } from 'react';
import { Modal } from './Modal';
import { Observation } from '../../types';
import { BASELINE } from '../../lib/bayesian';

interface ObservationHistoryProps {
  observations: Observation[];
  interventions: string[];
}

export function ObservationHistory({ observations, interventions }: ObservationHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button className="history-btn" onClick={() => setIsOpen(true)}>
        {'\ud83d\udcdc'} History ({observations.length})
      </button>
    );
  }

  const sorted = [...observations].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="history-panel">
      <div className="history-header">
        <h3>Observation History</h3>
        <button className="close-btn" onClick={() => setIsOpen(false)}>x</button>
      </div>
      <div className="history-list">
        {sorted.length === 0 ? (
          <p className="no-history">No observations yet</p>
        ) : (
          sorted.map((obs, idx) => {
            const activeNames = interventions.filter((_, i) =>
              obs.interventions && obs.interventions[i]
            );
            const noteLabels: string[] = [];
            if (obs.notes?.wokeUpLong) noteLabels.push('woke up 1+ hr');
            if (obs.notes?.nightmares) noteLabels.push('nightmares');
            if (obs.notes?.nightSweats) noteLabels.push('night sweats');
            return (
              <div key={idx} className="history-item">
                <span className="history-date">
                  {new Date(obs.date).toLocaleDateString()}
                </span>
                <span className={`history-score ${obs.score >= BASELINE ? 'good' : 'bad'}`}>
                  {obs.score}
                </span>
                <div className="history-interventions">
                  <span>{activeNames.length === 0 ? '(baseline)' : activeNames.join(', ')}</span>
                  {noteLabels.length > 0 && (
                    <div className="history-notes">{noteLabels.join(' \u00b7 ')}</div>
                  )}
                  {obs.notes?.text && (
                    <div className="history-freeform">"{obs.notes.text}"</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
