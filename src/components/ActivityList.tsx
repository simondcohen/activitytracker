import React, { useState } from 'react';
import { Activity, StoredCategories, Note, TimestampEvent } from '../types';
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
import { Pencil, Save, Trash2, X, ChevronDown, ChevronUp, Plus, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { TimestampEventItem } from './TimestampEventItem';

interface ActivityListProps {
  activities: Activity[];
  timestampEvents: TimestampEvent[];
  onUpdateActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
  onUpdateTimestampEvent: (event: TimestampEvent) => void;
  onDeleteTimestampEvent: (id: string) => void;
  storedCategories: StoredCategories;
}

export const ActivityList: React.FC<ActivityListProps> = ({ 
  activities, 
  timestampEvents,
  onUpdateActivity, 
  onDeleteActivity,
  onUpdateTimestampEvent,
  onDeleteTimestampEvent,
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

      onUpdateActivity(updatedActivity);
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

  const handleAddEmptyNote = (activity: Activity) => {
    // Create a new empty note
    const newNote: Note = {
      id: crypto.randomUUID(),
      content: '',
      timestamp: new Date().toISOString()
    };
    
    // Add the note to the activity
    const updatedActivity: Activity = {
      ...activity,
      notes: [...(activity.notes || []), newNote]
    };
    
    // Update the activity and open the notes modal
    onUpdateActivity(updatedActivity);
    setSelectedActivityId(activity.id);
  };

  // Dedicated function for adding a note from the modal
  const handleAddNoteFromModal = (activity: Activity) => {
    // Create a new empty note
    const newNote: Note = {
      id: crypto.randomUUID(),
      content: '',
      timestamp: new Date().toISOString()
    };
    
    // Add the note to the activity
    const updatedActivity: Activity = {
      ...activity,
      notes: [...(activity.notes || []), newNote]
    };
    
    // Update the activity without reopening the modal
    onUpdateActivity(updatedActivity);
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

    onUpdateActivity(updatedActivity);
  };

  const handleDeleteNote = (activityId: string, noteId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity || !activity.notes) return;

    const updatedNotes = activity.notes.filter(note => note.id !== noteId);

    const updatedActivity: Activity = {
      ...activity,
      notes: updatedNotes
    };

    onUpdateActivity(updatedActivity);
  };

  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseNotes();
    }
  };

  // Calculate daily totals by grouping activities of the same day
  // Note: Days are considered to start at 4am rather than midnight,
  // so activities between midnight and 4am are grouped with the previous calendar day
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

  // Create a combined timeline of activities and timestamp events
  const timelineItems = [
    ...activities.map(activity => ({
      type: 'activity' as const,
      id: activity.id,
      timestamp: activity.startTime,
      data: activity
    })),
    ...timestampEvents.map(event => ({
      type: 'timestampEvent' as const,
      id: event.id,
      timestamp: event.timestamp,
      data: event
    }))
  ];

  // Sort all items chronologically
  const sortedTimelineItems = timelineItems.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
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
      {activities.length === 0 && timestampEvents.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          <div className="flex justify-center mb-3">
            <Clock size={36} className="text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium">No activities tracked for this day</p>
          <p className="text-sm mt-1 text-neutral-500">Add activities or timestamp events using the controls above</p>
        </div>
      )}

      {/* Timeline Items */}
      <div className="space-y-3">
        {sortedTimelineItems.length === 0 ? (
          <div className="p-4 text-center text-neutral-500">
            No activities recorded for today. Add an activity or timestamp event to begin tracking.
          </div>
        ) : (
          sortedTimelineItems.map(item => {
            if (item.type === 'activity') {
              const activity = item.data;
              return (
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
                      
                      {activity.notes && activity.notes.length > 0 ? (
                        <button 
                          className="text-xs text-primary-600 hover:text-primary-800 mt-1 flex items-center"
                          onClick={() => handleViewNotes(activity.id)}
                        >
                          {activity.notes.length} {activity.notes.length === 1 ? 'note' : 'notes'}
                        </button>
                      ) : (
                        <button 
                          className="text-xs text-primary-600 hover:text-primary-800 mt-1 flex items-center gap-1"
                          onClick={() => handleAddEmptyNote(activity)}
                        >
                          <MessageSquare size={12} />
                          <span>Add note</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {editingId !== activity.id ? (
                        <>
                          <button
                            onClick={() => handleEdit(activity)}
                            className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
                            title="Edit activity"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleViewNotes(activity.id)}
                            className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
                            title="Add note"
                          >
                            <MessageSquare size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this activity?')) {
                                onDeleteActivity(activity.id);
                              }
                            }}
                            className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
                            title="Delete activity"
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
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Start Time
                          </label>
                          <input
                            type="datetime-local"
                            value={editForm.startDateTime}
                            onChange={(e) => setEditForm({...editForm, startDateTime: e.target.value})}
                            className="input py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            End Time
                          </label>
                          <input
                            type="datetime-local"
                            value={editForm.endDateTime}
                            onChange={(e) => setEditForm({...editForm, endDateTime: e.target.value})}
                            className="input py-1 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Category
                        </label>
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                          className="input py-1 text-sm"
                        >
                          <optgroup label="Work">
                            {storedCategories.categories.work.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Personal">
                            {storedCategories.categories.personal.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            } else {
              // Render timestamp event item
              return (
                <TimestampEventItem 
                  key={item.data.id}
                  event={item.data}
                  onUpdate={onUpdateTimestampEvent}
                  onDelete={onDeleteTimestampEvent}
                />
              );
            }
          })
        )}
      </div>
      
      {selectedActivityId && selectedActivity && (
        <div 
          className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleModalClick}
        >
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-neutral-200">
              <h3 className="font-medium text-lg">Notes for {selectedActivity.category}</h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleCloseNotes}
                  className="text-neutral-500 hover:text-neutral-700 p-1 rounded-full hover:bg-neutral-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {selectedActivity.notes && selectedActivity.notes.length > 0 ? (
                <div className="space-y-4">
                  {selectedActivity.notes.map(note => (
                    <div key={note.id} className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-neutral-500">
                          {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                        </div>
                        <button
                          onClick={() => handleDeleteNote(selectedActivity.id, note.id)}
                          className="text-neutral-400 hover:text-neutral-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      
                      <textarea
                        className="w-full p-3 border border-neutral-300 rounded-md text-base font-normal leading-relaxed focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        value={note.content}
                        onChange={(e) => handleUpdateNote(selectedActivity.id, note.id, e.target.value)}
                        rows={8}
                        style={{ minHeight: "120px" }}
                        placeholder="Write your note here..."
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <p>No notes yet. Add your first note below.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-neutral-200 bg-neutral-50">
              <button
                onClick={() => handleAddNoteFromModal(selectedActivity)}
                className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
              >
                <Plus size={18} />
                <span>Add New Note</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};