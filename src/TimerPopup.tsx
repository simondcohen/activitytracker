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
  const [storedCategories, setStoredCategories] = useState<StoredCategories>(
    loadStoredCategories()
  );
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

  const revisionRef = useRef(0);
  const lastMsgRef = useRef<{ revision: number; timestamp: number }>({ revision: 0, timestamp: 0 });

  useEffect(() => {
    initTimerSync();
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
      if (e.key === 'storedCategories' && e.newValue) {
        try {
          setStoredCategories(JSON.parse(e.newValue));
        } catch {
          // ignore
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
      category:
        selectedCategory === 'Other' ? customCategory || 'Other' : selectedCategory,
      startTime,
      endTime,
      duration,
      notes: ongoingNotes
    };

    const updated = [newActivity, ...activities];
    localStorage.setItem('activities', JSON.stringify(updated));
    withActivitiesAtomic((acts) => [newActivity, ...acts]);
    setOngoingNotes([]);
    setCurrentNote('');
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
  };

  const handleDeleteNote = (id: string) => {
    setOngoingNotes(prev => prev.filter(n => n.id !== id));
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
    <div className="bg-white p-3 shadow-sm space-y-3 w-full">
      <div className="flex flex-wrap gap-2">
        {storedCategories.categories.work.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategorySelect(cat)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-accent-600 text-white'
                : 'bg-accent-100 text-accent-700 hover:bg-accent-200'
            }`}
          >
            {cat}
          </button>
        ))}
        {storedCategories.categories.personal.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategorySelect(cat)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-primary-600 text-white'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {selectedCategory === 'Other' && (
        <input
          type="text"
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          placeholder="Custom category"
          className="input w-full text-xs"
        />
      )}

      <div className="flex items-center gap-2">
        <textarea
          value={currentNote}
          onChange={(e) => setCurrentNote(e.target.value)}
          placeholder="Add note..."
          className="flex-1 border border-neutral-300 rounded p-1 text-xs resize-none h-16"
        />
        <button
          onClick={handleAddNote}
          disabled={!currentNote.trim()}
          className={`px-2 py-1 rounded ${currentNote.trim() ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-400'}`}
        >
          Add
        </button>
      </div>

      {ongoingNotes.length > 0 && (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {ongoingNotes.map((note) => (
            <div key={note.id} className="flex justify-between items-start text-xs bg-neutral-50 border border-neutral-200 p-1 rounded">
              <div className="mr-2 flex-1">{note.content}</div>
              <button onClick={() => handleDeleteNote(note.id)} className="text-neutral-400 hover:text-neutral-700">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        {selectedCategory && (
          <div className="text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-sm">
            {selectedCategory}
          </div>
        )}
        <Timer
          onSave={handleSaveActivity}
          selectedCategory={selectedCategory === 'Other' ? customCategory || 'Other' : selectedCategory}
          widgetMode={true}
          readFromStorage={true}
          writeToStorage={true}
        />
      </div>
    </div>
  );
};

export default TimerPopup;
