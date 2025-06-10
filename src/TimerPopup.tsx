import React, { useEffect, useState, useRef } from 'react';
import { Timer } from './components/Timer';
import { Activity } from './types';

const TimerPopup: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastKnownCategory = useRef<string | null>(null);

  // Helper to read selected category from timerState in localStorage
  const loadCategory = () => {
    const savedTimer = localStorage.getItem('timerState');
    let categoryFromStorage: string | null = null;
    
    if (savedTimer) {
      try {
        const timerState = JSON.parse(savedTimer);
        categoryFromStorage = timerState.selectedCategory || null;
      } catch {
        categoryFromStorage = null;
      }
    }
    
    // Only update state if the category has actually changed
    if (categoryFromStorage !== lastKnownCategory.current) {
      lastKnownCategory.current = categoryFromStorage;
      setSelectedCategory(categoryFromStorage);
    }
    
    return categoryFromStorage;
  };

  // Periodic sync check - runs every 500ms while popup is open
  const startPeriodicSync = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      loadCategory();
    }, 500);
  };

  const stopPeriodicSync = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    // Initial load
    loadCategory();
    
    // Start periodic sync
    startPeriodicSync();
    
    // Listen for storage events (backup mechanism)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'timerState') {
        loadCategory();
      }
    };
    
    // Listen for window focus events to ensure sync when user switches between windows
    const handleFocus = () => {
      loadCategory();
    };
    
    // Listen for visibility change (when tab becomes visible)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadCategory();
      }
    };
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup function
    return () => {
      stopPeriodicSync();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Also check for category changes when the window becomes visible or gets focus
  useEffect(() => {
    const handlePageShow = () => {
      loadCategory();
    };
    
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
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
    <div className="p-4 w-full h-full flex flex-col items-center justify-center space-y-4 min-w-[300px]">
      {selectedCategory ? (
        <div className="text-lg font-semibold text-center">
          {selectedCategory}
        </div>
      ) : (
        <div className="text-sm text-neutral-600 text-center">
          Please select a category in the main window
        </div>
      )}
      <Timer onSave={handleSaveActivity} selectedCategory={selectedCategory} />
    </div>
  );
};

export default TimerPopup;
