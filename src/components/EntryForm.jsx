import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Edit } from 'lucide-react';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default function EntryForm({ clients, categories, onLogEntry, initialValues, onCancel }) {
  const [clientId, setClientId] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Unbilled');
  const [isBillable, setIsBillable] = useState(true);
  const [nlpInput, setNlpInput] = useState('');

  const handleNLPParse = () => {
    if (!nlpInput.trim()) return;

    let text = nlpInput.trim();
    let parsedDuration = '';
    let parsedClientId = '';
    let parsedCategory = '';
    let parsedDescription = text;

    // 1. Parse duration
    const durationRegex = /\b(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i;
    const durationMatch = text.match(durationRegex);
    if (durationMatch) {
      parsedDuration = durationMatch[1];
      parsedDescription = parsedDescription.replace(durationMatch[0], '');
    }

    // 2. Parse client
    const sortedClients = [...clients].sort((a, b) => b.name.length - a.name.length);
    for (const client of sortedClients) {
      const clientRegex = new RegExp(`(?<=^|\\s|[.,;:!?\"'()[\\]{}])${escapeRegExp(client.name)}(?=$|\\s|[.,;:!?\"'()[\\]{}])`, 'i');
      if (clientRegex.test(parsedDescription)) {
        parsedClientId = client.id;
        parsedDescription = parsedDescription.replace(clientRegex, '');
        break;
      }
    }
    if (!parsedClientId) {
      for (const client of sortedClients) {
        const clientIndex = parsedDescription.toLowerCase().indexOf(client.name.toLowerCase());
        if (clientIndex !== -1) {
          parsedClientId = client.id;
          parsedDescription = parsedDescription.substring(0, clientIndex) + 
                              parsedDescription.substring(clientIndex + client.name.length);
          break;
        }
      }
    }

    // 3. Parse category
    const normalizedCats = categories.map(c => typeof c === 'string' ? { name: c } : c);
    const sortedCats = [...normalizedCats].sort((a, b) => (b.name || '').length - (a.name || '').length);

    for (const cat of sortedCats) {
      const catName = cat.name || '';
      if (!catName) continue;
      const catRegex = new RegExp(`(?<=^|\\s|[.,;:!?\"'()[\\]{}])${escapeRegExp(catName)}(?=$|\\s|[.,;:!?\"'()[\\]{}])`, 'i');
      if (catRegex.test(parsedDescription)) {
        parsedCategory = catName;
        parsedDescription = parsedDescription.replace(catRegex, '');
        break;
      }
    }
    if (!parsedCategory) {
      for (const cat of sortedCats) {
        const catName = cat.name || '';
        if (!catName) continue;
        const catIndex = parsedDescription.toLowerCase().indexOf(catName.toLowerCase());
        if (catIndex !== -1) {
          parsedCategory = catName;
          parsedDescription = parsedDescription.substring(0, catIndex) + 
                              parsedDescription.substring(catIndex + catName.length);
          break;
        }
      }
    }

    if (!parsedCategory) {
      const synonyms = {
        'dev': ['software', 'dev', 'coding', 'development', 'programming', 'code'],
        'design': ['design', 'ui', 'ux', 'figma', 'layout', 'graphics'],
        'consulting': ['consulting', 'consult', 'meeting', 'strategy', 'advisory'],
        'pm': ['project management', 'pm', 'management', 'scrum', 'sprint', 'planning'],
        'qa': ['qa', 'testing', 'test', 'bug', 'review', 'qa & testing'],
        'review': ['code review', 'review', 'pr']
      };

      const words = parsedDescription.toLowerCase().split(/\s+/);
      for (const cat of sortedCats) {
        const catName = cat.name || '';
        const catLower = catName.toLowerCase();
        let matched = false;
        
        for (const [key, list] of Object.entries(synonyms)) {
          if (catLower.includes(key) || list.some(syn => catLower.includes(syn))) {
            if (list.some(syn => words.includes(syn))) {
              parsedCategory = catName;
              const matchedSyn = list.find(syn => words.includes(syn));
              const synRegex = new RegExp(`(?<=^|\\s|[.,;:!?\"'()[\\]{}])${escapeRegExp(matchedSyn)}(?=$|\\s|[.,;:!?\"'()[\\]{}])`, 'i');
              parsedDescription = parsedDescription.replace(synRegex, '');
              matched = true;
              break;
            }
          }
        }
        if (matched) break;
      }
    }

    // 4. Clean description
    parsedDescription = parsedDescription
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[-_:,.\s]+|[-_:,.\s]+$/g, '')
      .trim();

    // 5. Populate states
    if (parsedClientId) setClientId(parsedClientId);
    if (parsedCategory) setCategory(parsedCategory);
    if (parsedDuration) setDuration(parsedDuration);
    if (parsedDescription) {
      setDescription(parsedDescription);
    } else {
      setDescription('Timer log entry');
    }

    setNlpInput('');
  };

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
      setDate(initialValues.date || getLocalDateString());
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
    if (!initialValues || !initialValues.id) {
      setDuration('');
      setDescription('');
      setDate(getLocalDateString());
      setIsBillable(true);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
        <Edit size={20} style={{ color: 'var(--color-primary)' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {initialValues && initialValues.id ? 'Modify Time Log' : 'Manual Time Logger'}
        </h2>
      </div>

      {!initialValues?.id && (
        <div className="form-group" style={{ borderBottom: '1px dashed var(--border-color)', paddingBottom: '1.25rem', marginBottom: '0.25rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            <span>Smart NLP Log Parser (Beta)</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
              Format: Client [hours]h [category] [description]
            </span>
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Acme 2.5h software development implemented login page" 
              value={nlpInput} 
              onChange={(e) => setNlpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleNLPParse();
                }
              }}
            />
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleNLPParse}
              style={{ flexShrink: 0 }}
            >
              Parse
            </button>
          </div>
        </div>
      )}

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
