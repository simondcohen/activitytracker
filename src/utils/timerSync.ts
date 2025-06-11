export interface TimerSyncMessage {
  type:
    | 'timer-start'
    | 'timer-stop'
    | 'timer-pause'
    | 'timer-save'
    | 'timer-clear'
    | 'category-update';
  revision: number;
  timestamp: number;
  payload: {
    isRunning?: boolean;
    startTime?: string;
    selectedCategory?: string | null;
  };
}

export type TimerSyncListener = (msg: TimerSyncMessage) => void;

const CHANNEL_NAME = 'activity-tracker-timer';
const STORAGE_KEY = 'activity-tracker-timer-fallback';
const REVISION_KEY = 'activity-tracker-timer-revision';

let channel: BroadcastChannel | null = null;
const listeners: TimerSyncListener[] = [];
let initialized = false;
let currentRevision = 0;

function handleStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY && e.newValue) {
    try {
      const msg: TimerSyncMessage = JSON.parse(e.newValue);
      dispatch(msg);
    } catch {
      // ignore
    }
  }
}

function dispatch(msg: TimerSyncMessage) {
  syncRevision(msg.revision);
  listeners.forEach((cb) => cb(msg));
}

export function getCurrentRevision() {
  if (currentRevision === 0) {
    try {
      const stored = localStorage.getItem(REVISION_KEY);
      if (stored) {
        const rev = parseInt(stored, 10);
        if (!isNaN(rev)) currentRevision = rev;
      }
    } catch {
      // ignore
    }
  }
  return currentRevision;
}

export function nextRevision(): number {
  try {
    const stored = localStorage.getItem(REVISION_KEY);
    const rev = stored ? parseInt(stored, 10) : 0;
    const next = rev + 1;
    localStorage.setItem(REVISION_KEY, String(next));
    currentRevision = next;
    return next;
  } catch {
    currentRevision += 1;
    return currentRevision;
  }
}

export function syncRevision(revision: number) {
  if (revision > currentRevision) {
    currentRevision = revision;
    try {
      localStorage.setItem(REVISION_KEY, String(revision));
    } catch {
      // ignore
    }
  }
}

export function initTimerSync() {
  if (initialized) return;
  initialized = true;
  try {
    const stored = localStorage.getItem(REVISION_KEY);
    if (stored) {
      const rev = parseInt(stored, 10);
      if (!isNaN(rev)) currentRevision = rev;
    }
  } catch {
    // ignore
  }
  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (ev) => {
      dispatch(ev.data as TimerSyncMessage);
    };
  } else {
    window.addEventListener('storage', handleStorage);
  }
}

export function closeTimerSync() {
  if (channel) {
    channel.close();
    channel = null;
  }
  window.removeEventListener('storage', handleStorage);
  initialized = false;
}

export function addTimerSyncListener(listener: TimerSyncListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function broadcastTimerMessage(msg: TimerSyncMessage) {
  if (!initialized) initTimerSync();
  syncRevision(msg.revision);
  if (channel) {
    channel.postMessage(msg);
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(msg));
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

