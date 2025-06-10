import React, { useEffect, useState } from 'react';
import { Timer } from './components/Timer';
import { Activity, Note } from './types';
import { toISO } from './dateHelpers';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';

const TimerPopup: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  const [ongoingNotes, setOngoingNotes] = useState<Note[]>([]);

  useEffect(() => {
    const savedTimer = localStorage.getItem('timerState');
    if (savedTimer) {
      try {
        const timerState = JSON.parse(savedTimer);
        setSelectedCategory(timerState.selectedCategory || null);
      } catch {
        // ignore parse errors
      }
    }
    const savedNotes = localStorage.getItem('ongoingNotes');
    if (savedNotes) {
      try {
        setOngoingNotes(JSON.parse(savedNotes));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ongoingNotes', JSON.stringify(ongoingNotes));
  }, [ongoingNotes]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'timerState' && e.newValue) {
        try {
          const timerState = JSON.parse(e.newValue);
          setSelectedCategory(timerState.selectedCategory || null);
        } catch {
          // ignore parse errors
        }
      }
      if (e.key === 'ongoingNotes') {
        if (e.newValue) {
          try {
            setOngoingNotes(JSON.parse(e.newValue));
          } catch {
            // ignore parse errors
          }
        } else {
          setOngoingNotes([]);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleSaveNote = () => {
    if (!currentNotes.trim()) return;
    const newNote: Note = {
      id: crypto.randomUUID(),
      content: currentNotes,
      timestamp: toISO(new Date())
    };
    setOngoingNotes(prev => [...prev, newNote]);
    setCurrentNotes('');
  };

  const handleSaveActivity = (duration: number, startTime: string, endTime: string) => {
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
      duration,
      notes: ongoingNotes
    };
    const updated = [newActivity, ...activities];
    localStorage.setItem('activities', JSON.stringify(updated));
    setOngoingNotes([]);
    setCurrentNotes('');
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
    <div className="p-4 w-full h-full overflow-y-auto">
      <h2 className="text-lg font-medium text-neutral-800 mb-2">Timer Popup</h2>
      <div className="text-sm text-neutral-600 mb-4">
        {selectedCategory ? `Category: ${selectedCategory}` : 'No category selected'}
      </div>
      <Timer onSave={handleSaveActivity} selectedCategory={selectedCategory} />
      <div className="mt-4">
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Notes
        </label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <textarea
              value={currentNotes}
              onChange={(e) => setCurrentNotes(e.target.value)}
              placeholder="Add a note for the current activity..."
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-md h-20 resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              onClick={handleSaveNote}
              disabled={!currentNotes.trim()}
              className={`self-start p-2 rounded-md ${currentNotes.trim() ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
            >
              <Plus size={20} />
            </button>
          </div>
          {ongoingNotes.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-neutral-50 rounded-md border border-neutral-200">
              {ongoingNotes.map(note => (
                <div key={note.id} className="text-sm text-neutral-700 flex justify-between">
                  <span>{note.content}</span>
                  <span className="text-xs text-neutral-500 ml-2">
                    {format(new Date(note.timestamp), 'h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimerPopup;
