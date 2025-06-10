import React, { useEffect, useState, useRef } from 'react';
import { Timer } from './components/Timer';
import { Activity } from './types';
import { initTimerSync, addTimerSyncListener, TimerSyncMessage } from './utils/timerSync';

const TimerPopup: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const lastMsgRef = useRef<{ revision: number; timestamp: number }>({ revision: 0, timestamp: 0 });

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
    if (msg.type === 'category-update') {
      setSelectedCategory(msg.payload.selectedCategory ?? null);
    }
  };

  useEffect(() => {
    initTimerSync();
    const unsub = addTimerSyncListener(handleMessage);
    return () => unsub();
  }, []);

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
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-primary-50 via-neutral-50 to-accent-50 widget-mode">
      <div className="w-full h-full flex flex-col items-center justify-center space-y-6 min-w-[300px] p-6">
        {/* Header section with branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-full shadow-lg mb-2 transition-transform duration-300 hover:scale-105">
            <div className="w-6 h-6 bg-white rounded-full opacity-90 transition-opacity duration-300 hover:opacity-100"></div>
          </div>
          <h1 className="text-lg font-semibold text-neutral-800 tracking-tight">Activity Timer</h1>
        </div>

        {/* Category display section */}
        <div className="w-full max-w-sm">
          {selectedCategory ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-4 text-center">
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                Current Activity
              </div>
              <div className="text-xl font-semibold text-primary-700 category-display">
                {selectedCategory}
              </div>
            </div>
          ) : (
            <div className="bg-neutral-100/80 backdrop-blur-sm rounded-xl border border-neutral-200/50 shadow-sm p-4 text-center">
              <div className="text-sm text-neutral-600">
                Please select a category in the main window
              </div>
            </div>
          )}
        </div>

        {/* Timer section */}
        <div className="w-full max-w-sm bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-xl p-4">
          <Timer
            onSave={handleSaveActivity}
            selectedCategory={selectedCategory}
            widgetMode={true}
            readFromStorage={true}
            writeToStorage={false}
          />
        </div>

        {/* Footer with subtle branding */}
        <div className="text-xs text-neutral-400 font-medium">
          Activity Tracker
        </div>
      </div>
    </div>
  );
};

export default TimerPopup;
