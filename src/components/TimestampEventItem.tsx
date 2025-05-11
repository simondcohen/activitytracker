import React, { useState } from 'react';
import { TimestampEvent } from '../types';
import { formatClock } from '../dateHelpers';
import { Flag, Pencil, Save, Trash2, X } from 'lucide-react';

interface TimestampEventItemProps {
  event: TimestampEvent;
  onUpdate: (event: TimestampEvent) => void;
  onDelete: (id: string) => void;
}

export const TimestampEventItem: React.FC<TimestampEventItemProps> = ({
  event,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    timestamp: string;
    notes: string;
  } | null>(null);

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      name: event.name,
      timestamp: event.timestamp,
      notes: event.notes || ''
    });
  };

  const handleSave = () => {
    if (!editForm) return;
    
    const updatedEvent: TimestampEvent = {
      ...event,
      name: editForm.name.trim(),
      notes: editForm.notes.trim() || undefined
    };
    
    onUpdate(updatedEvent);
    setIsEditing(false);
    setEditForm(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  return (
    <div className="card border-l-4 border-l-primary-300">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="text-sm font-medium text-neutral-800 mb-1">
            {event.name}
          </div>
          <div className="flex items-center text-neutral-700 text-sm">
            <Flag size={14} className="mr-1 text-primary-500" />
            <span>{formatClock(event.timestamp)}</span>
          </div>
          
          {event.notes && (
            <div className="mt-2 text-sm text-neutral-600 bg-neutral-50 p-2 rounded-md border border-neutral-200">
              {event.notes}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {!isEditing ? (
            <>
              <button
                onClick={handleEdit}
                className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
                title="Edit event"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this event?')) {
                    onDelete(event.id);
                  }
                }}
                className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
                title="Delete event"
              >
                <Trash2 size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="p-1 text-primary-600 hover:text-primary-800 rounded-full hover:bg-neutral-100"
              >
                <Save size={16} />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>
      
      {isEditing && editForm && (
        <div className="mt-3 p-3 bg-neutral-50 rounded-md border border-neutral-200">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Event Name
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="input w-full py-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                className="input w-full py-1 text-sm h-20 resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 