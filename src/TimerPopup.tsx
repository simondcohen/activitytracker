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
    setCurrentNote('');
    setShowNoteInput(false);
  };

  return (
    <div className="widget-mode flex gap-2 items-center">
      <div className="flex items-center gap-1">
        <select
          className="text-xs border rounded px-1 py-0.5"
          value={selectedCategory ?? ''}
          onChange={(e) => handleCategorySelect(e.target.value)}
        >
          <option value="" disabled>
            Select
          </option>
          <optgroup label="Work">
            {storedCategories.categories.work.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </optgroup>
          <optgroup label="Personal">
            {storedCategories.categories.personal.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </optgroup>
        </select>
        {selectedCategory === 'Other' && (
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="Custom"
            className="text-xs border rounded px-1 py-0.5 w-24"
          />
        )}
      </div>

      <Timer
        onSave={handleSaveActivity}
        selectedCategory={
          selectedCategory === 'Other' ? customCategory || 'Other' : selectedCategory
        }
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
              className="text-xs border rounded px-1 py-0.5 w-32"
            />
            <button
              onClick={handleAddNote}
              disabled={!currentNote.trim()}
              className={`text-xs px-2 py-0.5 rounded ${currentNote.trim() ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-400'}`}
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowNoteInput(false);
                setCurrentNote('');
              }}
              className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-700"
            >
              ×
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowNoteInput(true)}
            className="text-xs px-2 py-1 rounded bg-neutral-100 text-neutral-700"
          >
            Add Note
          </button>
        )}
      </div>

      {ongoingNotes.length > 0 && (
        <div className="text-xs text-neutral-600 truncate max-w-[8rem]">
          {ongoingNotes[ongoingNotes.length - 1].content}
          {ongoingNotes.length > 1 && ` (+${ongoingNotes.length - 1})`}
        </div>
      )}
    </div>
  );
};

export default TimerPopup;
