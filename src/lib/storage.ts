import { EventLog, CURRENT_VERSION, migrateSnapshot, migrateLog } from './events';

const OLD_STORAGE_KEY = 'sleep-bandit-data';
const EVENT_LOG_KEY = 'sleep-bandit-events';

export function loadEventLog(): EventLog {
  try {
    // Check for event log first
    const raw = localStorage.getItem(EVENT_LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EventLog;
      return migrateLog(parsed);
    }

    // Fall back to old snapshot format
    const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldRaw) {
      const snapshot = JSON.parse(oldRaw);
      const log = migrateSnapshot(snapshot);
      // Save migrated log and remove old key
      saveEventLog(log);
      localStorage.removeItem(OLD_STORAGE_KEY);
      return log;
    }
  } catch (e) {
    console.error('Failed to load event log:', e);
  }

  return { version: CURRENT_VERSION, events: [] };
}

export function saveEventLog(log: EventLog): void {
  try {
    localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(log));
  } catch (e) {
    console.error('Failed to save event log:', e);
  }
}
