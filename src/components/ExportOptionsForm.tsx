import React, { useState } from 'react';
import { Activity, StoredCategories, TimestampEvent } from '../types';
import { format, parseISO } from 'date-fns';
import { Check, Download, Clipboard, X } from 'lucide-react';
import { getCategoryType } from '../utils';
import { isSameDay } from '../dateHelpers';

interface ExportOptionsFormProps {
  onClose: () => void;
  activities: Activity[];
  timestampEvents: TimestampEvent[];
  storedCategories: StoredCategories;
  currentDate: string; // ISO date string
}

export const ExportOptionsForm: React.FC<ExportOptionsFormProps> = ({
  onClose,
  activities,
  storedCategories,
  currentDate
}) => {
  // State for export options
  const [exportType, setExportType] = useState<'day' | 'range'>('day');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filterByCategories, setFilterByCategories] = useState(false);
  const [startDate, setStartDate] = useState(format(parseISO(currentDate), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(parseISO(currentDate), 'yyyy-MM-dd'));

  // Handler for selecting/deselecting a category
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(prev => prev.filter(c => c !== category));
    } else {
      setSelectedCategories(prev => [...prev, category]);
    }
  };

  // Helper to select all work or personal categories
  const selectAllInGroup = (group: 'work' | 'personal') => {
    const allCategories = storedCategories.categories[group];
    setSelectedCategories(prev => {
      const filtered = prev.filter(c => !storedCategories.categories[group].includes(c));
      return [...filtered, ...allCategories];
    });
  };

  // Helper to deselect all work or personal categories
  const deselectAllInGroup = (group: 'work' | 'personal') => {
    setSelectedCategories(prev => 
      prev.filter(c => !storedCategories.categories[group].includes(c))
    );
  };

  // Filter activities based on selected options
  const getFilteredActivities = () => {
    let filteredActivities = activities;
    
    // Filter by date range
    if (exportType === 'range') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        return []; // Invalid date range
      }
      
      filteredActivities = filteredActivities.filter(activity => {
        const activityDate = parseISO(activity.startTime);
        return (
          activityDate >= start && 
          activityDate <= new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1) // Include all of end date
        );
      });
    } else {
      // Single day export
      filteredActivities = filteredActivities.filter(activity => 
        isSameDay(activity.startTime, currentDate)
      );
    }
    
    // Filter by categories if enabled
    if (filterByCategories && selectedCategories.length > 0) {
      filteredActivities = filteredActivities.filter(activity => 
        selectedCategories.includes(activity.category)
      );
    }
    
    return filteredActivities;
  };

  // Export handlers
  const handleCopyToClipboard = () => {
    const dataToExport = {
      dateRange: exportType === 'range' ? { startDate, endDate } : { date: currentDate },
      activities: getFilteredActivities(),
      exportTimestamp: new Date().toISOString()
    };
    
    navigator.clipboard.writeText(JSON.stringify(dataToExport, null, 2))
      .then(() => {
        alert('Activities copied to clipboard as JSON');
        onClose();
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy to clipboard');
      });
  };

  const handleDownloadJson = () => {
    const filteredActivities = getFilteredActivities();
    
    const dataToExport = {
      dateRange: exportType === 'range' ? { startDate, endDate } : { date: currentDate },
      activities: filteredActivities,
      exportTimestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    let filename;
    if (exportType === 'range') {
      filename = `activity-export-${startDate}-to-${endDate}.json`;
    } else {
      filename = `activity-export-${format(parseISO(currentDate), 'yyyy-MM-dd')}.json`;
    }
    
    if (filterByCategories && selectedCategories.length > 0) {
      filename = `filtered-${filename}`;
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  const filteredActivities = getFilteredActivities();
  const hasActivities = filteredActivities.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-800">Export Options</h2>
        <button
          onClick={onClose}
          className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
        >
          <X size={20} />
        </button>
      </div>

      {/* Export type selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-neutral-700 mb-2">Export Type</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="exportType"
              checked={exportType === 'day'}
              onChange={() => setExportType('day')}
              className="mr-2"
            />
            <span className="text-sm">Current Day</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="exportType"
              checked={exportType === 'range'}
              onChange={() => setExportType('range')}
              className="mr-2"
            />
            <span className="text-sm">Date Range</span>
          </label>
        </div>
      </div>

      {/* Date range selector (visible only for range export) */}
      {exportType === 'range' && (
        <div className="mb-4 p-3 bg-neutral-50 rounded-md border border-neutral-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-md w-full text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-md w-full text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Category filter toggle */}
      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={filterByCategories}
            onChange={() => setFilterByCategories(!filterByCategories)}
            className="mr-2"
          />
          <span className="text-sm font-medium text-neutral-700">Filter by categories</span>
        </label>
      </div>

      {/* Category selection (visible only when filter is enabled) */}
      {filterByCategories && (
        <div className="mb-4 p-3 bg-neutral-50 rounded-md border border-neutral-200">
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-neutral-600">Work Categories</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selectAllInGroup('work')}
                  className="text-xs text-accent-600 hover:text-accent-800"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => deselectAllInGroup('work')}
                  className="text-xs text-accent-600 hover:text-accent-800"
                >
                  Deselect all
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {storedCategories.categories.work.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    selectedCategories.includes(category)
                      ? 'bg-accent-600 text-white'
                      : 'bg-accent-100 text-accent-700 hover:bg-accent-200'
                  }`}
                >
                  {selectedCategories.includes(category) && <Check size={12} />}
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-neutral-600">Personal Categories</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selectAllInGroup('personal')}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => deselectAllInGroup('personal')}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  Deselect all
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {storedCategories.categories.personal.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    selectedCategories.includes(category)
                      ? 'bg-primary-600 text-white'
                      : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  }`}
                >
                  {selectedCategories.includes(category) && <Check size={12} />}
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      <div className="mb-4 p-3 bg-neutral-50 rounded-md border border-neutral-200">
        <h3 className="text-sm font-medium text-neutral-700 mb-2">Export Preview</h3>
        <p className="text-sm text-neutral-600">
          {hasActivities ? (
            <>
              <span className="font-medium">{filteredActivities.length}</span> activities will be exported
            </>
          ) : (
            <span className="text-red-600">No activities match your filters</span>
          )}
        </p>
      </div>

      {/* Export Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleCopyToClipboard}
          disabled={!hasActivities}
          className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 ${
            hasActivities
              ? 'bg-accent-600 hover:bg-accent-700 text-white'
              : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
          }`}
        >
          <Clipboard size={16} />
          <span>Copy to Clipboard</span>
        </button>
        <button
          onClick={handleDownloadJson}
          disabled={!hasActivities}
          className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 ${
            hasActivities
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
          }`}
        >
          <Download size={16} />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
}; 