import { useState } from 'react';
import { Modal } from './Modal';
import { EventLog } from '../../lib/events';

interface DataManagerProps {
  eventLog: EventLog;
  observationCount: number;
  interventionCount: number;
  onImport: (data: unknown, isFullBackup?: boolean) => void;
}

export function DataManager({ eventLog, observationCount, interventionCount, onImport }: DataManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'historical' | 'full'>('historical');

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(eventLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sleep-bandit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportHistorical = () => {
    try {
      const parsed = JSON.parse(importText);
      onImport(parsed);
      setImportText('');
      setIsOpen(false);
    } catch {
      alert('Invalid JSON format. See format specification below.');
    }
  };

  const handleImportFull = () => {
    try {
      const parsed = JSON.parse(importText);
      // Accept either EventLog format or old AppState format
      if ((parsed.version && parsed.events) || (parsed.interventions && parsed.observations)) {
        onImport(parsed, true);
        setImportText('');
        setIsOpen(false);
      } else {
        alert('Invalid format. Must be an EventLog or have interventions and observations arrays.');
      }
    } catch {
      alert('Invalid JSON format.');
    }
  };

  if (!isOpen) {
    return (
      <button className="data-manager-btn" onClick={() => setIsOpen(true)}>
        {'\ud83d\udcca'} Data
      </button>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="data-manager">
      <div className="data-manager-header">
        <h3>Data Management</h3>
        <button className="close-btn" onClick={() => setIsOpen(false)}>x</button>
      </div>

      <div className="data-section">
        <h4>Export</h4>
        <button onClick={handleExport}>Download JSON</button>
        <p className="data-stats">
          {interventionCount} interventions, {observationCount} nights recorded, {eventLog.events.length} events
        </p>
      </div>

      <div className="data-section">
        <h4>Import Historical Data</h4>
        <div className="import-mode-selector">
          <label>
            <input
              type="radio"
              value="historical"
              checked={importMode === 'historical'}
              onChange={(e) => setImportMode(e.target.value as 'historical')}
            />
            Historical (add to existing)
          </label>
          <label>
            <input
              type="radio"
              value="full"
              checked={importMode === 'full'}
              onChange={(e) => setImportMode(e.target.value as 'full')}
            />
            Full backup (replace all)
          </label>
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={importMode === 'historical'
            ? '{\n  "interventions": ["Melatonin", "L-Theanine"],\n  "nights": [\n    {"interventions": [true, false], "score": 75},\n    ...\n  ]\n}'
            : 'Paste full backup JSON...'
          }
        />
        <button onClick={importMode === 'historical' ? handleImportHistorical : handleImportFull}>
          Import
        </button>
      </div>
    </Modal>
  );
}
