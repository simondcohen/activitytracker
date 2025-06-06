import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MedicationEntry } from '../types';
import { toLocalISOString, getTodayDate } from '../dateHelpers';

interface MedicationFormProps {
  onAdd: (entry: MedicationEntry) => void;
  onClose: () => void;
  medications: string[];
}

export const MedicationForm: React.FC<MedicationFormProps> = ({ 
  onAdd, 
  onClose,
  medications 
}) => {
  const [medication, setMedication] = useState<string | null>(null);
  const [customMedication, setCustomMedication] = useState('');
  const [dose, setDose] = useState('');
  const [date, setDate] = useState(getTodayDate());
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  );
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!medication) {
      alert('Please select a medication');
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const timestamp = new Date(date);
    timestamp.setHours(hours, minutes, 0, 0);

    const newEntry: MedicationEntry = {
      id: crypto.randomUUID(),
      medication: medication === 'Other' ? 'Other' : medication,
      customMedication: medication === 'Other' ? customMedication : undefined,
      dose,
      timestamp: toLocalISOString(timestamp),
      notes,
    };

    onAdd(newEntry);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4" onClick={handleClick}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Add Medication Entry</h2>
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
            Medication
          </label>
          <div className="flex flex-wrap gap-2">
            {medications.map((med) => (
              <button
                type="button"
                key={med}
                onClick={() => setMedication(med)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  medication === med
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {med}
              </button>
            ))}
          </div>

          {medication === 'Other' && (
            <input
              type="text"
              value={customMedication}
              onChange={(e) => setCustomMedication(e.target.value)}
              placeholder="Enter medication name"
              className="mt-3 w-full px-3 py-2 border rounded-md"
              required
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dose/Servings
          </label>
          <input
            type="text"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes..."
            className="w-full px-3 py-2 border rounded-md h-24 resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} />
          Add Medication Entry
        </button>
      </form>
    </div>
  );
};