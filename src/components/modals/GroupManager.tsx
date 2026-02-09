import { useState, useEffect } from 'react';
import { Group } from '../../types';

interface GroupManagerProps {
  groups: Group[];
  interventions: string[];
  onAddGroup: (group: Group) => void;
  onRemoveGroup: (index: number) => void;
  onUpdateGroup: (index: number, group: Group) => void;
}

export function GroupManager({
  groups,
  interventions,
  onAddGroup,
  onRemoveGroup,
  onUpdateGroup
}: GroupManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedInterventions, setSelectedInterventions] = useState<Record<number, boolean>>({});

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

  const getInterventionGroup = (index: number): string | null => {
    for (const group of groups) {
      if (group.interventionIndices.includes(index)) {
        return group.name;
      }
    }
    return null;
  };

  const startAdding = () => {
    setIsAdding(true);
    setEditingIndex(null);
    setGroupName('');
    setSelectedInterventions({});
  };

  const startEditing = (index: number) => {
    const group = groups[index];
    setEditingIndex(index);
    setIsAdding(false);
    setGroupName(group.name);
    const selected: Record<number, boolean> = {};
    group.interventionIndices.forEach(i => { selected[i] = true; });
    setSelectedInterventions(selected);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingIndex(null);
    setGroupName('');
    setSelectedInterventions({});
  };

  const handleSave = () => {
    const indices = Object.keys(selectedInterventions)
      .filter(k => selectedInterventions[parseInt(k, 10)])
      .map(k => parseInt(k, 10));

    if (!groupName.trim() || indices.length === 0) return;

    if (editingIndex !== null) {
      onUpdateGroup(editingIndex, { name: groupName.trim(), interventionIndices: indices });
    } else {
      onAddGroup({ name: groupName.trim(), interventionIndices: indices });
    }
    cancelForm();
  };

  const toggleIntervention = (index: number) => {
    const existingGroup = getInterventionGroup(index);
    if (existingGroup && editingIndex === null) return;
    if (existingGroup && groups[editingIndex!]?.name !== existingGroup) return;

    setSelectedInterventions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const canSelectIntervention = (index: number): boolean => {
    const existingGroup = getInterventionGroup(index);
    if (!existingGroup) return true;
    if (editingIndex !== null && groups[editingIndex]?.name === existingGroup) return true;
    return false;
  };

  const selectedCount = Object.values(selectedInterventions).filter(Boolean).length;
  const canSave = groupName.trim() && selectedCount >= 2;

  if (!isOpen) {
    return (
      <button className="groups-btn" onClick={() => setIsOpen(true)}>
        {'\ud83d\udd17'} Groups ({groups.length})
      </button>
    );
  }

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop-opaque" onClick={() => setIsOpen(false)} />
      <div className="groups-panel">
        <div className="groups-header">
          <h3>Intervention Groups</h3>
          <button className="close-btn" onClick={() => setIsOpen(false)}>x</button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1rem' }}>
          When rolling, only the highest-sampled intervention from each group will be selected (if positive).
        </p>

        <div className="groups-list">
          {groups.length === 0 && !isAdding ? (
            <p className="no-groups">No groups yet. Create a group to limit costly interventions.</p>
          ) : (
            groups.map((group, idx) => (
              <div key={idx} className="group-item">
                <div className="group-item-header">
                  <span className="group-item-name">{group.name}</span>
                  <div className="group-item-actions">
                    <button onClick={() => startEditing(idx)} title="Edit group">{'\u270f\ufe0f'}</button>
                    <button
                      className="delete"
                      onClick={() => onRemoveGroup(idx)}
                      title="Delete group"
                    >{'\ud83d\uddd1\ufe0f'}</button>
                  </div>
                </div>
                <div className="group-item-members">
                  {group.interventionIndices
                    .map(i => interventions[i])
                    .filter(Boolean)
                    .join(', ') || '(no members)'}
                </div>
              </div>
            ))
          )}
        </div>

        {(isAdding || editingIndex !== null) ? (
          <div className="add-group-form">
            <h4>{editingIndex !== null ? 'Edit Group' : 'New Group'}</h4>
            <input
              type="text"
              className="group-name-input"
              placeholder="Group name (e.g., 'Evening Routines')"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
            />
            <div className="group-intervention-list">
              {interventions.map((name, idx) => {
                const canSelect = canSelectIntervention(idx);
                const existingGroup = getInterventionGroup(idx);
                const isInOtherGroup = existingGroup && (editingIndex === null || groups[editingIndex]?.name !== existingGroup);

                return (
                  <div
                    key={idx}
                    className={`group-intervention-item ${isInOtherGroup ? 'in-other-group' : ''}`}
                  >
                    <input
                      type="checkbox"
                      id={`group-int-${idx}`}
                      checked={selectedInterventions[idx] || false}
                      onChange={() => canSelect && toggleIntervention(idx)}
                      disabled={!canSelect}
                    />
                    <label htmlFor={`group-int-${idx}`}>{name}</label>
                    {isInOtherGroup && (
                      <span className="group-tag">{existingGroup}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="group-form-actions">
              <button onClick={handleSave} disabled={!canSave}>
                {editingIndex !== null ? 'Update Group' : 'Create Group'}
              </button>
              <button onClick={cancelForm}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            className="add-intervention-btn"
            onClick={startAdding}
            disabled={interventions.length < 2}
          >
            + Add Group
          </button>
        )}
      </div>
    </div>
  );
}
