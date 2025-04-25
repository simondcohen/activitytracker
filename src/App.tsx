import React, { useState, useEffect } from 'react';
import { Timer } from './components/Timer';
import { ActivityList } from './components/ActivityList';
import { ManualActivityForm } from './components/ManualActivityForm';
import { CategoryManager } from './components/CategoryManager';
import { Activity, StoredCategories } from './types';
import { loadStoredCategories, saveCategories, getTodayDate, getDateString, filterByDate, fromLocalISOString } from './utils';
import { Plus, Download, Upload, Settings, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

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
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [showManualForm, setShowManualForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [storedCategories, setStoredCategories] = useState<StoredCategories>(loadStoredCategories());
  
  const handlePreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    const newDate = getDateString(date);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    const newDate = getDateString(date);
    setSelectedDate(newDate);
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

  const handleSaveActivity = (duration: number, date: string, startTime: string, endTime: string) => {
    if (!selectedCategory) {
      alert('Please select a category before saving');
      return;
    }

    // Extract the consistent date from the start time
    const activityDate = fromLocalISOString(startTime).toISOString().split('T')[0];

    const newActivity: Activity = {
      id: crypto.randomUUID(),
      category: selectedCategory === 'Other' ? customCategory || 'Other' : selectedCategory,
      date: activityDate,
      startTime,
      endTime,
      duration,
      notes: currentNotes,
    };

    setActivities(prev => [newActivity, ...prev]);
    setCurrentNotes('');
  };

  const handleUpdateActivity = (updatedActivity: Activity) => {
    // Extract the date from the start time to ensure date consistency
    const activityDate = fromLocalISOString(updatedActivity.startTime).toISOString().split('T')[0];
    
    const finalUpdatedActivity = {
      ...updatedActivity,
      date: activityDate
    };
    
    setActivities(prev => 
      prev.map(activity => 
        activity.id === updatedActivity.id ? finalUpdatedActivity : activity
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
    link.download = `activity-tracker-export-${getTodayDate()}.json`;
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
      setSelectedDate(getTodayDate());
    }
  };

  const validateImportedData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    if (!data.activities || !Array.isArray(data.activities)) return false;
    for (const activity of data.activities) {
      if (!activity.id || !activity.category || !activity.date || 
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

  const filteredActivities = activities.filter(activity => filterByDate(activity.startTime, selectedDate));

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Activity Tracker</h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowCategoryManager(true)}
              className="p-1.5 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
              title="Manage Categories"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={handleExportData}
              className="p-1.5 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
              title="Export Data"
            >
              <Download size={18} />
            </button>
            <label className="p-1.5 text-gray-700 hover:bg-gray-200 rounded-md transition-colors cursor-pointer" title="Import Data">
              <Upload size={18} />
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
            <button
              onClick={handleClearAllData}
              className="p-1.5 text-gray-700 hover:bg-red-100 rounded-md transition-colors"
              title="Clear All Data"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        {/* Two column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column: Timer and category selection */}
          <div className="flex flex-col space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Activity Category
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Work Activities</h3>
                  <div className="flex flex-wrap gap-2">
                    {storedCategories.categories.work.map((category) => (
                      <button
                        key={category}
                        onClick={() => handleCategorySelect(category)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === category
                            ? 'bg-green-500 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Personal Activities</h3>
                  <div className="flex flex-wrap gap-2">
                    {storedCategories.categories.personal.map((category) => (
                      <button
                        key={category}
                        onClick={() => handleCategorySelect(category)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === category
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
                
                {selectedCategory === 'Other' && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                )}
              </div>
            </div>

            <Timer onSave={handleSaveActivity} selectedCategory={selectedCategory} />
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Notes
              </label>
              <textarea
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                placeholder="Add notes for this session..."
                className="w-full px-3 py-2 border rounded-md h-24 resize-none"
              />
            </div>
          </div>

          {/* Right column: Activity log */}
          <div className="flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousDay}
                  className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                  title="Previous day"
                >
                  <ChevronLeft size={18} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border rounded-md"
                />
                <button
                  onClick={handleNextDay}
                  className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                  title="Next day"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <button
                onClick={() => setShowManualForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors text-sm"
              >
                <Plus size={16} />
                Add Activity
              </button>
            </div>

            <div className="flex-grow overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <ActivityList 
                activities={filteredActivities}
                onUpdate={handleUpdateActivity}
                onDelete={handleDeleteActivity}
                storedCategories={storedCategories}
              />
            </div>
          </div>
        </div>
      </div>

      {showManualForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleModalClick}>
          <ManualActivityForm
            onAdd={handleAddManualActivity}
            onClose={() => setShowManualForm(false)}
            storedCategories={storedCategories}
          />
        </div>
      )}

      {showCategoryManager && (
        <CategoryManager
          storedCategories={storedCategories}
          onUpdateCategories={handleUpdateCategories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </div>
  );
}