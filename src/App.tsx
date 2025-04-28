import React, { useState, useEffect } from 'react';
import { Timer } from './components/Timer';
import { ActivityList } from './components/ActivityList';
import { ManualActivityForm } from './components/ManualActivityForm';
import { CategoryManager } from './components/CategoryManager';
import { Activity, StoredCategories } from './types';
import { loadStoredCategories, saveCategories } from './utils';
import { toISO, formatClock, toLocal, isSameDay, getTodayISO } from './dateHelpers';
import { Plus, Download, Upload, Settings, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { format, subDays, addDays, parseISO } from 'date-fns';

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    const savedTimer = localStorage.getItem('timerState');
    if (savedTimer) {
      const timerState = JSON.parse(savedTimer);
      return timerState.selectedCategory || null;
    }
    return null;
  });
  const [customCategory, setCustomCategory] = useState('');
  const [currentNotes, setCurrentNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [showManualForm, setShowManualForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [storedCategories, setStoredCategories] = useState<StoredCategories>(loadStoredCategories());
  
  const handlePreviousDay = () => {
    try {
      const date = parseISO(selectedDate);
      const previousDay = subDays(date, 1);
      setSelectedDate(toISO(previousDay));
    } catch (error) {
      console.error('Error navigating to previous day:', error);
    }
  };

  const handleNextDay = () => {
    try {
      const date = parseISO(selectedDate);
      const nextDay = addDays(date, 1);
      setSelectedDate(toISO(nextDay));
    } catch (error) {
      console.error('Error navigating to next day:', error);
    }
  };

  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem('activities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading activities from localStorage:', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('activities', JSON.stringify(activities));
    } catch (error) {
      console.error('Error saving activities to localStorage:', error);
    }
  }, [activities]);

  const handleUpdateCategories = (newCategories: StoredCategories) => {
    setStoredCategories(newCategories);
    saveCategories(newCategories);
  };

  const handleSaveActivity = (duration: number, startTime: string, endTime: string) => {
    if (!selectedCategory) {
      alert('Please select a category before saving');
      return;
    }

    const newActivity: Activity = {
      id: crypto.randomUUID(),
      category: selectedCategory === 'Other' ? customCategory || 'Other' : selectedCategory,
      startTime,
      endTime,
      duration,
      notes: currentNotes,
    };

    setActivities(prev => [newActivity, ...prev]);
    setCurrentNotes('');
  };

  const handleUpdateActivity = (updatedActivity: Activity) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === updatedActivity.id ? updatedActivity : activity
      )
    );
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== id));
  };

  const handleAddManualActivity = (activity: Activity) => {
    setActivities(prev => [activity, ...prev]);
    setShowManualForm(false);
  };

  const handleExportData = () => {
    const data = {
      activities,
      categories: storedCategories,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const formattedDate = format(new Date(), 'yyyy-MM-dd');
    link.download = `activity-tracker-export-${formattedDate}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone!')) {
      localStorage.clear();
      setActivities([]);
      setStoredCategories(loadStoredCategories());
      setSelectedCategory(null);
      setCustomCategory('');
      setCurrentNotes('');
      setSelectedDate(getTodayISO());
    }
  };

  const validateImportedData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    if (!data.activities || !Array.isArray(data.activities)) return false;
    for (const activity of data.activities) {
      if (!activity.id || !activity.category || 
          !activity.startTime || !activity.endTime || 
          typeof activity.duration !== 'number') {
        console.error('Invalid activity:', activity);
        return false;
      }
    }
    
    return true;
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!validateImportedData(data)) {
        throw new Error('Invalid data format');
      }

      localStorage.clear();

      localStorage.setItem('activities', JSON.stringify(data.activities));
      
      if (data.categories) {
        saveCategories(data.categories);
        setStoredCategories(data.categories);
      }

      setActivities(data.activities);

      if (data.activities.length > 0) {
        setSelectedDate(data.activities[0].date);
      }
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Error importing data. Please make sure the file is valid.');
    }
    event.target.value = '';
  };

  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowManualForm(false);
      setShowCategoryManager(false);
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    // Update timer state with the new category
    const savedTimer = localStorage.getItem('timerState');
    if (savedTimer) {
      const timerState = JSON.parse(savedTimer);
      localStorage.setItem('timerState', JSON.stringify({
        ...timerState,
        selectedCategory: category
      }));
    }
  };

  const filteredActivities = activities.filter(activity => {
    try {
      return isSameDay(activity.startTime, selectedDate);
    } catch (error) {
      console.error('Error filtering activities by date:', error);
      return false;
    }
  });

  const displayDate = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-6">
          <header className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold">Activity Tracker</h1>
              <div className="flex gap-2">
                <button
                  onClick={handleExportData}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                  title="Export Data"
                >
                  <Download size={18} />
                </button>
                <label className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 cursor-pointer" title="Import Data">
                  <Upload size={18} />
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    onChange={handleImportData}
                  />
                </label>
                <button
                  onClick={() => setShowCategoryManager(true)}
                  className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600"
                  title="Manage Categories"
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={handleClearAllData}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  title="Clear All Data"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Activity</label>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Work Activities</h3>
                  <div className="flex flex-wrap gap-2">
                    {storedCategories.categories.work.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategorySelect(cat)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === cat
                            ? 'bg-green-500 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Personal Activities</h3>
                  <div className="flex flex-wrap gap-2">
                    {storedCategories.categories.personal.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategorySelect(cat)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === cat
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {selectedCategory === 'Other' && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Custom category name"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                placeholder="Add notes for the current activity..."
                className="w-full px-3 py-2 border rounded-md h-20 resize-none"
              />
            </div>
            
            <Timer
              onSave={handleSaveActivity}
              selectedCategory={selectedCategory}
            />
          </header>
          
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Activity History</h2>
              <button
                onClick={() => setShowManualForm(true)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                <Plus size={16} />
                Add Manually
              </button>
            </div>
            
            <div className="flex items-center justify-between mb-4 px-4 py-2 bg-gray-50 rounded-md">
              <button
                onClick={handlePreviousDay}
                className="p-1 hover:bg-gray-200 rounded-full"
              >
                <ChevronLeft size={24} />
              </button>
              <h3 className="text-lg font-medium">{displayDate}</h3>
              <button
                onClick={handleNextDay}
                className="p-1 hover:bg-gray-200 rounded-full"
              >
                <ChevronRight size={24} />
              </button>
            </div>
            
            <ActivityList
              activities={filteredActivities}
              onUpdate={handleUpdateActivity}
              onDelete={handleDeleteActivity}
              storedCategories={storedCategories}
            />
          </div>
        </div>
      </div>
      
      {/* Manual Activity Form Modal */}
      {showManualForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10"
          onClick={handleModalClick}
        >
          <ManualActivityForm
            onAdd={handleAddManualActivity}
            onClose={() => setShowManualForm(false)}
            storedCategories={storedCategories}
          />
        </div>
      )}
      
      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10"
          onClick={handleModalClick}
        >
          <CategoryManager
            storedCategories={storedCategories}
            onUpdateCategories={handleUpdateCategories}
            onClose={() => setShowCategoryManager(false)}
          />
        </div>
      )}
    </div>
  );
}