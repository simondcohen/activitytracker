import React, { useState, KeyboardEvent } from 'react';
import { CategoryGroup, StoredCategories } from '../types';
import { Plus, X, Pencil, Save, Trash2 } from 'lucide-react';

interface CategoryManagerProps {
  storedCategories: StoredCategories;
  onUpdateCategories: (categories: StoredCategories) => void;
  onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  storedCategories,
  onUpdateCategories,
  onClose,
}) => {
  const [editingCategory, setEditingCategory] = useState<{
    type: 'work' | 'personal';
    index: number;
    value: string;
  } | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [selectedType, setSelectedType] = useState<'work' | 'personal'>('work');

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;

    const updatedCategories = { ...storedCategories };
    updatedCategories.categories = {
      ...updatedCategories.categories,
      [selectedType]: [...updatedCategories.categories[selectedType], newCategory.trim()],
    };

    onUpdateCategories(updatedCategories);
    setNewCategory('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newCategory.trim()) {
      e.preventDefault();
      handleAddCategory();
    }
  };

  const handleDeleteCategory = (type: 'work' | 'personal', index: number) => {
    const updatedCategories = { ...storedCategories };
    updatedCategories.categories[type] = updatedCategories.categories[type].filter(
      (_, i) => i !== index
    );
    onUpdateCategories(updatedCategories);
  };

  const handleStartEdit = (type: 'work' | 'personal', index: number, value: string) => {
    setEditingCategory({ type, index, value });
  };

  const handleSaveEdit = () => {
    if (!editingCategory || !editingCategory.value.trim()) return;

    const updatedCategories = { ...storedCategories };
    updatedCategories.categories[editingCategory.type] = updatedCategories.categories[
      editingCategory.type
    ].map((item, index) => (index === editingCategory.index ? editingCategory.value.trim() : item));

    onUpdateCategories(updatedCategories);
    setEditingCategory(null);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingCategory(null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderCategoryList = (
    type: 'work' | 'personal',
    items: string[]
  ) => (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={`${type}-${index}`}
          className="flex items-center justify-between bg-neutral-50 p-2 rounded-md border border-neutral-200"
        >
          {editingCategory?.type === type && editingCategory?.index === index ? (
            <input
              type="text"
              value={editingCategory.value}
              onChange={(e) =>
                setEditingCategory({ ...editingCategory, value: e.target.value })
              }
              onKeyDown={handleEditKeyDown}
              className="input flex-1 mr-2 py-1 text-sm"
              autoFocus
            />
          ) : (
            <span className="flex-1 text-neutral-700">{item}</span>
          )}
          <div className="flex gap-1">
            {editingCategory?.type === type && editingCategory?.index === index ? (
              <button
                onClick={handleSaveEdit}
                className="p-1 text-primary-600 hover:text-primary-800 rounded-full hover:bg-neutral-100"
                title="Save"
              >
                <Save size={16} />
              </button>
            ) : (
              <button
                onClick={() => handleStartEdit(type, index, item)}
                className="p-1 text-neutral-600 hover:text-neutral-800 rounded-full hover:bg-neutral-100"
                title="Edit"
              >
                <Pencil size={16} />
              </button>
            )}
            <button
              onClick={() => handleDeleteCategory(type, index)}
              className="p-1 text-neutral-600 hover:text-red-600 rounded-full hover:bg-neutral-100"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center py-3 text-neutral-500 text-sm bg-neutral-50 rounded-md border border-neutral-200">
          No {type} categories added yet
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50" onClick={handleClick}>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-200">
          <h2 className="text-xl font-medium text-neutral-800">Manage Categories</h2>
          <button
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="space-y-2 mb-4">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="New category name"
                className="input w-full"
                autoFocus
                aria-label="New category name"
              />
              <div className="flex gap-2">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as 'work' | 'personal')}
                  className="input py-2 px-3 flex-1"
                  aria-label="Category type"
                >
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                </select>
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim()}
                  className={`btn px-6 flex items-center justify-center gap-1 ${
                    newCategory.trim() 
                      ? 'btn-primary' 
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  }`}
                  aria-label="Add category"
                >
                  <Plus size={18} />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium mb-3 text-neutral-800">Work Categories</h3>
              {renderCategoryList('work', storedCategories.categories.work)}
            </div>

            <div>
              <h3 className="text-base font-medium mb-3 text-neutral-800">Personal Categories</h3>
              {renderCategoryList('personal', storedCategories.categories.personal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};