import React, { useState } from 'react';
import { Activity, StoredCategories } from '../types';
import { 
  formatTime, 
  formatTimeRange,
  getCategoryColor, 
  formatForDateTimeInput,
  parseFromDateTimeInput,
  calculateDuration
} from '../utils';
import { Pencil, Save, Trash2, X } from 'lucide-react';

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
  const [editForm, setEditForm] = useState<Activity | null>(null);

  const handleEdit = (activity: Activity) => {
    setEditingId(activity.id);
    
    // Extract date and format time separately
    const startDate = new Date(activity.startTime);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    setEditForm({
      ...activity,
      date: startDateStr,
      startTime: formatForDateTimeInput(activity.startTime).split('T')[1],
      endTime: activity.endTime 
        ? formatForDateTimeInput(activity.endTime).split('T')[1] 
        : formatForDateTimeInput(new Date().toISOString()).split('T')[1]
    });
  };

  const handleSave = () => {
    if (!editForm) return;

    try {
      // Combine date with start and end times
      const startDateTime = `${editForm.date}T${editForm.startTime}`;
      const endDateTime = `${editForm.date}T${editForm.endTime}`;
      
      const startTime = parseFromDateTimeInput(startDateTime);
      const endTime = parseFromDateTimeInput(endDateTime);
      const duration = calculateDuration(startTime, endTime);

      if (duration < 0) {
        alert('End time cannot be before start time');
        return;
      }

      const updatedActivity = {
        ...editForm,
        startTime,
        endTime,
        duration
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

  // Calculate daily totals
  const dailyTotals = activities.reduce((acc, activity) => {
    const categoryType = storedCategories.categories.work.includes(activity.category) ? 'work' : 'personal';
    acc[categoryType] = (acc[categoryType] || 0) + activity.duration;
    
    if (categoryType === 'work') {
      acc.categories = acc.categories || {};
      acc.categories[activity.category] = (acc.categories[activity.category] || 0) + activity.duration;
    }
    
    return acc;
  }, { work: 0, personal: 0, categories: {} as Record<string, number> });

  // Sort activities chronologically by start time
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Daily Totals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyTotals.personal > 0 && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="text-sm text-blue-700">Personal Activities</div>
                <div className="text-lg font-mono">{formatTime(dailyTotals.personal, false)}</div>
              </div>
            )}
            {dailyTotals.work > 0 && (
              <div className="bg-green-50 p-3 rounded-md">
                <div className="text-sm text-green-700">Total Work</div>
                <div className="text-lg font-mono">{formatTime(dailyTotals.work, false)}</div>
              </div>
            )}
          </div>
          {dailyTotals.work > 0 && Object.entries(dailyTotals.categories).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Work Categories</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(dailyTotals.categories)
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={editForm.startTime}
                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={editForm.endTime}
                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md h-24 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      <Save size={16} />
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`inline-block px-2 py-1 text-sm rounded bg-${getCategoryColor(activity.category, storedCategories.categories)}-100 text-${getCategoryColor(activity.category, storedCategories.categories)}-800`}>
                        {activity.category}
                      </span>
                      <div className="mt-2 text-sm text-gray-600">
                        {formatTimeRange(activity.startTime, activity.endTime || new Date().toISOString())}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-mono">
                        {formatTime(activity.duration, false)}
                      </div>
                      <button
                        onClick={() => handleEdit(activity)}
                        className="p-1 text-gray-500 hover:text-blue-500 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(activity.id)}
                        className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {activity.notes && (
                    <div className="mt-2 text-gray-700 bg-gray-50 p-3 rounded">
                      {activity.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {activities.length === 0 && (
            <p className="text-gray-500 text-center">No activities recorded for this date</p>
          )}
        </div>
      </div>
    </div>
  );
};