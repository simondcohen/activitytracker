import React, { useState } from 'react';
import { Activity, StoredCategories, Note } from '../types';
import { Plus, X } from 'lucide-react';
import { formatForDateTimeInput, parseFromDateTimeInput, calculateDuration, getTodayISO } from '../dateHelpers';

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
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState('');

  // Initialize with current local date/time
  React.useEffect(() => {
    const now = new Date();
    const localDateTimeStr = formatForDateTimeInput(getTodayISO());
    setStartDateTime(localDateTimeStr);
    setEndDateTime(localDateTimeStr);
  }, []);

  const handleAddNote = () => {
    if (!currentNote.trim()) return;
    
    const newNote: Note = {
      id: crypto.randomUUID(),
      content: currentNote,
      timestamp: new Date().toISOString()
    };
    
    setNotes(prev => [...prev, newNote]);
    setCurrentNote('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      alert('Please select a category');
      return;
    }

    if (!startDateTime || !endDateTime) {
      alert('Please enter both start and end times');
      return;
    }

    try {
      // Convert local datetime strings to ISO UTC strings
      const startTimeISO = parseFromDateTimeInput(startDateTime);
      const endTimeISO = parseFromDateTimeInput(endDateTime);
      
      // Calculate duration
      const durationInSeconds = calculateDuration(startTimeISO, endTimeISO);
      
      if (durationInSeconds <= 0) {
        alert('End time must be after start time');
        return;
      }

      const newActivity: Activity = {
        id: crypto.randomUUID(),
        category: category === 'Other' ? customCategory || 'Other' : category,
        startTime: startTimeISO,
        endTime: endTimeISO,
        duration: durationInSeconds,
        notes
      };

      onAdd(newActivity);
    } catch (error) {
      console.error('Error creating activity:', error);
      alert('Error creating activity. Please check the time format.');
    }
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
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
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
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
          <div className="space-y-3">
            <div className="flex gap-2">
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Add a note for this activity..."
                className="flex-1 px-3 py-2 border rounded-md h-20 resize-none"
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!currentNote.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
            </div>
            {notes.length > 0 && (
              <div className="border rounded-md p-3 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Saved Notes:</h4>
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="text-sm text-gray-600 border-b pb-2 last:border-0">
                      <div className="text-xs text-gray-500 mb-1">
                        {new Date(note.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      {note.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Add Activity
        </button>
      </form>
    </div>
  );
};