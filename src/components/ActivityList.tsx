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
import { Pencil, Save, Trash2, X, ChevronDown, ChevronUp, Plus } from 'lucide-react';
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
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Daily Totals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyActivities.personal > 0 && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="text-sm text-blue-700">Personal Activities</div>
                <div className="text-lg font-mono">{formatTime(dailyActivities.personal, false)}</div>
              </div>
            )}
            {dailyActivities.work > 0 && (
              <div className="bg-green-50 p-3 rounded-md">
                <div className="text-sm text-green-700">Total Work</div>
                <div className="text-lg font-mono">{formatTime(dailyActivities.work, false)}</div>
              </div>
            )}
          </div>
          {dailyActivities.work > 0 && Object.entries(dailyActivities.categories).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Work Categories</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(dailyActivities.categories)
                  .filter(([_, duration]) => duration > 0)
                  .map(([category, duration]) => (
                    <div key={category} className="bg-white p-2 rounded border">
                      <div className="text-sm text-gray-600">{category}</div>
                      <div className="text-base font-mono">{formatTime(duration, false)}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
          {sortedActivities.map((activity) => (
            <div
              key={activity.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              {editingId === activity.id && editForm ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Work Activities</h3>
                        <div className="flex flex-wrap gap-2">
                          {storedCategories.categories.work.map((cat) => (
                            <button
                              type="button"
                              key={cat}
                              onClick={() => setEditForm({ ...editForm, category: cat })}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                editForm.category === cat
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
                              type="button"
                              key={cat}
                              onClick={() => setEditForm({ ...editForm, category: cat })}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                editForm.category === cat
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
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editForm.startDateTime}
                        onChange={(e) => setEditForm({ ...editForm, startDateTime: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editForm.endDateTime}
                        onChange={(e) => setEditForm({ ...editForm, endDateTime: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={editForm.notes ? editForm.notes.map(note => note.content).join('\n') : ''}
                      onChange={(e) => {
                        const content = e.target.value;
                        const newNote: Note = {
                          id: crypto.randomUUID(),
                          content,
                          timestamp: new Date().toISOString()
                        };
                        setEditForm({ ...editForm, notes: [newNote] });
                      }}
                      className="w-full px-3 py-2 border rounded-md h-20"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between">
                    <div>
                      <span
                        className={`inline-block px-2 py-1 rounded-md text-xs font-medium mb-2 ${
                          getCategoryColor(activity.category, storedCategories.categories) === 'green'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {activity.category}
                      </span>
                      <h3 className="text-base font-medium">
                        {formatRange(activity.startTime, activity.endTime)}
                      </h3>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatTime(activity.duration, false)}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(activity)}
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(activity.id)}
                        className="p-1 text-gray-500 hover:text-red-700 hover:bg-gray-100 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {activity.notes && activity.notes.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600 border-t pt-2">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          {activity.notes.slice(0, 2).map((note) => (
                            <div key={note.id} className="text-sm text-gray-600 truncate">
                              {note.content}
                            </div>
                          ))}
                          {activity.notes.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{activity.notes.length - 2} more notes
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleViewNotes(activity.id)}
                          className="text-blue-500 hover:text-blue-600 text-sm"
                        >
                          View Notes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notes Modal */}
      {selectedActivity && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 p-4"
          onClick={handleModalClick}
        >
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg mx-auto max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold truncate pr-4">
                Notes for {selectedActivity.category}
              </h2>
              <button
                onClick={handleCloseNotes}
                className="p-1 hover:bg-gray-100 rounded-full flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {selectedActivity.notes?.map((note) => (
                <div key={note.id} className="border rounded-lg p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-gray-500">
                      {format(new Date(note.timestamp), 'h:mm a')}
                    </div>
                    <button
                      onClick={() => handleDeleteNote(selectedActivity.id, note.id)}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <textarea
                    value={note.content}
                    onChange={(e) => handleUpdateNote(selectedActivity.id, note.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md resize-none break-words"
                    rows={4}
                    style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                  />
                </div>
              ))}

              <button
                onClick={() => handleAddNote(selectedActivity.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                <Plus size={16} />
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};