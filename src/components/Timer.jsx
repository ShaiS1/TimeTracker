import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock } from 'lucide-react';

export default function Timer({ clients, categories, onLogEntry }) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  
  const countRef = useRef(null);

  // Automatically select the first client and category if available
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories]);

  useEffect(() => {
    if (isActive && !isPaused) {
      countRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(countRef.current);
    }
    return () => clearInterval(countRef.current);
  }, [isActive, isPaused]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    clearInterval(countRef.current);
    setIsActive(false);
    setIsPaused(false);
    setSeconds(0);
  };

  const handleLog = () => {
    if (seconds < 3) {
      alert("Please track at least 3 seconds of work before logging.");
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) {
      alert("Please select a valid client.");
      return;
    }

    // Convert seconds to hours (rounded to 2 decimal places)
    const durationHours = parseFloat((seconds / 3600).toFixed(2));
    
    // Fallback if rounded to 0.00 (force minimum of 0.01 hours)
    const finalDuration = durationHours > 0 ? durationHours : 0.01;

    onLogEntry({
      clientId: selectedClientId,
      category: selectedCategory,
      duration: finalDuration,
      rate: client.defaultRate,
      description: description || 'Timer log entry',
      date: new Date().toISOString().split('T')[0],
      status: 'Unbilled'
    });

    // Reset timer state
    handleReset();
    setDescription('');
  };

  const formatTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    const pad = (val) => String(val).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  return (
    <div className="card timer-panel">
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Clock size={20} className={isActive && !isPaused ? "pulse-animate" : ""} style={{ color: 'var(--color-primary)' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Active Time Tracker</h2>
      </div>

      <div className="timer-display-container">
        <div className={`timer-pulse-circle ${isActive && !isPaused ? 'active' : ''}`} />
        <div className="timer-digits">{formatTime(seconds)}</div>
      </div>

      <div className="timer-controls" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
        {!isActive && (
          <button className="btn btn-primary" onClick={handleStart}>
            <Play size={18} /> Start Timer
          </button>
        )}
        
        {isActive && (
          <>
            <button className="btn btn-secondary" onClick={handlePause}>
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button className="btn btn-danger" onClick={handleReset}>
              Reset
            </button>
            <button className="btn btn-primary" onClick={handleLog} style={{ backgroundColor: 'var(--color-paid)' }}>
              <Square size={16} /> Log Hours ({parseFloat((seconds/3600).toFixed(2))}h)
            </button>
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label>Select Client</label>
          <select 
            className="select-field" 
            value={selectedClientId} 
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={isActive}
          >
            {clients.length === 0 ? (
              <option value="">No clients found</option>
            ) : (
              clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} (${c.defaultRate}/hr)</option>
              ))
            )}
          </select>
        </div>

        <div className="form-group">
          <label>Select Work Category</label>
          <select 
            className="select-field" 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={isActive}
          >
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Description of Work</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="What are you working on?" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
