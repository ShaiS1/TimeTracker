import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Edit } from 'lucide-react';

export default function EntryForm({ clients, categories, onLogEntry, initialValues, onCancel }) {
  const [clientId, setClientId] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Unbilled');
  const [isBillable, setIsBillable] = useState(true);

  const sortedClients = React.useMemo(() => {
    return [...clients].sort((a, b) => {
      const pinA = !!a.isPinned;
      const pinB = !!b.isPinned;
      if (pinA && !pinB) return -1;
      if (!pinA && pinB) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [clients]);

  const sortedCategories = React.useMemo(() => {
    return [...categories].sort((a, b) => {
      const pinA = !!a.isPinned;
      const pinB = !!b.isPinned;
      if (pinA && !pinB) return -1;
      if (!pinA && pinB) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [categories]);

  // Pre-fill fields if we are editing an existing entry
  useEffect(() => {
    if (initialValues) {
      setClientId(initialValues.clientId || '');
      setCategory(initialValues.category || '');
      setDuration(initialValues.duration ? initialValues.duration.toString() : '');
      setDate(initialValues.date || new Date().toISOString().split('T')[0]);
      setDescription(initialValues.description || '');
      setStatus(initialValues.status || 'Unbilled');
      setIsBillable(initialValues.isBillable !== false);
    } else {
      setIsBillable(true);
      if (clients.length > 0) setClientId(clients[0].id);
      if (categories.length > 0) setCategory(categories[0].name || categories[0]);
    }
  }, [initialValues, clients, categories]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clientId) {
      alert('Please select a client.');
      return;
    }
    if (!category) {
      alert('Please select a category.');
      return;
    }
    const hours = parseFloat(duration);
    if (isNaN(hours) || hours <= 0) {
      alert('Please enter a valid positive number of hours.');
      return;
    }

    const client = clients.find(c => c.id === clientId);
    const rate = client ? client.defaultRate : 0;

    const payload = {
      clientId,
      category,
      duration: hours,
      rate,
      date,
      description: description.trim() || 'No description provided.',
      status,
      isBillable
    };

    if (initialValues?.id) {
      payload.id = initialValues.id;
      if (initialValues.invoiceNumber) {
        payload.invoiceNumber = initialValues.invoiceNumber;
      }
    }

    onLogEntry(payload);
    
    // Reset if it's a new entry
    if (!initialValues) {
      setDuration('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsBillable(true);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
        <Edit size={20} style={{ color: 'var(--color-primary)' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {initialValues ? 'Modify Time Log' : 'Manual Time Logger'}
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Client</label>
          <select 
            className="select-field" 
            value={clientId} 
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="" disabled>Choose client...</option>
            {sortedClients.map(c => (
              <option key={c.id} value={c.id}>
                {c.isPinned ? '📌 ' : ''}{c.name} (${c.defaultRate}/hr)
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Work Category</label>
          <select 
            className="select-field" 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="" disabled>Choose category...</option>
            {sortedCategories.map((cat, idx) => (
              <option key={cat.id || idx} value={cat.name}>
                {cat.isPinned ? '📌 ' : ''}{cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Duration (Hours)</label>
          <input 
            type="number" 
            className="input-field" 
            placeholder="e.g. 3.5" 
            step="0.01" 
            min="0.01" 
            value={duration} 
            onChange={(e) => setDuration(e.target.value)} 
            required
          />
        </div>

        <div className="form-group">
          <label>Date of Work</label>
          <input 
            type="date" 
            className="input-field" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Work Description</label>
        <textarea 
          className="textarea-field" 
          rows="3" 
          placeholder="Details about what you worked on..." 
          value={description} 
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
        <input 
          type="checkbox" 
          id="form-billable-toggle" 
          checked={isBillable} 
          onChange={(e) => setIsBillable(e.target.checked)}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="form-billable-toggle" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}>
          This work is billable
        </label>
      </div>

      {initialValues && (
        <div className="form-group">
          <label>Billing Status</label>
          <select 
            className="select-field" 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Unbilled">Unbilled</option>
            <option value="Billed">Billed (Invoiced)</option>
            <option value="Paid">Paid (Settled)</option>
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {initialValues ? 'Save Log' : 'Save Time Entry'}
        </button>
      </div>
    </form>
  );
}
