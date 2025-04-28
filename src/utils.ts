import { StoredCategories, CategoryGroup, defaultCategories } from './types';

// Create a consistent date formatter for the application
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour12: false
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

// Format seconds into HH:MM:SS
export const formatTime = (seconds: number, showSeconds: boolean = true): string => {
  // Handle negative time values by treating them as 0
  const totalSeconds = Math.max(0, seconds);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const pad = (num: number): string => num.toString().padStart(2, '0');

  if (showSeconds) {
    return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}`;
};

// Convert a Date object to ISO string while preserving local timezone
export const toLocalISOString = (date: Date): string => {
  return date.toISOString();
};

// Parse an ISO string to a Date object
export const fromLocalISOString = (iso: string): Date => {
  if (!iso) return new Date(); // Return current time if no date provided
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', iso);
      return new Date();
    }
    return date;
  } catch (error) {
    console.warn('Error parsing date:', error);
    return new Date();
  }
};

// Get today's date in YYYY-MM-DD format in local timezone
export const getTodayDate = (): string => {
  const now = new Date();
  return getDateString(now);
};

// Get date string in YYYY-MM-DD format for any date
export const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format a date string for display in the UI
export const formatDateTime = (dateString: string): string => {
  try {
    const date = fromLocalISOString(dateString);
    return timeFormatter.format(date);
  } catch (error) {
    console.warn('Error formatting date time:', error);
    return 'Invalid Time';
  }
};

// Format a time range for display
export const formatTimeRange = (startTime: string, endTime: string): string => {
  if (!startTime || !endTime) {
    return 'Invalid Time Range';
  }

  try {
    const start = fromLocalISOString(startTime);
    const end = fromLocalISOString(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Invalid Time Range';
    }

    return `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
  } catch (error) {
    console.warn('Error formatting time range:', error);
    return 'Invalid Time Range';
  }
};

// Format a date for datetime-local input
export const formatForDateTimeInput = (dateString: string): string => {
  try {
    const date = fromLocalISOString(dateString);
    return date.toISOString().slice(0, 16);
  } catch (error) {
    console.warn('Error formatting for datetime input:', error);
    return new Date().toISOString().slice(0, 16);
  }
};

// Parse a datetime-local input value to ISO string
export const parseFromDateTimeInput = (inputValue: string): string => {
  try {
    const date = new Date(inputValue);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date input');
    }
    return date.toISOString();
  } catch (error) {
    console.warn('Error parsing from datetime input:', error);
    throw error;
  }
};

// Calculate duration between two dates in seconds
export const calculateDuration = (startTime: string, endTime: string): number => {
  try {
    const start = fromLocalISOString(startTime);
    const end = fromLocalISOString(endTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    return duration >= 0 ? duration : 0;
  } catch (error) {
    console.warn('Error calculating duration:', error);
    return 0;
  }
};

// Filter function to check if a date matches a specific date string
export const filterByDate = (dateStr: string, targetDate: string): boolean => {
  try {
    const date = fromLocalISOString(dateStr);
    const dateString = date.toISOString().split('T')[0];
    return dateString === targetDate;
  } catch (error) {
    console.warn('Error filtering by date:', error);
    return false;
  }
};

// Load categories from localStorage or use defaults
export const loadStoredCategories = (): StoredCategories => {
  try {
    const saved = localStorage.getItem('storedCategories');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading categories from localStorage:', error);
  }
  return {
    categories: defaultCategories
  };
};

// Save categories to localStorage
export const saveCategories = (categories: StoredCategories) => {
  try {
    localStorage.setItem('storedCategories', JSON.stringify(categories));
  } catch (error) {
    console.error('Error saving categories to localStorage:', error);
  }
};

export const getCategoryType = (category: string, categories: CategoryGroup): 'work' | 'personal' => {
  if (categories.work.includes(category)) return 'work';
  return 'personal';
};

export const getCategoryColor = (category: string, categories: CategoryGroup): string => {
  return getCategoryType(category, categories) === 'work' ? 'green' : 'blue';
};