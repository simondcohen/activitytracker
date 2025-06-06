import { StoredCategories, CategoryGroup, defaultCategories } from './types';

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
  return getCategoryType(category, categories) === 'work' ? '#596273' : '#2f748e';
};