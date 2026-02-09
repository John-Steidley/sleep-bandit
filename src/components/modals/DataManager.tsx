import { useState } from 'react';
import { Modal } from './Modal';
import { AppState } from '../../types';

interface DataManagerProps {
  data: AppState;
  onImport: (data: Partial<AppState>, isFullBackup?: boolean) => void;
  onClear: () => void;
}

export function DataManager({ data, onImport, onClear }: DataManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'historical' | 'full'>('historical');

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
      if (parsed.interventions && parsed.observations) {
        onImport(parsed, true);
        setImportText('');
        setIsOpen(false);
      } else {
        alert('Invalid format. Must have interventions and observations arrays.');
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
          {data.interventions.length} interventions, {data.observations.length} nights recorded
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

      <div className="data-section danger">
        <h4>Danger Zone</h4>
        <button className="danger-btn" onClick={() => {
          if (confirm('Are you sure? This will delete all data.')) {
            onClear();
            setIsOpen(false);
          }
        }}>
          Clear All Data
        </button>
      </div>
    </Modal>
  );
}
