import React, { useState, useEffect } from 'react';
import { Activity, Note, StoredCategories } from '../types';
import { X, Copy, Check } from 'lucide-react';
import { parseFromDateTimeInput, calculateDuration } from '../dateHelpers';

interface ImportJsonFormProps {
  onImport: (activities: Activity[]) => void;
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
  const [copied, setCopied] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Update available categories whenever storedCategories changes
  useEffect(() => {
    const allCategories = [
      ...storedCategories.categories.work,
      ...storedCategories.categories.personal
    ];
    setAvailableCategories(allCategories);
  }, [storedCategories]);

  const exampleJson = JSON.stringify([
    {
      "category": "QE work",
      "startTime": "2023-06-15T09:00:00.000Z",
      "endTime": "2023-06-15T11:30:00.000Z",
      "notes": [
        {
          "content": "Worked on the test framework",
          "timestamp": "2023-06-15T09:15:00.000Z"
        }
      ]
    },
    {
      "category": "Personal admin",
      "startTime": "2023-06-15T12:00:00.000Z",
      "endTime": "2023-06-15T13:00:00.000Z",
      "notes": []
    },
    {
      "category": "Other",
      "customCategory": "Client Meeting",
      "startTime": "2023-06-15T14:00:00.000Z",
      "endTime": "2023-06-15T15:00:00.000Z",
      "notes": []
    }
  ], null, 2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Parse JSON
      const parsed = JSON.parse(jsonInput);
      const activities: Activity[] = [];
      
      // Handle both single activity and array of activities
      const activitiesToProcess = Array.isArray(parsed) ? parsed : [parsed];
      
      for (const item of activitiesToProcess) {
        // Validate required fields
        if (!item.category || !item.startTime || !item.endTime) {
          throw new Error('Each activity must include category, startTime, and endTime');
        }
        
        // Convert dates if they're in datetime-local format
        let startTimeISO = item.startTime;
        let endTimeISO = item.endTime;
        
        // If timestamps are not in ISO format, try to convert them
        if (!item.startTime.includes('Z') && !item.startTime.includes('+')) {
          try {
            startTimeISO = parseFromDateTimeInput(item.startTime);
          } catch (e) {
            throw new Error(`Invalid startTime format: ${item.startTime}`);
          }
        }
        
        if (!item.endTime.includes('Z') && !item.endTime.includes('+')) {
          try {
            endTimeISO = parseFromDateTimeInput(item.endTime);
          } catch (e) {
            throw new Error(`Invalid endTime format: ${item.endTime}`);
          }
        }
        
        // Calculate duration if not provided
        const duration = item.duration || calculateDuration(startTimeISO, endTimeISO);
        
        if (duration <= 0) {
          throw new Error('End time must be after start time');
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

      if (activities.length === 0) {
        throw new Error('No valid activities found in JSON');
      }

      onImport(activities);
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

  const copyInstructionsToClipboard = () => {
    const categoriesList = availableCategories.map(cat => `"${cat}"`).join(', ');
    
    const instructions = `# Activity Tracker JSON Import Format

Each activity should include the following required fields:
- category: The category name (string)
- startTime: Start time in ISO format or datetime-local format (string)
- endTime: End time in ISO format or datetime-local format (string)

Optional fields:
- id: Unique identifier (string) - will be generated if not provided
- duration: Duration in seconds (number) - will be calculated if not provided
- notes: Array of notes, each with:
  - content: Note text (string)
  - timestamp: Time the note was created (string)
  - id: Unique identifier (string) - will be generated if not provided

Currently available categories: ${categoriesList}

To use a custom category not in the list above:
1. Set "category" to "Other"
2. Add a "customCategory" field with your custom category name

Example JSON format:
${exampleJson}`;

    navigator.clipboard.writeText(instructions)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy instructions:', err);
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
              onClick={copyInstructionsToClipboard}
              className="flex items-center gap-1 text-sm px-2 py-1 bg-accent-50 text-accent-600 hover:bg-accent-100 rounded-md transition-colors"
              title="Copy format instructions"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
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
            <pre className="text-xs text-neutral-700 whitespace-pre-wrap">{exampleJson}</pre>
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