import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Save, Square, Trash2 } from 'lucide-react';
import { formatTime } from '../utils';
import { toISO, formatForDateTimeInput, parseFromDateTimeInput } from '../dateHelpers';
import {
  initTimerSync,
  addTimerSyncListener,
  broadcastTimerMessage,
  TimerSyncMessage,
  nextRevision,
  getCurrentRevision
} from '../utils/timerSync';

interface TimerProps {
  onSave: (duration: number, startTime: string, endTime: string) => void;
  selectedCategory: string | null;
  widgetMode?: boolean;
  manageStorage?: boolean; // defaults to true
  readFromStorage?: boolean;
  writeToStorage?: boolean;
}

interface TimerState {
  isRunning: boolean;
  startTime: string; // ISO UTC string
  lastCheckpoint: string; // ISO UTC string (unused)
  lastUpdate?: number;
  selectedCategory: string | null;
}

export const Timer: React.FC<TimerProps> = ({
  onSave,
  selectedCategory,
  widgetMode = false,
  manageStorage = true,
  readFromStorage = manageStorage,
  writeToStorage = manageStorage
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [startTime, setStartTime] = useState(toISO(new Date()));
  const [startTimeLocal, setStartTimeLocal] = useState(formatForDateTimeInput(toISO(new Date())));
  const revisionRef = useRef(0);
  const lastMsgRef = useRef<{ revision: number; timestamp: number }>({ revision: 0, timestamp: 0 });

  useEffect(() => {
    revisionRef.current = getCurrentRevision();
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
    lastMsgRef.current = { revision: msg.revision, timestamp: msg.timestamp };
    broadcastTimerMessage(msg);
  };

  const handleIncomingMessage = (msg: TimerSyncMessage) => {
    const last = lastMsgRef.current;
    if (
      msg.revision < last.revision ||
      (msg.revision === last.revision && msg.timestamp <= last.timestamp)
    ) {
      return;
    }
    lastMsgRef.current = { revision: msg.revision, timestamp: msg.timestamp };
    revisionRef.current = msg.revision;

    switch (msg.type) {
      case 'timer-start':
        if (msg.payload.startTime) {
          setStartTime(msg.payload.startTime);
          setStartTimeLocal(formatForDateTimeInput(msg.payload.startTime));
          const now = new Date();
          const start = new Date(msg.payload.startTime);
          if (!isNaN(start.getTime()) && !isNaN(now.getTime())) {
            const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
            setSeconds(Math.max(0, diff));
          }
        }
        setIsRunning(true);
        break;
      case 'timer-pause':
        setIsRunning(false);
        break;
      case 'timer-stop':
        setIsRunning(false);
        break;
      case 'timer-save':
      case 'timer-clear':
        setIsRunning(false);
        setSeconds(0);
        if (msg.payload.startTime) {
          setStartTime(msg.payload.startTime);
          setStartTimeLocal(formatForDateTimeInput(msg.payload.startTime));
        } else {
          const nowISO = toISO(new Date());
          setStartTime(nowISO);
          setStartTimeLocal(formatForDateTimeInput(nowISO));
        }
        break;
      default:
        break;
    }
  };
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    initTimerSync();
    const unsubscribe = addTimerSyncListener(handleIncomingMessage);
    return () => unsubscribe();
  }, []);

  // Load timer state from localStorage on component mount
  useEffect(() => {
    if (!readFromStorage) return;
    
    const savedTimer = localStorage.getItem('timerState');
    if (savedTimer) {
      const timerState: TimerState = JSON.parse(savedTimer);
      if (timerState.isRunning) {
        setIsRunning(true);
        setStartTime(timerState.startTime);
        setStartTimeLocal(formatForDateTimeInput(timerState.startTime));
        
        const now = new Date();
        const start = new Date(timerState.startTime);
        
        // Ensure we have valid dates before calculating difference
        if (!isNaN(start.getTime()) && !isNaN(now.getTime())) {
          const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
          // Use max to ensure we don't set negative seconds
          setSeconds(Math.max(0, diffInSeconds));
        }
      }
    }
  }, [readFromStorage]);

  // Interval updates for running timer
  useEffect(() => {
    let interval: number | undefined;
    
    if (isRunning) {
      interval = window.setInterval(() => {
        const now = new Date();
        const start = new Date(startTime);
        
        // Ensure we have valid dates before calculating difference
        if (!isNaN(start.getTime()) && !isNaN(now.getTime())) {
          const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
          // Use max to ensure we don't set negative seconds
          setSeconds(Math.max(0, diffInSeconds));
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  // Persist timer state periodically and on changes
  useEffect(() => {
    if (!writeToStorage) return;

    const saveState = () => {
      try {
        const state = {
          isRunning,
          startTime,
          selectedCategory,
          lastUpdate: Date.now()
        };
        localStorage.setItem('timerState', JSON.stringify(state));
      } catch {
        // ignore storage errors
      }
    };

    // save immediately whenever relevant values change
    saveState();

    let intervalId: number | undefined;
    if (isRunning) {
      intervalId = window.setInterval(saveState, 30000); // every 30s
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, startTime, selectedCategory, writeToStorage]);

  const handleStartStop = () => {
    if (!selectedCategory) {
      alert('Please select a category before starting the timer');
      return;
    }

    if (!isRunning) {
      // Only update start time if seconds is 0 (fresh start)
      if (seconds === 0) {
        const now = new Date();
        const start = new Date(startTime);
        
        // If date is invalid, use current date and time
        if (isNaN(start.getTime())) {
          const nowISO = toISO(now);
          setStartTime(nowISO);
          setStartTimeLocal(formatForDateTimeInput(nowISO));
          setSeconds(0);
          setIsRunning(true);
          return;
        }
        
        // If selected start time is in the future, reset to current time
        if (start > now) {
          const nowISO = toISO(now);
          setStartTime(nowISO);
          setStartTimeLocal(formatForDateTimeInput(nowISO));
        }
        
        // Calculate initial seconds if start time is in the past
        const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
        if (diffInSeconds > 0) {
          setSeconds(diffInSeconds);
        } else {
          setSeconds(0);
        }
      }
      setIsRunning(true);
      sendMessage('timer-start', { isRunning: true, startTime });
    } else {
      setIsRunning(false);
      sendMessage('timer-pause', { isRunning: false });
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    sendMessage('timer-stop', { isRunning: false });
  };

  const handleClear = () => {
    // Show confirmation dialog before clearing
    const confirmed = window.confirm("Are you sure you want to clear the timer? This action cannot be undone.");
    if (!confirmed) return;
    
    setIsRunning(false);
    setSeconds(0);
    const nowISO = toISO(new Date());
    setStartTime(nowISO);
    setStartTimeLocal(formatForDateTimeInput(nowISO));
    if (writeToStorage) {
      localStorage.removeItem('timerState');
    }
    sendMessage('timer-clear', { isRunning: false, startTime: nowISO });
  };

  const handleSave = () => {
    if (!selectedCategory) {
      alert('Please select a category before saving');
      return;
    }
    
    setIsRunning(false);
    const endTimeISO = toISO(new Date());
    
    onSave(
      seconds,
      startTime,
      endTimeISO
    );
    
    setSeconds(0);
    const nowISO = toISO(new Date());
    setStartTime(nowISO);
    setStartTimeLocal(formatForDateTimeInput(nowISO));
    if (writeToStorage) {
      localStorage.removeItem('timerState');
    }
    sendMessage('timer-save', { isRunning: false, startTime: nowISO });
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const localDateTimeStr = e.target.value;
    setStartTimeLocal(localDateTimeStr);
    
    try {
      // Convert from local datetime input to ISO UTC
      const timeISO = parseFromDateTimeInput(localDateTimeStr);
      setStartTime(timeISO);
      
      if (!isRunning) {
        const now = new Date();
        const start = new Date(timeISO);
        
        // If date is invalid, use current date
        if (isNaN(start.getTime())) {
          const nowISO = toISO(new Date());
          setStartTime(nowISO);
          setStartTimeLocal(formatForDateTimeInput(nowISO));
          return;
        }
        
        // If selected start time is in the future, reset to current time
        if (start > now) {
          const nowISO = toISO(new Date());
          setStartTime(nowISO);
          setStartTimeLocal(formatForDateTimeInput(nowISO));
          return;
        }
        
        const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
        setSeconds(Math.max(0, diffInSeconds));
      }
      sendMessage('timer-start', { isRunning, startTime: timeISO });
    } catch (error) {
      console.error('Invalid date time input:', error);
    }
  };

  if (widgetMode) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-base font-mono font-medium min-w-[3.5rem]">
          {formatTime(seconds)}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleStartStop}
            disabled={!selectedCategory}
            className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
            style={{ padding: 0 }}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          {isRunning && (
            <button
              onClick={handleStop}
              className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
              style={{ padding: 0 }}
            >
              <Square size={14} />
            </button>
          )}
          {seconds > 0 && (
            <button
              onClick={handleSave}
              disabled={!selectedCategory}
              className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
              style={{ padding: 0 }}
            >
              <Save size={14} />
            </button>
          )}
          {seconds > 0 && (
            <button
              onClick={handleClear}
              className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
              style={{ padding: 0 }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${
        widgetMode
          ? 'flex items-center gap-2 m-0 p-0 bg-transparent'
          : 'card mb-6'
      }`}
    >
      {!widgetMode && (
        <div className="text-neutral-600 text-center mb-2 date-display">
          {currentDate}
        </div>
      )}

      <div
        className={`font-mono timer-display ${widgetMode ? 'text-xl' : 'text-5xl font-semibold text-center my-4 text-primary-700'}`}
      >
        {formatTime(seconds)}
      </div>

      {!widgetMode && (
        <div className="grid grid-cols-1 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="startTime">
              Start Time
            </label>
            <input
              type="datetime-local"
              id="startTime"
              className="input"
              value={startTimeLocal}
              onChange={handleStartTimeChange}
              disabled={isRunning}
            />
          </div>
        </div>
      )}

      <div className={`flex ${widgetMode ? 'items-center gap-2' : 'justify-center space-x-3 mt-4'} timer-controls`}>
        <button
          onClick={handleStartStop}
          disabled={!selectedCategory}
          className={`btn ${
            isRunning
              ? 'bg-primary-100 text-primary-800 hover:bg-primary-200'
              : 'btn-primary'
          } flex items-center justify-center gap-1`}
        >
          {isRunning ? (
            <>
              <Pause size={18} />
              {!widgetMode && <span>Pause</span>}
            </>
          ) : (
            <>
              <Play size={18} />
              {!widgetMode && <span>Start</span>}
            </>
          )}
        </button>

        {isRunning && (
          <button
            onClick={handleStop}
            className="btn bg-neutral-100 text-neutral-700 hover:bg-neutral-200 flex items-center justify-center gap-1"
          >
            <Square size={18} />
            {!widgetMode && <span>Stop</span>}
          </button>
        )}

        {seconds > 0 && (
          <button
            onClick={handleSave}
            className="btn btn-primary flex items-center justify-center gap-1"
            disabled={!selectedCategory}
          >
            <Save size={18} />
            {!widgetMode && <span>Save</span>}
          </button>
        )}

        {seconds > 0 && (
          <button
            onClick={handleClear}
            className="btn bg-neutral-100 text-neutral-700 hover:bg-neutral-200 flex items-center justify-center gap-1"
          >
            <Trash2 size={18} />
            {!widgetMode && <span className="sr-only">Clear</span>}
          </button>
        )}
      </div>

      {!widgetMode && !selectedCategory && (
        <div className="mt-3 text-sm text-neutral-600 text-center">
          Please select a category to start tracking
        </div>
      )}
    </div>
  );
};
