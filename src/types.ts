export interface Activity {
  id: string;
  category: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  duration: number; // in seconds
  notes?: string;
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