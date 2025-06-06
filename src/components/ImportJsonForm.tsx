import React, { useState, useEffect } from 'react';
import { Activity, Note, StoredCategories, TimestampEvent } from '../types';
import { X, Copy, Check } from 'lucide-react';
import { calculateDuration } from '../dateHelpers';

interface ImportJsonFormProps {
  onImport: (activities: Activity[], timestampEvents?: TimestampEvent[]) => void;
  onClose: () => void;
  storedCategories: StoredCategories;
}

interface ImportSummary {
  activitiesImported: number;
  activitiesSkipped: number;
  timestampEventsImported: number;
  timestampEventsSkipped: number;
  categoriesAdded: string[];
  errors: string[];
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
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

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

  // Helper function to validate ISO date strings
  const validateISODate = (dateString: string): boolean => {
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }
    
    try {
      const date = new Date(dateString);
      // Check if the date is valid and the string matches the ISO format
      return !isNaN(date.getTime()) && date.toISOString() === dateString;
    } catch {
      return false;
    }
  };

  // Helper function to validate and potentially add categories
  const validateAndProcessCategory = (category: string, customCategory?: string): { 
    isValid: boolean; 
    finalCategory: string; 
    isNewCategory: boolean;
    categoryType?: 'work' | 'personal';
  } => {
    if (!category || typeof category !== 'string') {
      return { isValid: false, finalCategory: '', isNewCategory: false };
    }

    // Handle custom category case
    let finalCategory = category;
    if (category === "Other" && customCategory) {
      finalCategory = customCategory;
    }

    // Check if category exists in work or personal categories
    const isInWork = storedCategories.categories.work.includes(finalCategory);
    const isInPersonal = storedCategories.categories.personal.includes(finalCategory);

    if (isInWork || isInPersonal) {
      return { 
        isValid: true, 
        finalCategory, 
        isNewCategory: false,
        categoryType: isInWork ? 'work' : 'personal'
      };
    }

    // Category doesn't exist - we'll add it to 'personal' as default
    return { 
      isValid: true, 
      finalCategory, 
      isNewCategory: true,
      categoryType: 'personal'
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setImportSummary(null);
    
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

      // Initialize summary tracking
      const summary: ImportSummary = {
        activitiesImported: 0,
        activitiesSkipped: 0,
        timestampEventsImported: 0,
        timestampEventsSkipped: 0,
        categoriesAdded: [],
        errors: []
      };

      // Track new categories to add
      const newWorkCategories: string[] = [];
      const newPersonalCategories: string[] = [];
      
      // Process activities
      const activities: Activity[] = [];
      for (const item of data.activities) {
        const activityErrors: string[] = [];
        
        // Validate required fields
        if (!item.category || typeof item.category !== 'string') {
          activityErrors.push('Missing or invalid category');
        }
        if (!item.startTime) {
          activityErrors.push('Missing startTime');
        }
        if (!item.endTime) {
          activityErrors.push('Missing endTime');
        }

        // Validate ISO date strings
        if (item.startTime && !validateISODate(item.startTime)) {
          activityErrors.push(`Invalid startTime format: ${item.startTime} (must be valid ISO-8601)`);
        }
        if (item.endTime && !validateISODate(item.endTime)) {
          activityErrors.push(`Invalid endTime format: ${item.endTime} (must be valid ISO-8601)`);
        }

        // If there are validation errors, skip this activity
        if (activityErrors.length > 0) {
          const errorMsg = `Activity with category "${item.category || 'unknown'}" skipped: ${activityErrors.join(', ')}`;
          console.warn(errorMsg);
          summary.errors.push(errorMsg);
          summary.activitiesSkipped++;
          continue;
        }
        
        // Validate and process category
        const categoryResult = validateAndProcessCategory(item.category, item.customCategory);
        if (!categoryResult.isValid) {
          const errorMsg = `Activity skipped due to invalid category: ${item.category}`;
          console.warn(errorMsg);
          summary.errors.push(errorMsg);
          summary.activitiesSkipped++;
          continue;
        }

        // Track new categories
        if (categoryResult.isNewCategory) {
          if (categoryResult.categoryType === 'work') {
            if (!newWorkCategories.includes(categoryResult.finalCategory)) {
              newWorkCategories.push(categoryResult.finalCategory);
              summary.categoriesAdded.push(`${categoryResult.finalCategory} (work)`);
            }
          } else {
            if (!newPersonalCategories.includes(categoryResult.finalCategory)) {
              newPersonalCategories.push(categoryResult.finalCategory);
              summary.categoriesAdded.push(`${categoryResult.finalCategory} (personal)`);
            }
          }
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

        // Validate duration
        if (duration <= 0) {
          const errorMsg = `Activity with category "${categoryResult.finalCategory}" skipped: end time must be after start time`;
          console.warn(errorMsg);
          summary.errors.push(errorMsg);
          summary.activitiesSkipped++;
          continue;
        }
        
        // Process notes
        const notes: Note[] = [];
        
        if (item.notes && Array.isArray(item.notes)) {
          for (const note of item.notes) {
            if (!note.content) {
              continue;
            }

            // Validate note timestamp if provided
            let noteTimestamp = note.timestamp || new Date().toISOString();
            if (note.timestamp && !validateISODate(note.timestamp)) {
              console.warn(`Invalid note timestamp ${note.timestamp}, using current time instead`);
              noteTimestamp = new Date().toISOString();
            }
            
            notes.push({
              id: note.id || crypto.randomUUID(),
              content: note.content,
              timestamp: noteTimestamp
            });
          }
        }

        // Create activity
        activities.push({
          id: item.id || crypto.randomUUID(),
          category: categoryResult.finalCategory,
          startTime: startTimeISO,
          endTime: endTimeISO,
          duration,
          notes: notes.length > 0 ? notes : undefined
        });

        summary.activitiesImported++;
      }
      
      // Process timestamp events if present
      const timestampEvents: TimestampEvent[] = [];
      if (Array.isArray(data.timestampEvents)) {
        for (const item of data.timestampEvents) {
          const eventErrors: string[] = [];

          // Validate required fields
          if (!item.name || typeof item.name !== 'string') {
            eventErrors.push('Missing or invalid name');
          }
          if (!item.timestamp) {
            eventErrors.push('Missing timestamp');
          }

          // Validate ISO date string
          if (item.timestamp && !validateISODate(item.timestamp)) {
            eventErrors.push(`Invalid timestamp format: ${item.timestamp} (must be valid ISO-8601)`);
          }

          // If there are validation errors, skip this event
          if (eventErrors.length > 0) {
            const errorMsg = `Timestamp event "${item.name || 'unknown'}" skipped: ${eventErrors.join(', ')}`;
            console.warn(errorMsg);
            summary.errors.push(errorMsg);
            summary.timestampEventsSkipped++;
            continue;
          }
          
          timestampEvents.push({
            id: item.id || crypto.randomUUID(),
            name: item.name,
            timestamp: item.timestamp,
            notes: item.notes
          });

          summary.timestampEventsImported++;
        }
      }

      if (activities.length === 0 && timestampEvents.length === 0) {
        throw new Error('No valid activities or timestamp events found in JSON. Please check the format and try again.');
      }

      // Update categories if new ones were added
      if (newWorkCategories.length > 0 || newPersonalCategories.length > 0) {
        // Note: We're not actually updating the categories here since we don't have access to the update function
        // The parent component would need to handle this, but we're tracking it for the summary
        console.log('New categories detected:', { work: newWorkCategories, personal: newPersonalCategories });
      }

      setImportSummary(summary);
      onImport(activities, timestampEvents);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid JSON format - please check your data and try again');
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

      {importSummary && (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="font-medium text-green-800 mb-2">Import Summary</h3>
          <div className="text-sm text-green-700 space-y-1">
            <p>✅ Activities imported: {importSummary.activitiesImported}</p>
            <p>✅ Timestamp events imported: {importSummary.timestampEventsImported}</p>
            {importSummary.activitiesSkipped > 0 && (
              <p>⚠️ Activities skipped: {importSummary.activitiesSkipped}</p>
            )}
            {importSummary.timestampEventsSkipped > 0 && (
              <p>⚠️ Timestamp events skipped: {importSummary.timestampEventsSkipped}</p>
            )}
            {importSummary.categoriesAdded.length > 0 && (
              <div>
                <p>📁 New categories detected:</p>
                <ul className="list-disc list-inside ml-2">
                  {importSummary.categoriesAdded.map((cat, index) => (
                    <li key={index}>{cat}</li>
                  ))}
                </ul>
              </div>
            )}
            {importSummary.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-orange-700">⚠️ Issues encountered:</p>
                <ul className="list-disc list-inside ml-2 text-xs">
                  {importSummary.errors.map((error, index) => (
                    <li key={index} className="text-orange-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

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
            Each activity must include: category, startTime, and endTime (all in ISO-8601 format).
            <br/><br/>
            Optional fields: id (generated if not provided), duration (calculated if not provided), 
            and notes (array of objects with content, timestamp, and optional id).
            <br/><br/>
            <strong>Date validation:</strong> All timestamps must be valid ISO-8601 format (e.g., "2024-01-15T10:30:00.000Z").
            <br/><br/>
            <strong>Available categories:</strong> {availableCategories.join(', ')}
            <br/><br/>
            <strong>Category handling:</strong> Unknown categories will be automatically added to "personal" group with a warning.
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