export interface Activity {
  id: string;
  category: string;
  startTime: string; // ISO-8601 string in UTC
  endTime: string; // ISO-8601 string in UTC
  duration: number; // in seconds
  notes?: Note[];
}

export interface Note {
  id: string;
  content: string;
  timestamp: string; // ISO-8601 string in UTC
}

export interface CategoryGroup {
  work: string[];
  personal: string[];
}

export interface StoredCategories {
  categories: CategoryGroup;
}

export interface AppState {
  activities: Activity[];
  categories: StoredCategories;
}

export interface HistoryEntry {
  timestamp: string;
  state: AppState;
}

export const defaultCategories: CategoryGroup = {
  work: [
    'QE work',
    'SFCV work',
    'Teaching work',
    'Other work'
  ],
  personal: [
    'Personal admin',
    'AI/coding',
    'Other'
  ]
};