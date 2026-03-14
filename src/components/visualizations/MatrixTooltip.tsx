import { useState, useCallback } from 'react';

export interface TooltipState {
  text: string;
  x: number;
  y: number;
}

export function useMatrixTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const onCellEnter = useCallback((e: React.MouseEvent, text: string) => {
    const rect = (e.currentTarget as Element).closest('svg')!.getBoundingClientRect();
    setTooltip({
      text,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const onCellMove = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as Element).closest('svg')!.getBoundingClientRect();
    setTooltip(prev => prev ? {
      ...prev,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    } : null);
  }, []);

  const onCellLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return { tooltip, onCellEnter, onCellMove, onCellLeave };
}

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  background: 'var(--bg-panel)',
  color: 'var(--text-primary)',
  border: '1px solid rgba(var(--white-rgb), 0.12)',
  borderRadius: '6px',
  padding: '5px 10px',
  fontSize: '12px',
  fontFamily: "'IBM Plex Mono', monospace",
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
  zIndex: 10,
  transform: 'translate(-50%, -100%)',
  marginTop: '-10px',
};

export function MatrixTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;

  return (
    <div
      style={{
        ...tooltipStyle,
        left: tooltip.x,
        top: tooltip.y,
      }}
    >
      {tooltip.text}
    </div>
  );
}
