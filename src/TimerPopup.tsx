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
    <div className="widget-mode flex items-center h-12 px-3 bg-white border-b gap-3 w-full min-w-[300px]">
      {selectedCategory && (
        <div className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
          {selectedCategory}
        </div>
      )}
      <Timer
        onSave={handleSaveActivity}
        selectedCategory={selectedCategory}
        widgetMode={true}
        readFromStorage={true}
        writeToStorage={false}
      />
    </div>
  );
};

export default TimerPopup;
