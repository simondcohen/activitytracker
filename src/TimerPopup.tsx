import React, { useEffect, useState, useRef } from 'react';
import { Timer } from './components/Timer';
import { Activity, StoredCategories, Note } from './types';
import {
  initTimerSync,
  addTimerSyncListener,
  broadcastTimerMessage,
  TimerSyncMessage,
  nextRevision,
  getCurrentRevision
} from './utils/timerSync';
import { loadStoredCategories } from './utils';
import { withActivitiesAtomic } from './utils/storage';

const TimerPopup: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState('');
  const [storedCategories] = useState<StoredCategories>(loadStoredCategories());
  const [ongoingNotes, setOngoingNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem('ongoingNotes');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });
  const [currentNote, setCurrentNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const revisionRef = useRef(0);
  const lastMsgRef = useRef<{ revision: number; timestamp: number }>({ revision: 0, timestamp: 0 });

  useEffect(() => {
    revisionRef.current = getCurrentRevision();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ongoingNotes', JSON.stringify(ongoingNotes));
    } catch {
      // ignore
    }
  }, [ongoingNotes]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ongoingNotes') {
        if (e.newValue) {
          try {
            setOngoingNotes(JSON.parse(e.newValue));
          } catch {
            // ignore
          }
        } else {
          setOngoingNotes([]);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Load selected category from localStorage on mount so the popup
  // reflects the current selection immediately when opened
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timerState');
      if (saved) {
        const parsed = JSON.parse(saved) as { selectedCategory?: string | null };
        if (parsed && typeof parsed.selectedCategory !== 'undefined') {
          setSelectedCategory(parsed.selectedCategory ?? null);
        }
      }
    } catch {
      // ignore JSON parse or storage errors
    }
  }, []);

  const handleMessage = (msg: TimerSyncMessage) => {
    const last = lastMsgRef.current;
    if (msg.revision < last.revision || (msg.revision === last.revision && msg.timestamp <= last.timestamp)) {
      return;
    }
    lastMsgRef.current = { revision: msg.revision, timestamp: msg.timestamp };
    revisionRef.current = msg.revision;
    if (msg.type === 'category-update') {
      setSelectedCategory(msg.payload.selectedCategory ?? null);
    }
  };

  useEffect(() => {
    initTimerSync();
    const unsub = addTimerSyncListener(handleMessage);
    return () => unsub();
  }, []);

  const sendMessage = (
    type: TimerSyncMessage['type'],
    payload: TimerSyncMessage['payload'] = {}
  ) => {
    const rev = nextRevision();
    revisionRef.current = rev;
    const msg: TimerSyncMessage = {
      type,
      revision: rev,
      timestamp: Date.now(),
      payload
    };
    lastMsgRef.current = { revision: rev, timestamp: msg.timestamp };
    broadcastTimerMessage(msg);
  };

  const handleSaveActivity = (
    duration: number,
    startTime: string,
    endTime: string
  ) => {
    if (!selectedCategory) return;

    const saved = localStorage.getItem('activities');
    let activities: Activity[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) activities = parsed;
      } catch {
        // ignore parse errors
      }
    }

    const newActivity: Activity = {
      id: crypto.randomUUID(),
      category: selectedCategory,
      startTime,
      endTime,
      duration
    };

    const updated = [newActivity, ...activities];
    localStorage.setItem('activities', JSON.stringify(updated));
    withActivitiesAtomic((acts) => [newActivity, ...acts]);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    try {
      const savedTimer = localStorage.getItem('timerState');
      const timerState = savedTimer ? JSON.parse(savedTimer) : {};
      const now = new Date();
      localStorage.setItem(
        'timerState',
        JSON.stringify({
          ...timerState,
          selectedCategory: category,
          isRunning: timerState.isRunning ?? false,
          startTime: timerState.startTime ?? now.toISOString(),
          lastCheckpoint: timerState.lastCheckpoint ?? now.toISOString()
        })
      );
    } catch {
      // ignore
    }
    sendMessage('category-update', { selectedCategory: category });
  };

  const handleAddNote = () => {
    if (!currentNote.trim()) return;
    const newNote: Note = {
      id: crypto.randomUUID(),
      content: currentNote,
      timestamp: new Date().toISOString()
    };
    setOngoingNotes(prev => [...prev, newNote]);
    setShowNoteInput(false);
    setCurrentNote('');
  };
  const handleCancelNote = () => {
    setShowNoteInput(false);
    setCurrentNote("");
  };
  // Remember window size/position
  useEffect(() => {
    const handleUnload = () => {
      try {
        const data = {
          width: window.outerWidth,
          height: window.outerHeight,
          left: window.screenX,
          top: window.screenY
        };
        localStorage.setItem('popupBounds', JSON.stringify(data));
      } catch {
        // ignore errors
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return (
    <div className="bg-white p-2 shadow-sm flex items-center gap-2 w-full">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium">
          {selectedCategory === 'Other' ? customCategory || 'Other' : selectedCategory || 'No category'}
        </span>
        <select
          value={selectedCategory ?? ''}
          onChange={(e) => handleCategorySelect(e.target.value)}
          className="text-xs border rounded px-1 py-0.5"
        >
          <option value="">Select</option>
          {storedCategories.categories.work.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
          {storedCategories.categories.personal.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      {selectedCategory === 'Other' && (
        <input
          type="text"
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          placeholder="Custom"
          className="border rounded px-1 py-0.5 text-xs w-24"
        />
      )}
      <Timer
        onSave={handleSaveActivity}
        selectedCategory={selectedCategory === 'Other' ? customCategory || 'Other' : selectedCategory}
        widgetMode={true}
        readFromStorage={true}
        writeToStorage={true}
      />
      <div className="flex items-center gap-1">
        {showNoteInput ? (
          <>
            <input
              type="text"
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Note"
              className="border rounded px-1 py-0.5 text-xs w-28"
            />
            <button
              onClick={handleAddNote}
              disabled={!currentNote.trim()}
              className="px-1 py-0.5 text-xs rounded bg-primary-600 text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={handleCancelNote}
              className="px-1 py-0.5 text-xs rounded bg-neutral-200"
            >
              ×
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowNoteInput(true)}
              className="px-2 py-0.5 text-xs border rounded"
            >
              Add Note
            </button>
            {ongoingNotes.length > 0 && (
              <span className="text-xs text-neutral-600 truncate max-w-[100px]">
                {ongoingNotes[ongoingNotes.length - 1].content}
                {ongoingNotes.length > 1 && ` (+${ongoingNotes.length - 1})`}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TimerPopup;
