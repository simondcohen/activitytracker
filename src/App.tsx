import React, { useState, useEffect } from 'react';
import { Timer } from './components/Timer';
import { ActivityList } from './components/ActivityList';
import { ManualActivityForm } from './components/ManualActivityForm';
import { CategoryManager } from './components/CategoryManager';
import { ExportOptionsForm } from './components/ExportOptionsForm';
import { Activity, StoredCategories, Note, TimestampEvent } from './types';
import { loadStoredCategories, saveCategories } from './utils';
import { toISO, formatClock, toLocal, isSameDay, getTodayISO, formatForDateTimeInput, parseFromDateTimeInput, calculateDuration } from './dateHelpers';
import { Plus, Download, Upload, Settings, ChevronLeft, ChevronRight, Trash2, Clipboard, MoreHorizontal, Flag } from 'lucide-react';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { ImportJsonForm } from './components/ImportJsonForm';
import { TimestampEventForm } from './components/TimestampEventForm';

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
  const [ongoingNotes, setOngoingNotes] = useState<Note[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [showManualForm, setShowManualForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showImportJsonForm, setShowImportJsonForm] = useState(false);
  const [showExportForm, setShowExportForm] = useState(false);
  const [showTimestampEventForm, setShowTimestampEventForm] = useState(false);
  const [storedCategories, setStoredCategories] = useState<StoredCategories>(loadStoredCategories());
  
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem('activities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Ensure each activity has a valid notes array
          return parsed.map(activity => ({
            ...activity,
            notes: Array.isArray(activity.notes) ? activity.notes : []
          }));
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading activities from localStorage:', error);
      return [];
    }
  });
  
  const [timestampEvents, setTimestampEvents] = useState<TimestampEvent[]>(() => {
    try {
      const saved = localStorage.getItem('timestampEvents');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (error) {
      console.error('Error loading timestamp events from localStorage:', error);
      return [];
    }
  });

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

  useEffect(() => {
    try {
      localStorage.setItem('activities', JSON.stringify(activities));
    } catch (error) {
      console.error('Error saving activities to localStorage:', error);
    }
  }, [activities]);
  
  useEffect(() => {
    try {
      localStorage.setItem('timestampEvents', JSON.stringify(timestampEvents));
    } catch (error) {
      console.error('Error saving timestamp events to localStorage:', error);
    }
  }, [timestampEvents]);

  const handleUpdateCategories = (newCategories: StoredCategories) => {
    setStoredCategories(newCategories);
    saveCategories(newCategories);
  };

  const handleSaveNote = () => {
    if (!currentNotes.trim()) return;
    
    const newNote: Note = {
      id: crypto.randomUUID(),
      content: currentNotes,
      timestamp: toISO(new Date())
    };
    
    setOngoingNotes(prev => [...prev, newNote]);
    setCurrentNotes('');
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
      notes: ongoingNotes
    };

    setActivities(prev => [newActivity, ...prev]);
    setCurrentNotes('');
    setOngoingNotes([]);
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

  const handleAddTimestampEvent = (event: TimestampEvent) => {
    setTimestampEvents(prev => [event, ...prev]);
    setShowTimestampEventForm(false);
  };

  const handleUpdateTimestampEvent = (updatedEvent: TimestampEvent) => {
    setTimestampEvents(prev => 
      prev.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
  };

  const handleDeleteTimestampEvent = (id: string) => {
    setTimestampEvents(prev => prev.filter(event => event.id !== id));
  };

  const handleExportData = () => {
    const data = {
      activities,
      timestampEvents,
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
      setTimestampEvents([]);
      setStoredCategories(loadStoredCategories());
      setSelectedCategory(null);
      setCustomCategory('');
      setCurrentNotes('');
      setSelectedDate(getTodayISO());
    }
  };

  const validateImportedData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    if (!data.activities || !Array.isArray(data.activities)) {
      console.error('Invalid or missing activities array');
      return false;
    }
    
    for (const activity of data.activities) {
      if (!activity.id || !activity.category || 
          !activity.startTime || !activity.endTime || 
          typeof activity.duration !== 'number') {
        console.error('Invalid activity:', activity);
        return false;
      }
    }
    
    // Timestamp events validation is optional for backward compatibility
    if (data.timestampEvents && !Array.isArray(data.timestampEvents)) {
      console.error('Invalid timestampEvents format');
      return false;
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

      // Ensure each activity has a valid notes array before storing
      const validatedActivities = data.activities.map((activity: Activity) => ({
        ...activity,
        notes: Array.isArray(activity.notes) ? activity.notes : []
      }));

      localStorage.setItem('activities', JSON.stringify(validatedActivities));
      
      if (data.categories) {
        saveCategories(data.categories);
        setStoredCategories(data.categories);
      }

      setActivities(validatedActivities);

      if (validatedActivities.length > 0) {
        setSelectedDate(validatedActivities[0].date);
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
      setShowImportJsonForm(false);
      setShowExportForm(false);
      setShowTimestampEventForm(false);
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

  // Filter activities to show only those for the selected day
  // Note: Days are defined as starting at 4am rather than midnight,
  // so activities between midnight and 4am are grouped with the previous calendar day
  const filteredActivities = activities.filter(activity => {
    try {
      return isSameDay(activity.startTime, selectedDate);
    } catch (error) {
      console.error('Error filtering activities by date:', error);
      return false;
    }
  });

  // Filter timestamp events for the selected date
  const filteredTimestampEvents = timestampEvents.filter(event => 
    isSameDay(event.timestamp, selectedDate)
  );

  const displayDate = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');

  const handleCopyDayToClipboard = () => {
    const dataToExport = {
      date: selectedDate,
      activities: filteredActivities,
      exportTimestamp: new Date().toISOString()
    };
    
    navigator.clipboard.writeText(JSON.stringify(dataToExport, null, 2))
      .then(() => {
        alert('Day activities copied to clipboard as JSON');
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy to clipboard');
      });
  };

  const handleDownloadDayAsJson = () => {
    const dataToExport = {
      date: selectedDate,
      activities: filteredActivities,
      exportTimestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const formattedDate = format(parseISO(selectedDate), 'yyyy-MM-dd');
    link.download = `activity-tracker-day-${formattedDate}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportActivities = (importedData: Activity[], importedTimestampEvents?: TimestampEvent[]) => {
    setActivities(prev => [...importedData, ...prev]);
    
    if (importedTimestampEvents && importedTimestampEvents.length > 0) {
      setTimestampEvents(prev => [...importedTimestampEvents, ...prev]);
    }
    
    setShowImportJsonForm(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white p-4 rounded-lg shadow-sm border border-neutral-200 mb-6 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-neutral-800">Activity Tracker</h1>
          <div className="flex gap-2">
            <button
              onClick={handleExportData}
              className="p-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 rounded-full transition-colors"
              title="Export Data"
            >
              <Download size={18} />
            </button>
            <label className="p-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 rounded-full cursor-pointer transition-colors" title="Import Data">
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
              className="p-2 bg-accent-50 text-accent-600 hover:bg-accent-100 rounded-full transition-colors"
              title="Manage Categories"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={handleClearAllData}
              className="p-2 bg-neutral-100 text-neutral-600 hover:text-red-600 hover:bg-neutral-200 rounded-full transition-colors"
              title="Clear All Data"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left panel - Timer */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-neutral-800 mb-4">Timer</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Activity Type</label>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Work Activities</h3>
                  <div className="flex flex-wrap gap-2">
                    {storedCategories.categories.work.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategorySelect(cat)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === cat
                            ? 'bg-accent-600 text-white'
                            : 'bg-accent-100 text-accent-700 hover:bg-accent-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Personal Activities</h3>
                  <div className="flex flex-wrap gap-2">
                    {storedCategories.categories.personal.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategorySelect(cat)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === cat
                            ? 'bg-primary-600 text-white'
                            : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
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
                    className="input"
                  />
                </div>
              )}
            </div>
            
            <Timer
              onSave={handleSaveActivity}
              selectedCategory={selectedCategory}
            />
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Notes
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <textarea
                    value={currentNotes}
                    onChange={(e) => setCurrentNotes(e.target.value)}
                    placeholder="Add a note for the current activity..."
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-md h-20 resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={handleSaveNote}
                    disabled={!currentNotes.trim()}
                    className={`self-start p-2 rounded-md ${currentNotes.trim() ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                  >
                    <Plus size={20} />
                  </button>
                </div>
                {ongoingNotes.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <h4 className="text-xs font-medium text-neutral-500">Added Notes</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-neutral-50 rounded-md border border-neutral-200">
                      {ongoingNotes.map((note) => (
                        <div key={note.id} className="flex justify-between items-start p-2 bg-white rounded border border-neutral-200">
                          <div className="text-sm text-neutral-700 mr-2 flex-1">{note.content}</div>
                          <div className="text-xs text-neutral-500">
                            {format(new Date(note.timestamp), 'h:mm a')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right panel - Activity History */}
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-neutral-800">Activity History</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExportForm(true)}
                  className="btn-icon"
                  title="Export options"
                >
                  <Clipboard size={16} />
                  <span>Export</span>
                  <MoreHorizontal size={14} />
                </button>
                <button
                  onClick={() => setShowImportJsonForm(true)}
                  className="btn-icon"
                  title="Import activities from JSON"
                >
                  <Upload size={16} />
                  <span>Import</span>
                </button>
                <div className="flex">
                  <button
                    onClick={() => setShowTimestampEventForm(true)}
                    className="btn-icon"
                    title="Add timestamp event"
                  >
                    <Flag size={16} />
                    <span>Event</span>
                  </button>
                  <button
                    onClick={() => setShowManualForm(true)}
                    className="btn-icon bg-primary-600 text-white hover:bg-primary-700"
                    title="Add activity manually"
                  >
                    <Plus size={16} />
                    <span>Activity</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-4 px-4 py-2 bg-neutral-50 rounded-md border border-neutral-200">
              <button
                onClick={handlePreviousDay}
                className="p-1 text-neutral-600 hover:bg-neutral-200 rounded-full"
              >
                <ChevronLeft size={24} />
              </button>
              <h3 className="text-md font-medium text-neutral-800">{displayDate}</h3>
              <button
                onClick={handleNextDay}
                className="p-1 text-neutral-600 hover:bg-neutral-200 rounded-full"
              >
                <ChevronRight size={24} />
              </button>
            </div>
            
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
              <ActivityList
                activities={filteredActivities}
                timestampEvents={filteredTimestampEvents}
                onUpdateActivity={handleUpdateActivity}
                onDeleteActivity={handleDeleteActivity}
                onUpdateTimestampEvent={handleUpdateTimestampEvent}
                onDeleteTimestampEvent={handleDeleteTimestampEvent}
                storedCategories={storedCategories}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Manual Activity Form Modal */}
      {showManualForm && (
        <div
          className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-10"
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
        <CategoryManager
          storedCategories={storedCategories}
          onUpdateCategories={handleUpdateCategories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
      
      {/* Import JSON Form Modal */}
      {showImportJsonForm && (
        <div
          className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-10"
          onClick={handleModalClick}
        >
          <ImportJsonForm
            onImport={handleImportActivities}
            onClose={() => setShowImportJsonForm(false)}
            storedCategories={storedCategories}
          />
        </div>
      )}

      {/* Export Options Modal */}
      {showExportForm && (
        <div
          className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-10"
          onClick={handleModalClick}
        >
          <ExportOptionsForm
            activities={activities}
            timestampEvents={timestampEvents}
            storedCategories={storedCategories}
            currentDate={selectedDate}
            onClose={() => setShowExportForm(false)}
          />
        </div>
      )}

      {/* Timestamp Event Form Modal */}
      {showTimestampEventForm && (
        <div
          className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-10"
          onClick={handleModalClick}
        >
          <TimestampEventForm
            onAdd={handleAddTimestampEvent}
            onClose={() => setShowTimestampEventForm(false)}
          />
        </div>
      )}
    </div>
  );
}