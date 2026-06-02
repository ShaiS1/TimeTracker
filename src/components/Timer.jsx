import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock, ExternalLink } from 'lucide-react';
import { getTimerState, saveTimerState } from '../utils/storage';

export default function Timer({ userId, clients, categories, onLogEntry }) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  
  const countRef = useRef(null);
  const isPopout = window.location.search.includes('popout=true');

  // Load state from localStorage on mount and when userId changes
  useEffect(() => {
    if (!userId) return;
    syncFromStorage();

    const handleStorageChange = (e) => {
      if (e.key === `tempo_timer_state_${userId}`) {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userId]);

  // Sync function to read active timer state
  const syncFromStorage = () => {
    const state = getTimerState(userId);
    if (state) {
      setIsActive(state.isRunning);
      setIsPaused(state.isPaused);
      setSelectedClientId(state.clientId || '');
      setSelectedCategory(state.category || '');
      setDescription(state.description || '');

      if (state.isRunning && !state.isPaused && state.startTime) {
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        setSeconds(state.accumulatedSeconds + elapsed);
      } else {
        setSeconds(state.accumulatedSeconds);
      }
    } else {
      setIsActive(false);
      setIsPaused(false);
      setSeconds(0);
      setDescription('');
      if (clients.length > 0) setSelectedClientId(clients[0].id);
      if (categories.length > 0) setSelectedCategory(categories[0]);
    }
  };

  // Automatically select default values
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId && !isActive) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, isActive]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory && !isActive) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, isActive]);

  // Timer Tick implementation
  useEffect(() => {
    if (isActive && !isPaused) {
      countRef.current = setInterval(() => {
        // Recalculate accurately based on start time from localStorage to prevent drifting
        const state = getTimerState(userId);
        if (state && state.startTime) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          setSeconds(state.accumulatedSeconds + elapsed);
        } else {
          setSeconds((s) => s + 1);
        }
      }, 1000);
    } else {
      clearInterval(countRef.current);
    }
    return () => clearInterval(countRef.current);
  }, [isActive, isPaused, userId]);

  const handleStart = () => {
    const newState = {
      startTime: Date.now(),
      accumulatedSeconds: 0,
      isRunning: true,
      isPaused: false,
      clientId: selectedClientId,
      category: selectedCategory,
      description
    };
    saveTimerState(userId, newState);
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    const nextPaused = !isPaused;
    let newState;
    if (nextPaused) {
      newState = {
        startTime: null,
        accumulatedSeconds: seconds,
        isRunning: true,
        isPaused: true,
        clientId: selectedClientId,
        category: selectedCategory,
        description
      };
    } else {
      newState = {
        startTime: Date.now(),
        accumulatedSeconds: seconds,
        isRunning: true,
        isPaused: false,
        clientId: selectedClientId,
        category: selectedCategory,
        description
      };
    }
    saveTimerState(userId, newState);
    setIsPaused(nextPaused);
  };

  const handleReset = () => {
    clearInterval(countRef.current);
    saveTimerState(userId, null);
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

    const durationHours = parseFloat((seconds / 3600).toFixed(2));
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

  const popOutTimer = () => {
    const width = 400;
    const height = 500;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      `${window.location.origin}/?popout=true`, 
      'TempoActiveTimer', 
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,location=no,toolbar=no,menubar=no`
    );
  };

  return (
    <div className="card timer-panel" style={{ height: isPopout ? '100vh' : 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: isPopout ? 'none' : '', margin: isPopout ? 0 : '', borderRadius: isPopout ? 0 : '' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: isPopout ? '1px solid var(--border-color)' : '', paddingBottom: isPopout ? '0.75rem' : '' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} className={isActive && !isPaused ? "pulse-animate" : ""} style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Active Time Tracker</h2>
        </div>
        {!isPopout && (
          <button 
            className="btn btn-secondary btn-icon-only btn-sm" 
            onClick={popOutTimer}
            title="Pop out timer into dedicated window"
          >
            <ExternalLink size={14} />
          </button>
        )}
      </div>

      <div className="timer-display-container" style={{ margin: isPopout ? '2rem 0' : '' }}>
        <div className={`timer-pulse-circle ${isActive && !isPaused ? 'active' : ''}`} />
        <div className="timer-digits" style={{ fontSize: isPopout ? '3.5rem' : '2.8rem' }}>{formatTime(seconds)}</div>
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
              <Square size={16} /> Log ({parseFloat((seconds/3600).toFixed(2))}h)
            </button>
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: isPopout ? 'auto' : 'visible' }}>
        <div className="form-group">
          <label>Select Client</label>
          <select 
            className="select-field" 
            value={selectedClientId} 
            onChange={(e) => {
              setSelectedClientId(e.target.value);
              // Save state change if active
              if (isActive) {
                const state = getTimerState(userId);
                if (state) {
                  state.clientId = e.target.value;
                  saveTimerState(userId, state);
                }
              }
            }}
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
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              if (isActive) {
                const state = getTimerState(userId);
                if (state) {
                  state.category = e.target.value;
                  saveTimerState(userId, state);
                }
              }
            }}
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
            onChange={(e) => {
              setDescription(e.target.value);
              if (isActive) {
                const state = getTimerState(userId);
                if (state) {
                  state.description = e.target.value;
                  saveTimerState(userId, state);
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
