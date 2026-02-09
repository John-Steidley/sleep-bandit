import { useState } from 'react';

interface AddInterventionProps {
  onAdd: (name: string) => void;
}

export function AddIntervention({ onAdd }: AddInterventionProps) {
  const [name, setName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name.trim());
      setName('');
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button className="add-intervention-btn" onClick={() => setIsOpen(true)}>
        + Add Intervention
      </button>
    );
  }

  return (
    <div className="add-intervention-form">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Intervention name..."
        autoFocus
      />
      <button onClick={handleAdd}>Add</button>
      <button onClick={() => setIsOpen(false)}>Cancel</button>
    </div>
  );
}
