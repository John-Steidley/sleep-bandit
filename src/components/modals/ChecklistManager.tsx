import { useState, useEffect } from 'react';
import { ChecklistItemDefinition } from '../../types';

interface ChecklistManagerProps {
  checklistItems: ChecklistItemDefinition[];
  onAdd: (item: ChecklistItemDefinition) => void;
  onUpdate: (index: number, item: ChecklistItemDefinition) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function ChecklistManager({
  checklistItems,
  onAdd,
  onUpdate,
  onRemove,
  onReorder
}: ChecklistManagerProps) {
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
    const item = checklistItems[index];
    setEditingIndex(index);
    setIsAdding(false);
    setLabel(item.label);
    setDescription(item.description);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingIndex(null);
    setLabel('');
    setDescription('');
  };

  const isDuplicateLabel = (lbl: string): boolean => {
    const trimmed = lbl.trim();
    return checklistItems.some((item, i) =>
      item.label === trimmed && i !== editingIndex
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

  const handleRemove = (index: number) => {
    onRemove(index);
    if (editingIndex === index) {
      cancelForm();
    }
  };

  const canSave = label.trim() && description.trim() && !isDuplicateLabel(label);

  if (!isOpen) {
    return (
      <button className="checklist-btn" onClick={() => setIsOpen(true)}>
        {'\ud83d\udccb'} Checklist ({checklistItems.length})
      </button>
    );
  }

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop-opaque" onClick={() => setIsOpen(false)} />
      <div className="checklist-panel">
        <div className="checklist-header">
          <h3>Evening Checklist</h3>
          <button className="close-btn" onClick={() => setIsOpen(false)}>x</button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Items appear as checkboxes on the evening screen to help track your bedtime routine.
        </p>

        <div className="checklist-list">
          {checklistItems.length === 0 && !isAdding ? (
            <p className="no-checklist-items">No items yet. Add items to track your bedtime routine.</p>
          ) : (
            checklistItems.map((item, idx) => (
              <div key={idx} className="checklist-item">
                <div className="checklist-item-header">
                  <span className="checklist-item-name">{item.description}</span>
                  <div className="checklist-item-actions">
                    <button
                      onClick={() => onReorder(idx, idx - 1)}
                      disabled={idx === 0}
                      title="Move up"
                    >{'\u2191'}</button>
                    <button
                      onClick={() => onReorder(idx, idx + 1)}
                      disabled={idx === checklistItems.length - 1}
                      title="Move down"
                    >{'\u2193'}</button>
                    <button onClick={() => startEditing(idx)} title="Edit item">{'\u270f\ufe0f'}</button>
                    <button className="delete" onClick={() => handleRemove(idx)} title="Delete item">{'\ud83d\uddd1\ufe0f'}</button>
                  </div>
                </div>
                <div className="checklist-item-label">{item.label}</div>
              </div>
            ))
          )}
        </div>

        {(isAdding || editingIndex !== null) ? (
          <div className="checklist-form">
            <h4>{editingIndex !== null ? 'Edit Item' : 'New Item'}</h4>
            <input
              type="text"
              className="checklist-input"
              placeholder="Label (e.g., 'brush-teeth')"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              className="checklist-input"
              placeholder="Description (e.g., 'Brush teeth')"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {isDuplicateLabel(label) && (
              <p style={{ fontSize: '0.8rem', color: 'var(--red-light)', margin: '0 0 0.5rem 0' }}>
                An item with this label already exists.
              </p>
            )}
            <div className="checklist-form-actions">
              <button onClick={handleSave} disabled={!canSave}>
                {editingIndex !== null ? 'Update Item' : 'Create Item'}
              </button>
              <button onClick={cancelForm}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            className="add-intervention-btn"
            onClick={startAdding}
          >
            + Add Item
          </button>
        )}
      </div>
    </div>
  );
}
