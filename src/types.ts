export interface Tag {
  label: string;
  value: boolean;
}

export interface NoteTagDefinition {
  label: string;
  description: string;
}

export interface Notes {
  tags: Tag[];
  text: string;
}

export interface StatisticalConfig {
  baseline: number;
  tau: number;
  sigma: number;
}

export interface Observation {
  date: string;
  interventions: boolean[];
  score: number;
  notes?: Notes;
}

export interface PendingNight {
  date: string;
  interventions: boolean[];
  samples: number[];
  asleep: boolean;
}

export interface Group {
  name: string;
  interventionIndices: number[];
}

export interface Intervention {
  name: string;
  disabled: boolean;
}

export interface AppState {
  interventions: Intervention[];
  observations: Observation[];
  pendingNight: PendingNight | null;
  groups: Group[];
  config: StatisticalConfig;
  noteTagDefinitions: NoteTagDefinition[];
}

export interface Posterior {
  mean: number[];
  cov: number[][];
  std: number[];
  precision: number[][];
}

export interface UpdateReportItem {
  name: string;
  wasActive: boolean;
  oldMean: number;
  newMean: number;
  oldStd: number;
  newStd: number;
  oldProb: number;
  newProb: number;
}

export interface UpdateReportData {
  isPreview?: boolean;
  score: number;
  date: string;
  interventions: UpdateReportItem[];
}
