import React, { useState, useEffect } from 'react';
import { TimestampEvent } from '../types';
import { X } from 'lucide-react';
import { formatForDateTimeInput, parseFromDateTimeInput, getTodayISO } from '../dateHelpers';
import { format, parseISO } from 'date-fns';

interface TimestampEventFormProps {
  onAdd: (event: TimestampEvent) => void;
  onClose: () => void;
}

export const TimestampEventForm: React.FC<TimestampEventFormProps> = ({ 
  onAdd, 
  onClose 
}) => {
  const [eventName, setEventName] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [notes, setNotes] = useState('');

  // Initialize with current local date/time
  useEffect(() => {
    const today = new Date();
    const formattedDate = format(today, 'yyyy-MM-dd');
    const formattedTime = format(today, 'HH:mm');
    
    setDateValue(formattedDate);
    setTimeValue(formattedTime);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName.trim()) {
      alert('Please enter an event name');
      return;
    }

    if (!dateValue || !timeValue) {
      alert('Please enter both date and time');
      return;
    }

    try {
      // Combine date and time values into a datetime string
      const dateTimeString = `${dateValue}T${timeValue}`;
      
      // Convert to ISO UTC string
      const timestampISO = parseFromDateTimeInput(dateTimeString);
      
      const newEvent: TimestampEvent = {
        id: crypto.randomUUID(),
        name: eventName.trim(),
        timestamp: timestampISO,
        notes: notes.trim() || undefined
      };

      onAdd(newEvent);
    } catch (error) {
      console.error('Error creating timestamp event:', error);
      alert('Error creating event. Please check the date and time format.');
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full mx-4" onClick={handleClick}>
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-200">
        <h2 className="text-xl font-medium text-neutral-800">Add Timestamp Event</h2>
        <button
          onClick={onClose}
          className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Event Name
          </label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g., Woke up, Took medication"
            className="input w-full"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Time
            </label>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="input w-full"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional details..."
            className="input w-full h-24 resize-none"
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
          >
            Save Event
          </button>
        </div>
      </form>
    </div>
  );
}; 