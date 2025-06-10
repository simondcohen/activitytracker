export interface TimerSyncMessage {
  type: 'timer-start' | 'timer-stop' | 'timer-pause' | 'timer-save' | 'timer-clear' | 'category-update';
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

let channel: BroadcastChannel | null = null;
const listeners: TimerSyncListener[] = [];
let initialized = false;

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
  listeners.forEach((cb) => cb(msg));
}

export function initTimerSync() {
  if (initialized) return;
  initialized = true;
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
