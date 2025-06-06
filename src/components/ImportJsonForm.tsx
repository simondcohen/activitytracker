import React, { useState, useEffect } from 'react';
import { Activity, Note, StoredCategories, TimestampEvent } from '../types';
import { X, Copy, Check } from 'lucide-react';
import { calculateDuration } from '../dateHelpers';

interface ImportJsonFormProps {
  onImport: (activities: Activity[], timestampEvents?: TimestampEvent[]) => void;
  onClose: () => void;
  storedCategories: StoredCategories;
}

export const ImportJsonForm: React.FC<ImportJsonFormProps> = ({ 
  onImport, 
  onClose,
  storedCategories
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Update available categories whenever storedCategories changes
  useEffect(() => {
    const allCategories = [
      ...storedCategories.categories.work,
      ...storedCategories.categories.personal
    ];
    setAvailableCategories(allCategories);
  }, [storedCategories]);

  // Auto-populate example JSON
  useEffect(() => {
    const exampleActivity: Activity = {
      id: 'example-id-123',
      category: 'Work',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
      duration: 3600,
      notes: [{
        id: 'note-id-123',
        content: 'Example note',
        timestamp: new Date().toISOString()
      }]
    };
    
    const exampleTimestampEvent: TimestampEvent = {
      id: 'example-event-123',
      name: 'Woke up',
      timestamp: new Date().toISOString(),
      notes: 'Example note for timestamp event'
    };

    const exampleData = {
      activities: [exampleActivity],
      timestampEvents: [exampleTimestampEvent],
      categories: storedCategories,
      exportDate: new Date().toISOString()
    };
    
    setJsonInput(JSON.stringify(exampleData, null, 2));
  }, [storedCategories]);

  const handleCopyExample = () => {
    navigator.clipboard.writeText(jsonInput)
      .then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!jsonInput.trim()) {
        throw new Error('Please enter JSON data');
      }
      
      const data = JSON.parse(jsonInput);
      
      // Validate structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON format - must be an object');
      }
      
      if (!Array.isArray(data.activities)) {
        throw new Error('Invalid JSON format - activities must be an array');
      }
      
      // Process activities
      const activities: Activity[] = [];
      for (const item of data.activities) {
        if (!item.category || !item.startTime || !item.endTime) {
          console.warn('Skipping invalid activity:', item);
          continue;
        }
        
        // Parse dates
        const startTimeISO = item.startTime;
        const endTimeISO = item.endTime;
        
        // Calculate duration
        let duration: number;
        
        if (typeof item.duration === 'number') {
          duration = item.duration;
        } else {
          duration = calculateDuration(startTimeISO, endTimeISO);
        }
        
        // Process notes
        const notes: Note[] = [];
        
        if (item.notes && Array.isArray(item.notes)) {
          for (const note of item.notes) {
            if (!note.content) {
              continue;
            }
            
            notes.push({
              id: note.id || crypto.randomUUID(),
              content: note.content,
              timestamp: note.timestamp || new Date().toISOString()
            });
          }
        }

        // Set category - handle custom category if "Other" is selected
        let category = item.category;
        if (category === "Other" && item.customCategory) {
          category = item.customCategory;
        }

        // Create activity
        activities.push({
          id: item.id || crypto.randomUUID(),
          category: category,
          startTime: startTimeISO,
          endTime: endTimeISO,
          duration,
          notes: notes.length > 0 ? notes : undefined
        });
      }
      
      // Process timestamp events if present
      const timestampEvents: TimestampEvent[] = [];
      if (Array.isArray(data.timestampEvents)) {
        for (const item of data.timestampEvents) {
          if (!item.name || !item.timestamp) {
            console.warn('Skipping invalid timestamp event:', item);
            continue;
          }
          
          timestampEvents.push({
            id: item.id || crypto.randomUUID(),
            name: item.name,
            timestamp: item.timestamp,
            notes: item.notes
          });
        }
      }

      if (activities.length === 0 && timestampEvents.length === 0) {
        throw new Error('No valid activities or timestamp events found in JSON');
      }

      onImport(activities, timestampEvents);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid JSON format');
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const handleCopyInstructions = () => {
    const instructions = `
  Import JSON Format:
  
  You can import activities in JSON format. The JSON should be an object with an "activities" array and an optional "timestampEvents" array.
  
  Example JSON format:
  ${jsonInput}`;
  
    navigator.clipboard.writeText(instructions)
      .then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full mx-4" onClick={handleClick}>
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-200">
        <h2 className="text-xl font-medium text-neutral-800">Import Activities from JSON</h2>
        <button
          onClick={onClose}
          className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Paste JSON Data
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste your JSON data here..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-md h-48 resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-xs"
            required
          />
          {error && (
            <div className="mt-2 text-red-600 text-sm">{error}</div>
          )}
        </div>

        <div className="border rounded-md p-4 bg-neutral-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-neutral-800">JSON Format Example</h3>
            <button
              type="button"
              onClick={handleCopyInstructions}
              className="flex items-center gap-1 text-sm px-2 py-1 bg-accent-50 text-accent-600 hover:bg-accent-100 rounded-md transition-colors"
              title="Copy format instructions"
            >
              {showCopied ? <Check size={16} /> : <Copy size={16} />}
              <span>Copy Instructions</span>
            </button>
          </div>
          <p className="text-xs text-neutral-600 mb-3">
            Each activity must include: category, startTime, and endTime.
            <br/><br/>
            Optional fields: id (generated if not provided), duration (calculated if not provided), 
            and notes (array of objects with content, timestamp, and optional id).
            <br/><br/>
            <strong>Available categories:</strong> {availableCategories.join(', ')}
            <br/><br/>
            <strong>To use a custom category:</strong> Set category to "Other" and add a "customCategory" field with your custom name.
          </p>
          <div className="bg-white border rounded-md p-3 overflow-auto max-h-48">
            <pre className="text-xs text-neutral-700 whitespace-pre-wrap">{jsonInput}</pre>
          </div>
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
            disabled={!jsonInput.trim()}
          >
            Import Activities
          </button>
        </div>
      </form>
    </div>
  );
}; 