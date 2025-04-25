import React, { useState, useEffect } from 'react';
import { Play, Pause, Save, Square, Trash2 } from 'lucide-react';
import { formatTime, getTodayDate } from '../utils';

interface TimerProps {
  onSave: (duration: number, date: string, startTime: string, endTime: string) => void;
  selectedCategory: string | null;
}

interface TimerState {
  isRunning: boolean;
  startDate: string;
  startTime: string;
  lastCheckpoint: string;
  selectedCategory: string | null;
}

export const Timer: React.FC<TimerProps> = ({ onSave, selectedCategory }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [startDate, setStartDate] = useState(getTodayDate());
  const [startTime, setStartTime] = useState(getCurrentTimeString());
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  // Load timer state from localStorage on component mount
  useEffect(() => {
    const savedTimer = localStorage.getItem('timerState');
    if (savedTimer) {
      const timerState: TimerState = JSON.parse(savedTimer);
      if (timerState.isRunning) {
        setIsRunning(true);
        setStartDate(timerState.startDate);
        setStartTime(timerState.startTime);
        
        const now = new Date();
        const start = new Date(`${timerState.startDate}T${timerState.startTime}`);
        const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
        setSeconds(diffInSeconds);
      }
    }
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    if (isRunning) {
      const timerState: TimerState = {
        isRunning,
        startDate,
        startTime,
        lastCheckpoint: new Date().toISOString(),
        selectedCategory
      };
      localStorage.setItem('timerState', JSON.stringify(timerState));
    } else {
      localStorage.removeItem('timerState');
    }
  }, [isRunning, startDate, startTime, selectedCategory]);

  useEffect(() => {
    let interval: number | undefined;
    
    if (isRunning) {
      interval = window.setInterval(() => {
        const now = new Date();
        const start = new Date(`${startDate}T${startTime}`);
        const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
        setSeconds(diffInSeconds);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startDate, startTime]);

  const handleStartStop = () => {
    if (!selectedCategory) {
      alert('Please select a category before starting the timer');
      return;
    }

    if (!isRunning) {
      // Only update start time if seconds is 0 (fresh start)
      if (seconds === 0) {
        const now = new Date();
        const start = new Date(`${startDate}T${startTime}`);
        
        // If selected start time is in the future, reset to current time
        if (start > now) {
          setStartDate(getTodayDate());
          setStartTime(getCurrentTimeString());
        }
        
        // Calculate initial seconds if start time is in the past
        const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
        if (diffInSeconds > 0) {
          setSeconds(diffInSeconds);
        }
      }
    }
    setIsRunning(!isRunning);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleClear = () => {
    setIsRunning(false);
    setSeconds(0);
    setStartDate(getTodayDate());
    setStartTime(getCurrentTimeString());
    localStorage.removeItem('timerState');
  };

  const handleSave = () => {
    if (!selectedCategory) {
      alert('Please select a category before saving');
      return;
    }
    
    setIsRunning(false);
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date();
    
    onSave(
      seconds,
      startDate,
      startDateTime.toISOString(),
      endDateTime.toISOString()
    );
    
    setSeconds(0);
    setStartDate(getTodayDate());
    setStartTime(getCurrentTimeString());
    localStorage.removeItem('timerState');
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    setStartTime(timeValue);
    
    if (!isRunning) {
      const now = new Date();
      const start = new Date(`${startDate}T${timeValue}`);
      
      if (start > now) {
        setStartDate(getTodayDate());
      }
      
      const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
      setSeconds(Math.max(0, diffInSeconds));
    }
  };

  function getCurrentTimeString() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="text-center mb-4 text-gray-600">
        {currentDate}
      </div>
      
      <div className="text-6xl text-center mb-6 tracking-wider font-mono">
        {formatTime(seconds)}
      </div>
      
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        <button
          onClick={handleStartStop}
          className={`flex items-center gap-2 px-4 py-2 ${
            selectedCategory 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-gray-400 cursor-not-allowed'
          } text-white rounded transition-colors`}
          disabled={!selectedCategory}
          title={!selectedCategory ? 'Please select a category first' : ''}
        >
          {isRunning ? <Pause size={20} /> : <Play size={20} />}
          {isRunning ? 'Pause' : 'Start'}
        </button>
        
        <button
          onClick={handleStop}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={!isRunning}
        >
          <Square size={20} />
          Stop
        </button>
        
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={seconds === 0}
        >
          <Trash2 size={20} />
          Clear
        </button>
        
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 ${
            selectedCategory && seconds > 0
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-gray-400 cursor-not-allowed'
          } text-white rounded transition-colors`}
          disabled={!selectedCategory || seconds === 0}
          title={!selectedCategory ? 'Please select a category first' : ''}
        >
          <Save size={20} />
          Save
        </button>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Start Time
        </label>
        <input
          type="time"
          value={startTime}
          onChange={handleStartTimeChange}
          className="w-full px-3 py-2 border rounded-md"
          step="60"
        />
      </div>
    </div>
  );
};