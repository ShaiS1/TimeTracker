import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Square, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { getTimerState, saveTimerState, getCloudTimerState, saveCloudTimerState } from '../utils/storage';
import { generateClient } from 'aws-amplify/data';
import outputs from '../../amplify_outputs.json';

const isAmplifyConfigured = outputs && Object.keys(outputs).length > 0;
const dataClient = isAmplifyConfigured ? generateClient() : null;

export default function Timer({ userId, clients, categories, onLogEntry, entries = [], userProfile = {} }) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);

  // Rounding helper
  const getRoundedDurationLocal = (duration, clientId, clientsList, profile) => {
    const client = clientsList.find(c => c.id === clientId);
    let rule = client?.roundingRule || 'default';
    
    if (rule === 'default') {
      rule = profile?.defaultRounding || 'none';
    }
    
    if (rule === 'none') {
      return duration;
    }
    
    let rounded = duration;
    if (rule === 'nearest_6') {
      rounded = Math.round(duration * 10) / 10;
    } else if (rule === 'nearest_15') {
      rounded = Math.round(duration * 4) / 4;
    } else if (rule === 'nearest_30') {
      rounded = Math.round(duration * 2) / 2;
    } else if (rule === 'ceil_15') {
      rounded = Math.ceil(duration * 4) / 4;
    }
    
    return rounded > 0 ? parseFloat(rounded.toFixed(2)) : 0.01;
  };

  const roundedHours = useMemo(() => {
    if (!isActive || seconds <= 0) return 0;
    const actualHours = seconds / 3600;
    return getRoundedDurationLocal(actualHours, selectedClientId, clients, userProfile);
  }, [seconds, isActive, selectedClientId, clients, userProfile]);

  const activeClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const defaultRate = activeClient ? activeClient.defaultRate : 0;

  // Handle global shortcut custom event to toggle timer
  useEffect(() => {
    const handleToggleEvent = () => {
      if (isActive) {
        handlePause();
      } else {
        handleStart();
      }
    };
    window.addEventListener('tempo-toggle-timer', handleToggleEvent);
    return () => window.removeEventListener('tempo-toggle-timer', handleToggleEvent);
  }, [isActive, isPaused, selectedClientId, selectedCategory, description, isBillable, seconds]);

  const [idleThreshold, setIdleThreshold] = useState(() => {
    return parseFloat(localStorage.getItem(`tempo_idle_threshold_${userId}`)) || 5;
  });
  const [idleEnabled, setIdleEnabled] = useState(() => {
    return localStorage.getItem(`tempo_idle_enabled_${userId}`) !== 'false';
  });
  const [showIdleModal, setShowIdleModal] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [idleStartTimestamp, setIdleStartTimestamp] = useState(null);

  const budgetUsage = useMemo(() => {
    if (!selectedClientId || !entries || entries.length === 0) return null;
    const client = clients.find(c => c.id === selectedClientId);
    if (!client || !client.budgetType || client.budgetType === 'none' || !client.budgetLimit) return null;
    
    const getStartOfWeek = () => {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day;
      const sunday = new Date(today.getFullYear(), today.getMonth(), diff);
      sunday.setHours(0, 0, 0, 0);
      return sunday;
    };
    
    const getStartOfMonth = () => {
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth(), 1);
    };
    
    const period = client.budgetPeriod || 'total';
    let filterDate = null;
    if (period === 'weekly') {
      filterDate = getStartOfWeek();
    } else if (period === 'monthly') {
      filterDate = getStartOfMonth();
    }
    
    let sum = 0;
    entries.forEach(entry => {
      if (entry.clientId !== client.id) return;
      
      if (filterDate) {
        const [y, m, d] = entry.date.split('-').map(Number);
        const entryDate = new Date(y, m - 1, d);
        if (entryDate < filterDate) return;
      }
      
      if (client.budgetType === 'hours') {
        sum += entry.duration;
      } else if (client.budgetType === 'revenue') {
        sum += entry.isBillable !== false ? entry.duration * entry.rate : 0;
      }
    });
    
    if (isActive && !isPaused && seconds > 0) {
      const currentHours = seconds / 3600;
      if (client.budgetType === 'hours') {
        sum += currentHours;
      } else if (client.budgetType === 'revenue' && isBillable) {
        sum += currentHours * client.defaultRate;
      }
    }
    
    const limit = client.budgetLimit;
    const percent = limit > 0 ? (sum / limit) * 100 : 0;
    
    return {
      sum,
      limit,
      percent,
      type: client.budgetType,
      period
    };
  }, [selectedClientId, entries, clients, seconds, isActive, isPaused, isBillable]);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const pinA = !!a.isPinned;
      const pinB = !!b.isPinned;
      if (pinA && !pinB) return -1;
      if (!pinA && pinB) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [clients]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const pinA = !!a.isPinned;
      const pinB = !!b.isPinned;
      if (pinA && !pinB) return -1;
      if (!pinA && pinB) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [categories]);
  
  const countRef = useRef(null);
  const debounceRef = useRef(null);
  const pendingStateRef = useRef(null);
  const isPopout = window.location.search.includes('popout=true');

  const saveState = async (state) => {
    saveTimerState(userId, state);
    if (isAmplifyConfigured && dataClient) {
      try {
        await saveCloudTimerState(dataClient, state);
      } catch (err) {
        console.warn("Failed to sync timer state to cloud (offline fallback):", err);
      }
    }
  };

  const saveStateDebounced = (state) => {
    saveTimerState(userId, state);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(async () => {
      if (isAmplifyConfigured && dataClient) {
        try {
          await saveCloudTimerState(dataClient, state);
          pendingStateRef.current = null;
        } catch (err) {
          console.warn("Failed to sync debounced description to cloud:", err);
        }
      }
    }, 1000);
  };

  // Load state from localStorage & Cloud on mount and when userId changes
  useEffect(() => {
    if (!userId) return;

    const initTimer = async () => {
      syncFromStorage();
      
      if (isAmplifyConfigured && dataClient) {
        const cloudState = await getCloudTimerState(dataClient);
        if (cloudState) {
          const restoredState = {
            startTime: cloudState.startTime,
            accumulatedSeconds: cloudState.accumulatedSeconds,
            isRunning: cloudState.isRunning,
            isPaused: cloudState.isPaused,
            clientId: cloudState.clientId || '',
            category: cloudState.category || '',
            description: cloudState.description || '',
            isBillable: cloudState.isBillable !== false
          };
          
          const localState = getTimerState(userId);
          if (!localState || 
              localState.startTime !== restoredState.startTime || 
              localState.accumulatedSeconds !== restoredState.accumulatedSeconds ||
              localState.isRunning !== restoredState.isRunning ||
              localState.isPaused !== restoredState.isPaused ||
              localState.clientId !== restoredState.clientId ||
              localState.category !== restoredState.category ||
              localState.description !== restoredState.description ||
              localState.isBillable !== restoredState.isBillable) {
            
            saveTimerState(userId, restoredState);
            syncFromStorage();
          }
        }
      }
    };

    initTimer();

    const handleStorageChange = (e) => {
      if (e.key === `tempo_timer_state_${userId}`) {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        if (isAmplifyConfigured && dataClient && pendingStateRef.current) {
          saveCloudTimerState(dataClient, pendingStateRef.current).catch(err => {
            console.warn("Failed to sync cleanup timer state to cloud:", err);
          });
        }
      }
    };
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
      setIsBillable(state.isBillable !== false);

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
      setIsBillable(true);
      if (clients.length > 0) setSelectedClientId(clients[0].id);
      if (categories.length > 0) setSelectedCategory(categories[0].name || categories[0]);
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
      setSelectedCategory(categories[0].name || categories[0]);
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

  // Listen for user activity events
  useEffect(() => {
    if (!isActive || isPaused || !idleEnabled) return;

    const updateActivity = () => {
      localStorage.setItem('tempo_last_active_time', Date.now().toString());
    };

    updateActivity();

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, updateActivity));

    return () => {
      events.forEach(evt => window.removeEventListener(evt, updateActivity));
    };
  }, [isActive, isPaused, idleEnabled]);

  // Polling loop for idle state trigger
  useEffect(() => {
    if (!isActive || isPaused || !idleEnabled || showIdleModal || !userId) return;

    const interval = setInterval(() => {
      const lastActive = parseInt(localStorage.getItem('tempo_last_active_time')) || Date.now();
      const elapsedIdleMs = Date.now() - lastActive;
      const thresholdMs = idleThreshold * 60 * 1000;
      
      const isTestMode = window.location.search.includes('test_idle=true') || idleThreshold === 0.16;
      const targetThresholdMs = isTestMode ? 10000 : thresholdMs;

      if (elapsedIdleMs >= targetThresholdMs) {
        setIdleStartTimestamp(lastActive);
        
        const state = getTimerState(userId);
        if (state) {
          state.isRunning = true;
          state.isPaused = true;
          const elapsedBeforeIdle = Math.floor((lastActive - state.startTime) / 1000);
          state.accumulatedSeconds += elapsedBeforeIdle;
          state.startTime = null;
          saveState(state);
        }
        setIsPaused(true);
        setIdleSeconds(Math.floor(elapsedIdleMs / 1000));
        setShowIdleModal(true);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, idleEnabled, idleThreshold, showIdleModal, userId]);

  const handleStart = () => {
    const newState = {
      startTime: Date.now(),
      accumulatedSeconds: 0,
      isRunning: true,
      isPaused: false,
      clientId: selectedClientId,
      category: selectedCategory,
      description,
      isBillable
    };
    saveState(newState);
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
        description,
        isBillable
      };
    } else {
      newState = {
        startTime: Date.now(),
        accumulatedSeconds: seconds,
        isRunning: true,
        isPaused: false,
        clientId: selectedClientId,
        category: selectedCategory,
        description,
        isBillable
      };
    }
    saveState(newState);
    setIsPaused(nextPaused);
  };

  const handleReset = () => {
    clearInterval(countRef.current);
    saveState(null);
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
      status: 'Unbilled',
      isBillable
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
    <div className="card timer-panel" style={{ height: isPopout ? '100vh' : 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', border: isPopout ? 'none' : '', margin: isPopout ? 0 : '', borderRadius: isPopout ? 0 : '' }}>
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

      {budgetUsage && budgetUsage.percent >= 90 && (
        <div style={{ 
          padding: '0.75rem 1rem', 
          backgroundColor: budgetUsage.percent >= 100 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)', 
          border: `1px solid ${budgetUsage.percent >= 100 ? 'var(--color-danger)' : 'var(--color-unbilled)'}`, 
          borderRadius: 'var(--radius-md)', 
          color: budgetUsage.percent >= 100 ? 'var(--color-danger)' : 'var(--color-unbilled)',
          fontSize: '0.85rem', 
          fontWeight: 600, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          marginBottom: '1rem',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>
            {budgetUsage.percent >= 100 ? 'Cap Exceeded: ' : 'Budget Alert: '}
            {clients.find(c => c.id === selectedClientId)?.name} is at {budgetUsage.percent.toFixed(0)}% of {budgetUsage.period} {budgetUsage.type} limit ({budgetUsage.sum.toFixed(1)} / {budgetUsage.limit} {budgetUsage.type === 'hours' ? 'hrs' : '$'}).
          </span>
        </div>
      )}

      <div className="timer-display-container" style={{ margin: isPopout ? '2rem 0' : '', paddingBottom: '0.5rem' }}>
        <div className={`timer-pulse-circle ${isActive && !isPaused ? 'active' : ''}`} />
        <div className="timer-digits" style={{ fontSize: isPopout ? '3.5rem' : '2.8rem', marginBottom: '0.25rem' }}>{formatTime(seconds)}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isBillable ? 'var(--color-primary)' : 'var(--text-muted)', zIndex: 1 }}>
          {isBillable ? (
            <span>Billable ({clients.find(c => c.id === selectedClientId)?.defaultRate ? `$${clients.find(c => c.id === selectedClientId).defaultRate}/hr` : '—'})</span>
          ) : (
            <span style={{ textDecoration: 'line-through' }}>Non-Billable ($0.00/hr)</span>
          )}
        </div>
        {isActive && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-secondary)', 
            marginTop: '0.5rem', 
            zIndex: 1, 
            display: 'flex', 
            gap: '0.6rem',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            padding: '0.2rem 0.5rem',
            borderRadius: '50px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <span>Actual: {(seconds / 3600).toFixed(2)}h</span>
            <span style={{ color: 'var(--border-color)', width: '1px' }}>|</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Rounded Preview: {roundedHours.toFixed(2)}h {isBillable && `(${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(roundedHours * defaultRate)})`}</span>
          </div>
        )}
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
                  saveState(state);
                }
              }
            }}
            disabled={isActive}
          >
            {sortedClients.length === 0 ? (
              <option value="">No clients found</option>
            ) : (
              sortedClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.isPinned ? '📌 ' : ''}{c.name} (${c.defaultRate}/hr)
                </option>
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
                  saveState(state);
                }
              }
            }}
            disabled={isActive}
          >
            {sortedCategories.map((cat, idx) => (
              <option key={cat.id || idx} value={cat.name}>
                {cat.isPinned ? '📌 ' : ''}{cat.name}
              </option>
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
                  pendingStateRef.current = state;
                  saveStateDebounced(state);
                }
              }
            }}
          />
        </div>

        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <input 
            type="checkbox" 
            id="timer-billable-toggle" 
            checked={isBillable} 
            onChange={(e) => {
              const nextVal = e.target.checked;
              setIsBillable(nextVal);
              if (isActive) {
                const state = getTimerState(userId);
                if (state) {
                  state.isBillable = nextVal;
                  saveState(state);
                }
              }
            }}
            disabled={isActive}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="timer-billable-toggle" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}>
            This work is billable
          </label>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              id="idle-detection-enable"
              checked={idleEnabled}
              onChange={(e) => {
                setIdleEnabled(e.target.checked);
                localStorage.setItem(`tempo_idle_enabled_${userId}`, e.target.checked.toString());
              }}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="idle-detection-enable" style={{ fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
              Enable Inactivity Idle Detection
            </label>
          </div>
          
          {idleEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fadeIn 0.2s ease-out' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Idle Threshold:</label>
              <select
                className="select-field"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-sidebar)' }}
                value={idleThreshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setIdleThreshold(val);
                  localStorage.setItem(`tempo_idle_threshold_${userId}`, val.toString());
                }}
              >
                <option value="1">1 minute</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="0.16">10 seconds (Testing)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {showIdleModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-unbilled)', marginBottom: '1.25rem' }}>
              <Clock size={40} className="pulse-animate" />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Are you still working?</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              No activity was detected for {idleThreshold === 0.16 ? '10 seconds' : `${idleThreshold}m`}. We've paused your timer to protect your logs.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  const state = getTimerState(userId);
                  const currentAccumulated = state ? state.accumulatedSeconds : seconds;
                  const newState = {
                    startTime: Date.now(),
                    accumulatedSeconds: currentAccumulated + idleSeconds,
                    isRunning: true,
                    isPaused: false,
                    clientId: selectedClientId,
                    category: selectedCategory,
                    description,
                    isBillable
                  };
                  saveState(newState);
                  setIsPaused(false);
                  setIsActive(true);
                  setShowIdleModal(false);
                }}
              >
                Keep Idle Time & Resume
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  const state = getTimerState(userId);
                  const currentAccumulated = state ? state.accumulatedSeconds : seconds;
                  const newState = {
                    startTime: Date.now(),
                    accumulatedSeconds: currentAccumulated,
                    isRunning: true,
                    isPaused: false,
                    clientId: selectedClientId,
                    category: selectedCategory,
                    description,
                    isBillable
                  };
                  saveState(newState);
                  setIsPaused(false);
                  setIsActive(true);
                  setShowIdleModal(false);
                }}
              >
                Discard Idle Time & Resume
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowIdleModal(false);
                  }}
                >
                  Keep & Pause
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={() => {
                    handleReset();
                    setShowIdleModal(false);
                  }}
                >
                  Discard & Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
