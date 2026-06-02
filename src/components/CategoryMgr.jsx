import React, { useState } from 'react';
import { Plus, Trash2, FolderPlus, Edit2, Check, X } from 'lucide-react';

export default function CategoryMgr({ categories, onAddCategory, onDeleteCategory, onUpdateCategory }) {
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingValue, setEditingValue] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    const cleanCat = newCategory.trim();
    if (!cleanCat) return;

    if (categories.some(c => c.toLowerCase() === cleanCat.toLowerCase())) {
      alert('This category already exists.');
      return;
    }

    onAddCategory(cleanCat);
    setNewCategory('');
  };

  const handleDelete = (cat) => {
    if (window.confirm(`Are you sure you want to delete the category "${cat}"? Existing time entries under this category will not be affected.`)) {
      onDeleteCategory(cat);
    }
  };

  const handleStartEdit = (idx, cat) => {
    setEditingIndex(idx);
    setEditingValue(cat);
  };

  const handleSaveEdit = (idx, oldCat) => {
    const cleanVal = editingValue.trim();
    if (!cleanVal) {
      alert('Category name cannot be empty.');
      return;
    }

    if (cleanVal.toLowerCase() !== oldCat.toLowerCase() && categories.some(c => c.toLowerCase() === cleanVal.toLowerCase())) {
      alert('This category already exists.');
      return;
    }

    onUpdateCategory(oldCat, cleanVal);
    setEditingIndex(-1);
  };

  const handleCancelEdit = () => {
    setEditingIndex(-1);
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <FolderPlus size={22} style={{ color: 'var(--color-primary)' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Work Categories</h2>
      </div>
      
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Customize the task categories available when logging hours (e.g. Consulting, UI Design, Content Writing). Modifying a category will automatically update all existing logs associated with it.
      </p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <input 
          type="text" 
          className="input-field" 
          placeholder="e.g. DevOps, Technical Writing" 
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
          <Plus size={16} /> Add
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {categories.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No categories defined.
          </div>
        ) : (
          categories.map((cat, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '0.75rem 1rem', 
                backgroundColor: 'rgba(255,255,255,0.02)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)' 
              }}
            >
              {editingIndex === idx ? (
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, marginRight: '1rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    required
                    autoFocus
                  />
                  <button 
                    className="btn btn-secondary btn-icon-only btn-sm"
                    style={{ color: 'var(--color-paid)', borderColor: 'rgba(16, 185, 129, 0.15)' }}
                    onClick={() => handleSaveEdit(idx, cat)}
                    title="Save"
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    className="btn btn-secondary btn-icon-only btn-sm"
                    onClick={handleCancelEdit}
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{cat}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary btn-icon-only btn-sm" 
                      onClick={() => handleStartEdit(idx, cat)}
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      className="btn btn-secondary btn-icon-only btn-sm" 
                      style={{ color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.15)' }}
                      onClick={() => handleDelete(cat)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
