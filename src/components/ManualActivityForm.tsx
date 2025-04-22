import React, { useState } from 'react';
import { Activity, StoredCategories } from '../types';
import { Plus, X } from 'lucide-react';
import { toLocalISOString, getTodayDate } from '../utils';

interface ManualActivityFormProps {
  onAdd: (activity: Activity) => void;
  onClose: () => void;
  storedCategories: StoredCategories;
}

export const ManualActivityForm: React.FC<ManualActivityFormProps> = ({ 
  onAdd, 
  onClose,
  storedCategories 
}) => {
  const [category, setCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState(getTodayDate());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      alert('Please select a category');
      return;
    }

    if (!startTime || !endTime) {
      alert('Please enter both start and end times');
      return;
    }

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startDateTime = new Date(date);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    // Handle case where end time is on the next day
    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    const durationInSeconds = (endDateTime.getTime() - startDateTime.getTime()) / 1000;

    if (durationInSeconds < 0) {
      alert('End time must be after start time');
      return;
    }

    const newActivity: Activity = {
      id: crypto.randomUUID(),
      category: category === 'Other' ? customCategory || 'Other' : category,
      date: date,
      startTime: toLocalISOString(startDateTime),
      endTime: toLocalISOString(endDateTime),
      duration: durationInSeconds,
      notes,
    };

    onAdd(newActivity);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4" onClick={handleClick}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Add Activity</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
        </div>

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
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      category === cat
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
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      category === cat
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

          {category === 'Other' && (
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Enter custom category"
              className="mt-3 w-full px-3 py-2 border rounded-md"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for this activity..."
            className="w-full px-3 py-2 border rounded-md h-24 resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
        >
          <Plus size={20} />
          Add Activity
        </button>
      </form>
    </div>
  );
};