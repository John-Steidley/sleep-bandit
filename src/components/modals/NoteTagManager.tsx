import { useState, useEffect } from 'react';
import { NoteTagDefinition } from '../../types';

interface NoteTagManagerProps {
  noteTagDefinitions: NoteTagDefinition[];
  onAdd: (tag: NoteTagDefinition) => void;
  onUpdate: (index: number, tag: NoteTagDefinition) => void;
}

export function NoteTagManager({
  noteTagDefinitions,
  onAdd,
  onUpdate
}: NoteTagManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAdding || editingIndex !== null) {
          cancelForm();
        } else {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAdding, editingIndex]);

  const startAdding = () => {
    setIsAdding(true);
    setEditingIndex(null);
    setLabel('');
    setDescription('');
  };

  const startEditing = (index: number) => {
    const tag = noteTagDefinitions[index];
    setEditingIndex(index);
    setIsAdding(false);
    setLabel(tag.label);
    setDescription(tag.description);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingIndex(null);
    setLabel('');
    setDescription('');
  };

  const isDuplicateLabel = (lbl: string): boolean => {
    const trimmed = lbl.trim();
    return noteTagDefinitions.some((tag, i) =>
      tag.label === trimmed && i !== editingIndex
    );
  };

  const handleSave = () => {
    const trimmedLabel = label.trim();
    const trimmedDescription = description.trim();

    if (!trimmedLabel || !trimmedDescription) return;
    if (isDuplicateLabel(trimmedLabel)) return;

    if (editingIndex !== null) {
      onUpdate(editingIndex, { label: trimmedLabel, description: trimmedDescription });
    } else {
      onAdd({ label: trimmedLabel, description: trimmedDescription });
    }
    cancelForm();
  };

  const canSave = label.trim() && description.trim() && !isDuplicateLabel(label);

  if (!isOpen) {
    return (
      <button className="note-tags-btn" onClick={() => setIsOpen(true)}>
        {'\ud83c\udff7\ufe0f'} Note Tags ({noteTagDefinitions.length})
      </button>
    );
  }

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop-opaque" onClick={() => setIsOpen(false)} />
      <div className="note-tags-panel">
        <div className="note-tags-header">
          <h3>Note Tags</h3>
          <button className="close-btn" onClick={() => setIsOpen(false)}>x</button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Tags appear as checkboxes when recording your morning sleep score.
        </p>

        <div className="note-tags-list">
          {noteTagDefinitions.length === 0 && !isAdding ? (
            <p className="no-note-tags">No tags yet. Add tags to track sleep-related events.</p>
          ) : (
            noteTagDefinitions.map((tag, idx) => (
              <div key={idx} className="note-tag-item">
                <div className="note-tag-item-header">
                  <span className="note-tag-item-name">{tag.description}</span>
                  <div className="note-tag-item-actions">
                    <button onClick={() => startEditing(idx)} title="Edit tag">{'\u270f\ufe0f'}</button>
                  </div>
                </div>
                <div className="note-tag-item-label">{tag.label}</div>
              </div>
            ))
          )}
        </div>

        {(isAdding || editingIndex !== null) ? (
          <div className="note-tag-form">
            <h4>{editingIndex !== null ? 'Edit Tag' : 'New Tag'}</h4>
            <input
              type="text"
              className="note-tag-input"
              placeholder="Label (e.g., 'nightmares')"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              className="note-tag-input"
              placeholder="Description (e.g., 'Had nightmares')"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {isDuplicateLabel(label) && (
              <p style={{ fontSize: '0.8rem', color: 'var(--red-light)', margin: '0 0 0.5rem 0' }}>
                A tag with this label already exists.
              </p>
            )}
            <div className="note-tag-form-actions">
              <button onClick={handleSave} disabled={!canSave}>
                {editingIndex !== null ? 'Update Tag' : 'Create Tag'}
              </button>
              <button onClick={cancelForm}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            className="add-intervention-btn"
            onClick={startAdding}
          >
            + Add Tag
          </button>
        )}
      </div>
    </div>
  );
}
