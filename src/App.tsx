import React, { useState, useEffect, useRef } from 'react';
import { Timer } from './components/Timer';
import { ActivityList } from './components/ActivityList';
import { ManualActivityForm } from './components/ManualActivityForm';
import { CategoryManager } from './components/CategoryManager';
import { ExportOptionsForm } from './components/ExportOptionsForm';
import { Activity, StoredCategories, Note, TimestampEvent } from './types';
import { loadStoredCategories, saveCategories } from './utils';
import { toISO, isSameDay, getTodayISO } from './dateHelpers';
import { Plus, Download, Upload, Settings, ChevronLeft, ChevronRight, Trash2, Clipboard, MoreHorizontal, Flag, Check, X, Pencil, ExternalLink } from 'lucide-react';
import { format, subDays, addDays, parseISO, isValid } from 'date-fns';
import { ImportJsonForm } from './components/ImportJsonForm';
import { TimestampEventForm } from './components/TimestampEventForm';
import {
  initTimerSync,
  addTimerSyncListener,
  broadcastTimerMessage,
  TimerSyncMessage,
  nextRevision,
  getCurrentRevision
} from './utils/timerSync';
import { withActivitiesAtomic } from './utils/storage';

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
  const [ongoingNotes, setOngoingNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem('ongoingNotes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading ongoing notes:', e);
    }
    return [];
  });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [showManualForm, setShowManualForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showImportJsonForm, setShowImportJsonForm] = useState(false);
  const [showExportForm, setShowExportForm] = useState(false);
  const [showTimestampEventForm, setShowTimestampEventForm] = useState(false);
  const [storedCategories, setStoredCategories] = useState<StoredCategories>(loadStoredCategories());

  const popupRef = useRef<Window | null>(null);
  const revisionRef = useRef(0);
  const lastMsgRef = useRef<{ revision: number; timestamp: number }>({ revision: 0, timestamp: 0 });

  useEffect(() => {
    initTimerSync();
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

  const handleTimerMessage = (msg: TimerSyncMessage) => {
    const last = lastMsgRef.current;
    if (msg.revision < last.revision || (msg.revision === last.revision && msg.timestamp <= last.timestamp)) {
      return;
    }
    lastMsgRef.current = { revision: msg.revision, timestamp: msg.timestamp };
    revisionRef.current = msg.revision;
    if (msg.type === 'category-update') {
      setSelectedCategory(msg.payload.selectedCategory ?? null);
    }
  };

  useEffect(() => {
    const unsub = addTimerSyncListener(handleTimerMessage);
    return () => unsub();
  }, []);
  
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

  useEffect(() => {
    try {
      localStorage.setItem('ongoingNotes', JSON.stringify(ongoingNotes));
    } catch (error) {
      console.error('Error saving ongoing notes to localStorage:', error);
    }
  }, [ongoingNotes]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ongoingNotes') {
        if (e.newValue) {
          try {
            setOngoingNotes(JSON.parse(e.newValue));
          } catch (err) {
            console.error('Error parsing ongoing notes from storage:', err);
          }
        } else {
          setOngoingNotes([]);
        }
      }
      if (e.key === 'activities' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setActivities(parsed);
          }
        } catch (err) {
          console.error('Error parsing activities from storage:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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

  const handleEditNote = (noteId: string) => {
    const note = ongoingNotes.find(n => n.id === noteId);
    if (note) {
      setEditingNoteId(noteId);
      setEditingNoteContent(note.content);
    }
  };

  const handleSaveEditedNote = () => {
    if (!editingNoteId || !editingNoteContent.trim()) return;

    setOngoingNotes(prev => prev.map(note => 
      note.id === editingNoteId 
        ? { ...note, content: editingNoteContent }
        : note
    ));
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this note? This cannot be undone.')) {
      setOngoingNotes(prev => prev.filter(note => note.id !== noteId));
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
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
    withActivitiesAtomic((acts) => [newActivity, ...acts]);
    setCurrentNotes('');
    setOngoingNotes([]);
  };

  const handleUpdateActivity = (updatedActivity: Activity) => {
    setActivities(prev =>
      prev.map(activity =>
        activity.id === updatedActivity.id ? updatedActivity : activity
      )
    );
    withActivitiesAtomic((acts) =>
      acts.map((a) => (a.id === updatedActivity.id ? updatedActivity : a))
    );
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== id));
    withActivitiesAtomic((acts) => acts.filter((a) => a.id !== id));
  };

  const handleAddManualActivity = (activity: Activity) => {
    setActivities(prev => [activity, ...prev]);
    withActivitiesAtomic((acts) => [activity, ...acts]);
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

  const validateImportedData = (data: unknown): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    const dataObj = data as Record<string, unknown>;

    if (!dataObj.activities || !Array.isArray(dataObj.activities)) {
      console.error('Invalid or missing activities array');
      return false;
    }

    const isValidIso = (iso: unknown) => {
      if (typeof iso !== 'string') return false;
      const parsed = parseISO(iso);
      return isValid(parsed);
    };

    for (const activity of dataObj.activities) {
      if (
        !activity.id ||
        !activity.category ||
        !activity.startTime ||
        !activity.endTime ||
        typeof activity.duration !== 'number'
      ) {
        console.error('Invalid activity:', activity);
        return false;
      }

      if (!isValidIso(activity.startTime) || !isValidIso(activity.endTime)) {
        console.error('Invalid activity date:', activity);
        return false;
      }
    }

    if (dataObj.timestampEvents) {
      if (!Array.isArray(dataObj.timestampEvents)) {
        console.error('Invalid timestampEvents format');
        return false;
      }

      for (const event of dataObj.timestampEvents) {
        if (!event.id || !event.name || !event.timestamp) {
          console.error('Invalid timestamp event:', event);
          return false;
        }

        if (!isValidIso(event.timestamp)) {
          console.error('Invalid timestamp event date:', event);
          return false;
        }
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

      const dataObj = data as Record<string, unknown>;
      
      // Ensure each activity has a valid notes array before storing
      const validatedActivities = dataObj.activities.map((activity: Activity) => ({
        ...activity,
        notes: Array.isArray(activity.notes) ? activity.notes : []
      }));

      // Validate and restore timestamp events if present
      const validatedTimestampEvents = Array.isArray(dataObj.timestampEvents)
        ? dataObj.timestampEvents.map((event: TimestampEvent) => ({ ...event }))
        : [];

      localStorage.setItem('activities', JSON.stringify(validatedActivities));
      localStorage.setItem('timestampEvents', JSON.stringify(validatedTimestampEvents));

      if (dataObj.categories) {
        saveCategories(dataObj.categories);
        setStoredCategories(dataObj.categories);
      }

      setActivities(validatedActivities);
      setTimestampEvents(validatedTimestampEvents);

      if (validatedActivities.length > 0) {
        setSelectedDate(validatedActivities[0].startTime);
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
    try {
      const savedTimer = localStorage.getItem('timerState');
      const timerState = savedTimer ? JSON.parse(savedTimer) : {};
      const now = new Date();
      localStorage.setItem(
        'timerState',
        JSON.stringify({
          ...timerState,
          selectedCategory: category,
          isRunning: timerState.isRunning ?? false,
          startTime: timerState.startTime ?? toISO(now),
          lastCheckpoint: timerState.lastCheckpoint ?? toISO(now)
        })
      );
    } catch {
      // ignore storage errors
    }
    sendMessage('category-update', { selectedCategory: category });
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


  const handleImportActivities = (importedData: Activity[], importedTimestampEvents?: TimestampEvent[]) => {
    setActivities(prev => [...importedData, ...prev]);
    
    if (importedTimestampEvents && importedTimestampEvents.length > 0) {
      setTimestampEvents(prev => [...importedTimestampEvents, ...prev]);
    }
    
    setShowImportJsonForm(false);
  };

  const handleOpenPopup = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    let specs = 'width=350,height=250';
    try {
      const saved = localStorage.getItem('popupBounds');
      if (saved) {
        const { width, height, left, top } = JSON.parse(saved);
        specs = `width=${width},height=${height},left=${left},top=${top}`;
      }
    } catch {
      // ignore
    }

    const win = window.open('/popup', 'timerPopup', specs);
    if (win) {
      popupRef.current = win;
    } else {
      alert('Popup blocked');
    }
  };

  useEffect(() => {
    const handleUnload = () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-neutral-800">Timer</h2>
              <button
                onClick={handleOpenPopup}
                className="btn-icon bg-accent-50 text-accent-600 hover:bg-accent-100 flex items-center gap-2 px-3 py-2 transition-all duration-200 hover:shadow-md border border-accent-200 hover:border-accent-300"
                title="Open timer in floating window"
              >
                <ExternalLink size={16} />
                <span className="font-medium">Popup</span>
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Activity Type</label>
              <div className="space-y-3 max-h-64 overflow-y-auto">
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
                          {editingNoteId === note.id ? (
                            <div className="flex-1 flex gap-2">
                              <textarea
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                className="flex-1 px-2 py-1 border border-neutral-300 rounded-md text-sm resize-none"
                                rows={3}
                              />
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={handleSaveEditedNote}
                                  className="p-1 text-primary-600 hover:text-primary-800"
                                  title="Save"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-1 text-neutral-400 hover:text-neutral-600"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-sm text-neutral-700 mr-2 flex-1">{note.content}</div>
                              <div className="flex items-center gap-1">
                                <div className="text-xs text-neutral-500">
                                  {format(new Date(note.timestamp), 'h:mm a')}
                                </div>
                                <button
                                  onClick={() => handleEditNote(note.id)}
                                  className="p-1 text-neutral-400 hover:text-neutral-600"
                                  title="Edit note"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="p-1 text-neutral-400 hover:text-neutral-600"
                                  title="Delete note"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Timer
              onSave={handleSaveActivity}
              selectedCategory={selectedCategory}
            />
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