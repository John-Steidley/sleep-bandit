import { InterventionRow } from './InterventionRow';
import { AddIntervention } from '../forms';
import { probPositive } from '../../lib/bayesian';
import { Intervention, Posterior } from '../../types';

interface InterventionListProps {
  interventions: Intervention[];
  posterior: Posterior;
  displaySamples: number[] | null;
  tau: number;
  getInterventionGroup: (index: number) => string | null;
  onRemove: (index: number) => void;
  onRename: (index: number, newName: string) => void;
  onToggleDisabled: (index: number) => void;
  onAdd: (name: string) => void;
}

export function InterventionList({
  interventions,
  posterior,
  displaySamples,
  tau,
  getInterventionGroup,
  onRemove,
  onRename,
  onToggleDisabled,
  onAdd
}: InterventionListProps) {
  // Compute minimum std across all interventions for consistent curve scaling
  const minStd = interventions.length > 0
    ? Math.min(...interventions.map((_, i) => posterior.std[i] || tau))
    : tau;

  return (
    <section className="interventions-section">
      <div className="section-header">
        <h2>Interventions</h2>
      </div>

      {interventions.length === 0 ? (
        <div className="empty-state">
          <h3>No interventions yet</h3>
          <p>Add some sleep interventions to start optimizing</p>
        </div>
      ) : (
        interventions.map((int, i) => (
          <InterventionRow
            key={i}
            name={int.name}
            disabled={int.disabled}
            mean={posterior.mean[i] || 0}
            std={posterior.std[i] || tau}
            minStd={minStd}
            pPositive={probPositive(posterior.mean[i] || 0, posterior.std[i] || tau)}
            sample={displaySamples ? displaySamples[i] : null}
            isActive={displaySamples ? displaySamples[i] > 0 : false}
            groupName={getInterventionGroup(i)}
            onRemove={() => onRemove(i)}
            onRename={(newName) => onRename(i, newName)}
            onToggleDisabled={() => onToggleDisabled(i)}
          />
        ))
      )}

      <AddIntervention onAdd={onAdd} />
    </section>
  );
}
