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
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] flex flex-col" onClick={handleClick}>
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-200 flex-shrink-0">
        <h2 className="text-xl font-medium text-neutral-800">Add Activity</h2>
        <button
          onClick={onClose}
          className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                End Time
              </label>
              <input
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Category
            </label>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              <div>
                <h3 className="text-sm font-medium text-neutral-600 mb-2">Work Activities</h3>
                <div className="flex flex-wrap gap-2">
                  {storedCategories.categories.work.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        category === cat
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
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        category === cat
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

            {category === 'Other' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category"
                className="input mt-3"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Notes
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <textarea
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder="Add a note for this activity..."
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-md h-20 resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!currentNote.trim()}
                  className={`self-start p-2 rounded-md ${currentNote.trim() ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                >
                  <Plus size={20} />
                </button>
              </div>
              
              {notes.length > 0 && (
                <div className="space-y-2 mt-2">
                  <h4 className="text-xs font-medium text-neutral-500">Added Notes</h4>
                  <div className="max-h-32 overflow-y-auto space-y-2 p-2 bg-neutral-50 rounded-md border border-neutral-200">
                    {notes.map((note) => (
                      <div key={note.id} className="flex justify-between items-start p-2 bg-white rounded border border-neutral-200">
                        <div className="text-sm text-neutral-700 mr-2 flex-1">{note.content}</div>
                        <button
                          type="button"
                          onClick={() => setNotes(notes.filter(n => n.id !== note.id))}
                          className="text-neutral-400 hover:text-neutral-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          className="btn btn-primary"
          disabled={!category}
        >
          Save Activity
        </button>
      </div>
    </div>
  );
};