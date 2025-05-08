import React, { useState } from 'react';
import { Activity, StoredCategories, Note } from '../types';
import { 
  formatTime, 
  getCategoryColor
} from '../utils';
import { 
  formatClock,
  formatRange,
  toLocal,
  formatForDateTimeInput,
  parseFromDateTimeInput,
  calculateDuration,
  isSameDay
} from '../dateHelpers';
import { Pencil, Save, Trash2, X, ChevronDown, ChevronUp, Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityListProps {
  activities: Activity[];
  onUpdate: (activity: Activity) => void;
  onDelete: (id: string) => void;
  storedCategories: StoredCategories;
}

export const ActivityList: React.FC<ActivityListProps> = ({ 
  activities, 
  onUpdate, 
  onDelete,
  storedCategories
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    id: string;
    category: string;
    startDateTime: string;
    endDateTime: string;
    notes?: Note[];
  } | null>(null);

  const handleEdit = (activity: Activity) => {
    setEditingId(activity.id);
    
    // Format ISO date strings to local datetime-local input format
    setEditForm({
      id: activity.id,
      category: activity.category,
      startDateTime: formatForDateTimeInput(activity.startTime),
      endDateTime: formatForDateTimeInput(activity.endTime),
      notes: activity.notes
    });
  };

  const handleSave = () => {
    if (!editForm) return;

    try {
      // Convert local datetime strings back to ISO strings in UTC
      const startTimeISO = parseFromDateTimeInput(editForm.startDateTime);
      const endTimeISO = parseFromDateTimeInput(editForm.endDateTime);
      
      // Calculate duration
      const duration = calculateDuration(startTimeISO, endTimeISO);
      
      if (duration <= 0) {
        alert('End time must be after start time');
        return;
      }

      const updatedActivity: Activity = {
        id: editForm.id,
        category: editForm.category,
        startTime: startTimeISO,
        endTime: endTimeISO,
        duration,
        notes: editForm.notes || []
      };

      onUpdate(updatedActivity);
      setEditingId(null);
      setEditForm(null);
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Error saving activity. Please check the time format.');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleViewNotes = (activityId: string) => {
    setSelectedActivityId(activityId);
  };

  const handleCloseNotes = () => {
    setSelectedActivityId(null);
  };

  const handleAddNote = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    const newNote: Note = {
      id: crypto.randomUUID(),
      content: '',
      timestamp: new Date().toISOString()
    };

    const updatedActivity: Activity = {
      ...activity,
      notes: [...(activity.notes || []), newNote]
    };

    onUpdate(updatedActivity);
  };

  const handleUpdateNote = (activityId: string, noteId: string, content: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity || !activity.notes) return;

    const updatedNotes = activity.notes.map(note => 
      note.id === noteId ? { ...note, content } : note
    );

    const updatedActivity: Activity = {
      ...activity,
      notes: updatedNotes
    };

    onUpdate(updatedActivity);
  };

  const handleDeleteNote = (activityId: string, noteId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity || !activity.notes) return;

    const updatedNotes = activity.notes.filter(note => note.id !== noteId);

    const updatedActivity: Activity = {
      ...activity,
      notes: updatedNotes
    };

    onUpdate(updatedActivity);
  };

  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseNotes();
    }
  };

  // Calculate daily totals by grouping activities of the same day
  const dailyActivities = activities.reduce((acc, activity) => {
    // Group by day of the first activity's start time
    const firstActivity = activities[0];
    if (!firstActivity) return acc;
    
    if (isSameDay(activity.startTime, firstActivity.startTime)) {
      const categoryType = storedCategories.categories.work.includes(activity.category) ? 'work' : 'personal';
      acc[categoryType] = (acc[categoryType] || 0) + activity.duration;
      
      if (categoryType === 'work') {
        acc.categories = acc.categories || {};
        acc.categories[activity.category] = (acc.categories[activity.category] || 0) + activity.duration;
      }
    }
    
    return acc;
  }, { work: 0, personal: 0, categories: {} as Record<string, number> });

  // Sort activities chronologically by start time
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const selectedActivity = selectedActivityId ? activities.find(a => a.id === selectedActivityId) : null;

  return (
    <div>
      {/* Daily Totals */}
      {(dailyActivities.work > 0 || dailyActivities.personal > 0) && (
        <div className="mb-4 card bg-neutral-50">
          <h3 className="text-sm font-semibold mb-2 text-neutral-700">Daily Totals</h3>
          <div className="grid grid-cols-2 gap-2">
            {dailyActivities.personal > 0 && (
              <div className="bg-primary-50 p-2 rounded-md border border-primary-100">
                <div className="text-xs text-primary-700">Personal</div>
                <div className="text-sm font-mono font-medium">{formatTime(dailyActivities.personal, false)}</div>
              </div>
            )}
            {dailyActivities.work > 0 && (
              <div className="bg-accent-50 p-2 rounded-md border border-accent-100">
                <div className="text-xs text-accent-700">Work</div>
                <div className="text-sm font-mono font-medium">{formatTime(dailyActivities.work, false)}</div>
              </div>
            )}
          </div>
          
          {/* Work Categories Breakdown */}
          {dailyActivities.categories && Object.keys(dailyActivities.categories).length > 0 && (
            <div className="mt-2 pt-2 border-t border-neutral-200">
              <h4 className="text-xs font-medium text-neutral-600 mb-1">Work Categories</h4>
              <div className="space-y-1">
                {Object.entries(dailyActivities.categories)
                  .sort(([, a], [, b]) => b - a) // Sort by duration (highest first)
                  .map(([category, duration]) => (
                    <div key={category} className="flex justify-between items-center text-xs">
                      <span className="text-neutral-600">{category}</span>
                      <span className="text-neutral-700 font-mono">{formatTime(duration, false)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* No activities message */}
      {activities.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          <div className="flex justify-center mb-3">
            <Clock size={36} className="text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium">No activities tracked for this day</p>
          <p className="text-sm mt-1 text-neutral-500">Use the timer to track your first activity</p>
        </div>
      )}

      {/* Activities List */}
      <div className="space-y-3">
        {sortedActivities.length === 0 ? (
          <div className="p-4 text-center text-neutral-500">
            No activities recorded for today. Start the timer to begin tracking.
          </div>
        ) : (
          sortedActivities.map(activity => (
            <div 
              key={activity.id} 
              className="card"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div 
                    className={`inline-block px-2 py-1 rounded-md text-xs font-medium mb-1`}
                    style={{
                      backgroundColor: `${getCategoryColor(activity.category, storedCategories.categories)}20`,
                      color: getCategoryColor(activity.category, storedCategories.categories)
                    }}
                  >
                    {activity.category}
                  </div>
                  <div className="flex items-center text-neutral-700 text-sm">
                    <Clock size={14} className="mr-1" />
                    <span className="font-mono">{formatTime(activity.duration, false)}</span>
                    <span className="mx-1 text-neutral-400">•</span>
                    <span>{formatRange(activity.startTime, activity.endTime)}</span>
                  </div>
                  
                  {activity.notes && activity.notes.length > 0 && (
                    <button 
                      className="text-xs text-primary-600 hover:text-primary-800 mt-1 flex items-center"
                      onClick={() => handleViewNotes(activity.id)}
                    >
                      {activity.notes.length} {activity.notes.length === 1 ? 'note' : 'notes'}
                    </button>
                  )}
                </div>
                
                <div className="flex items-center space-x-1">
                  {editingId !== activity.id ? (
                    <>
                      <button
                        onClick={() => handleEdit(activity)}
                        className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this activity?')) {
                            onDelete(activity.id);
                          }
                        }}
                        className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSave}
                        className="p-1 text-primary-600 hover:text-primary-800 rounded-full hover:bg-neutral-100"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {editingId === activity.id && editForm && (
                <div className="mt-3 p-3 bg-neutral-50 rounded-md border border-neutral-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        className="input text-sm"
                        value={editForm.category}
                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        className="input text-sm"
                        value={editForm.startDateTime}
                        onChange={(e) => setEditForm({...editForm, startDateTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        className="input text-sm"
                        value={editForm.endDateTime}
                        onChange={(e) => setEditForm({...editForm, endDateTime: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Notes Modal */}
      {selectedActivityId && selectedActivity && (
        <div 
          className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleModalClick}
        >
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-neutral-200">
              <h3 className="font-medium">Notes for {selectedActivity.category}</h3>
              <button 
                onClick={handleCloseNotes}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {!selectedActivity.notes || selectedActivity.notes.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">
                  No notes added yet
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedActivity.notes.map(note => (
                    <div key={note.id} className="p-3 bg-neutral-50 rounded-md border border-neutral-200">
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-xs text-neutral-500">
                          {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                        </div>
                        <button
                          onClick={() => handleDeleteNote(selectedActivity.id, note.id)}
                          className="text-neutral-400 hover:text-neutral-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <textarea
                        className="w-full p-2 border border-neutral-300 rounded-md text-sm"
                        value={note.content}
                        onChange={(e) => handleUpdateNote(selectedActivity.id, note.id, e.target.value)}
                        rows={3}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-neutral-200">
              <button
                onClick={() => handleAddNote(selectedActivity.id)}
                className="btn btn-primary w-full flex items-center justify-center gap-1"
              >
                <Plus size={16} />
                <span>Add Note</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};