import { UpdateReportData } from '../../types';

interface UpdateReportProps {
  report: UpdateReportData;
  onClose: () => void;
  onScoreChange?: (score: number) => void;
}

export function UpdateReport({ report, onClose, onScoreChange }: UpdateReportProps) {
  const meanDelta = (item: UpdateReportData['interventions'][0]) => item.newMean - item.oldMean;
  const rangeReduction = (item: UpdateReportData['interventions'][0]) => {
    const oldRange = item.oldStd * 2;
    const newRange = item.newStd * 2;
    return ((oldRange - newRange) / oldRange) * 100;
  };

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 0 && val <= 100 && onScoreChange) {
      onScoreChange(val);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className={`update-report ${report.isPreview ? 'preview' : ''}`}>
        <div className="update-report-header">
          <h3>
            {report.isPreview ? 'Preview: ' : ''}Parameter Update
            {report.isPreview && <span className="preview-badge">hypothetical</span>}
          </h3>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>
        <div className="update-report-summary">
          {report.isPreview ? (
            <label className="report-score-editable">
              If score were
              <input
                type="number"
                min="0"
                max="100"
                value={report.score}
                onChange={handleScoreChange}
              />
            </label>
          ) : (
            <span className="report-score">Score: {report.score}</span>
          )}
          <span className="report-date">{new Date(report.date).toLocaleDateString()}</span>
        </div>
        <div className="update-report-list">
          {report.interventions.map((item, i) => {
            const delta = meanDelta(item);
            const reduction = rangeReduction(item);
            return (
              <div key={i} className={`update-report-item ${item.wasActive ? 'was-active' : ''}`}>
                <div className="update-item-header">
                  <span className="update-item-name">{item.name}</span>
                  {item.wasActive && <span className="active-badge">active</span>}
                </div>
                <div className="update-item-stats">
                  <div className="update-stat">
                    <span className="update-stat-label">Effect estimate</span>
                    <div className="update-stat-change">
                      <span className="old-value">{item.oldMean >= 0 ? '+' : ''}{item.oldMean.toFixed(2)}</span>
                      <span className="arrow">{'\u2192'}</span>
                      <span className={`new-value ${item.newMean > 0 ? 'positive' : item.newMean < 0 ? 'negative' : ''}`}>
                        {item.newMean >= 0 ? '+' : ''}{item.newMean.toFixed(2)}
                      </span>
                      <span className={`delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}`}>
                        ({delta >= 0 ? '+' : ''}{delta.toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <div className="update-stat">
                    <span className="update-stat-label">Uncertainty (+/-1{'\u03c3'})</span>
                    <div className="update-stat-change">
                      <span className="old-value">+/-{item.oldStd.toFixed(2)}</span>
                      <span className="arrow">{'\u2192'}</span>
                      <span className="new-value">+/-{item.newStd.toFixed(2)}</span>
                      <span className={`delta ${reduction > 0 ? 'positive' : ''}`}>
                        ({reduction > 0 ? '-' : '+'}{Math.abs(reduction).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <div className="update-stat">
                    <span className="update-stat-label">P(helpful)</span>
                    <div className="update-stat-change">
                      <span className="old-value">{(item.oldProb * 100).toFixed(0)}%</span>
                      <span className="arrow">{'\u2192'}</span>
                      <span className={`new-value ${item.newProb > 0.7 ? 'positive' : item.newProb < 0.3 ? 'negative' : ''}`}>
                        {(item.newProb * 100).toFixed(0)}%
                      </span>
                      {(() => {
                        const probDelta = (item.newProb - item.oldProb) * 100;
                        return (
                          <span className={`delta ${probDelta > 0 ? 'positive' : probDelta < 0 ? 'negative' : ''}`}>
                            ({probDelta >= 0 ? '+' : ''}{probDelta.toFixed(0)}pp)
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="update-report-footer">
          <button className="dismiss-btn" onClick={onClose}>Got it</button>
        </div>
      </div>
    </>
  );
}
