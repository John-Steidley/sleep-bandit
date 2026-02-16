import { useState, useEffect } from 'react';
import { useAppState } from './hooks/useAppState';
import { usePosterior } from './hooks/usePosterior';
import { InterventionList } from './components/InterventionList';
import { PendingNight } from './components/PendingNight';
import { ObservationHistory, GroupManager, NoteTagManager, ChecklistManager, DataManager, UpdateReport } from './components/modals';
import { CovarianceMatrix, PrecisionMatrix } from './components/visualizations';
import { UpdateReportData, Notes } from './types';

export default function App() {
  const {
    state,
    eventLog,
    addIntervention,
    renameIntervention,
    toggleInterventionDisabled,
    addGroup,
    removeGroup,
    updateGroup,
    addNoteTag,
    updateNoteTag,
    addChecklistItem,
    updateChecklistItem,
    removeChecklistItem,
    getInterventionGroup,
    rollTonight,
    togglePendingIntervention,
    checkChecklistItem,
    toggleNoteTag,
    markAsleep,
    recordScore,
    previewScore,
    cancelPending,
    importData,
    updateConfig
  } = useAppState();

  // Extract intervention names for components that need string[]
  const interventionNames = state.interventions.map(int => int.name);

  const [currentSamples, setCurrentSamples] = useState<number[] | null>(null);
  const [updateReport, setUpdateReport] = useState<UpdateReportData | null>(null);

  const posterior = usePosterior(interventionNames, state.observations, state.config);

  // Close report modal on Escape key
  useEffect(() => {
    if (!updateReport) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUpdateReport(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [updateReport]);

  const handleRollTonight = () => {
    rollTonight(posterior);
    setCurrentSamples(null);
  };

  const handleRecordScore = (score: number, notes: Notes) => {
    const report = recordScore(score, notes, posterior);
    if (report) {
      setUpdateReport(report);
    }
    setCurrentSamples(null);
  };

  const handlePreviewScore = (score: number) => {
    const report = previewScore(score, posterior);
    if (report) {
      setUpdateReport(report);
    }
  };

  const handleCancelPending = () => {
    cancelPending();
    setCurrentSamples(null);
  };

  const displaySamples = state.pendingNight?.samples || currentSamples;

  return (
    <div className="sleep-bandit">
      <header className="header">
        <h1>Sleep Bandit</h1>
        <p>Thompson Sampling for Sleep Optimization</p>
        <div className="controls">
          <ObservationHistory
            observations={state.observations}
            interventions={interventionNames}
            baseline={state.config.baseline}
            noteTagDefinitions={state.noteTagDefinitions}
          />
          <GroupManager
            groups={state.groups || []}
            interventions={interventionNames}
            onAddGroup={addGroup}
            onRemoveGroup={removeGroup}
            onUpdateGroup={updateGroup}
          />
          <NoteTagManager
            noteTagDefinitions={state.noteTagDefinitions}
            onAdd={addNoteTag}
            onUpdate={updateNoteTag}
          />
          <ChecklistManager
            checklistItems={state.checklistItems || []}
            onAdd={addChecklistItem}
            onUpdate={updateChecklistItem}
            onRemove={removeChecklistItem}
          />
          <DataManager
            eventLog={eventLog.current}
            observationCount={state.observations.length}
            interventionCount={state.interventions.length}
            onImport={importData}
          />
        </div>
      </header>

      <main className="main-content">
        {!state.pendingNight && (
          <section className="roll-section">
            <button
              className="roll-btn"
              onClick={handleRollTonight}
              disabled={state.interventions.length === 0}
            >
              {'\ud83c\udfb2'} Roll Tonight's Interventions
            </button>
          </section>
        )}

        {state.pendingNight && (
          <PendingNight
            pending={state.pendingNight}
            interventions={interventionNames}
            posteriorMean={posterior.mean}
            baseline={state.config.baseline}
            noteTagDefinitions={state.noteTagDefinitions}
            checklistItems={state.checklistItems || []}
            onRecordScore={handleRecordScore}
            onPreview={handlePreviewScore}
            onCancel={handleCancelPending}
            onSleep={markAsleep}
            onTogglePendingIntervention={togglePendingIntervention}
            onCheckChecklistItem={checkChecklistItem}
            onToggleNoteTag={toggleNoteTag}
          />
        )}

        <div className="baseline-info">
          Model: baseline{' '}
          <input
            type="number"
            value={state.config.baseline}
            onChange={(e) => updateConfig({ baseline: Number(e.target.value) })}
          />
          {' '}{'\u00b7'} noise {'\u03c3'}{' '}
          <input
            type="number"
            value={state.config.sigma}
            onChange={(e) => updateConfig({ sigma: Number(e.target.value) })}
            step="0.1"
          />
          {' '}{'\u00b7'} prior {'\u03c4'}{' '}
          <input
            type="number"
            value={state.config.tau}
            onChange={(e) => updateConfig({ tau: Number(e.target.value) })}
            step="0.1"
          />
        </div>

        <InterventionList
          interventions={state.interventions}
          posterior={posterior}
          displaySamples={displaySamples}
          tau={state.config.tau}
          getInterventionGroup={getInterventionGroup}
          onRename={renameIntervention}
          onToggleDisabled={toggleInterventionDisabled}
          onAdd={addIntervention}
        />

        {state.interventions.length >= 2 && (
          <CovarianceMatrix
            interventions={interventionNames}
            cov={posterior.cov}
          />
        )}

        {state.interventions.length >= 2 && (
          <PrecisionMatrix
            interventions={interventionNames}
            precision={posterior.precision}
          />
        )}
      </main>

      {updateReport && (
        <UpdateReport
          report={updateReport}
          onClose={() => setUpdateReport(null)}
          onScoreChange={updateReport.isPreview ? handlePreviewScore : undefined}
        />
      )}
    </div>
  );
}
