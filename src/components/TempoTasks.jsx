import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Info, 
  Folder, 
  X,
  Clock,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { 
  getTasks as getLocalTasks, 
  saveTasks as saveLocalTasks, 
  getTaskSessions as getLocalTaskSessions, 
  saveTaskSessions as saveLocalTaskSessions 
} from '../utils/storage';

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TempoTasks({ userId, isAmplifyConfigured, dataClient, categories = [], view = 'today' }) {
  const [activeTab, setActiveTab] = useState(view); // 'today' | 'backlog' | 'analytics'
  const [tasksList, setTasksList] = useState([]);
  const [sessionsList, setSessionsList] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Active running task timer state
  const [activeTimer, setActiveTimer] = useState(null); // { taskId, startTime, accumulatedSeconds, isRunning }
  const [elapsedTimerSeconds, setElapsedTimerSeconds] = useState(0);

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);

  // Form States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskEstHours, setTaskEstHours] = useState('0');
  const [taskEstMins, setTaskEstMins] = useState('30');
  const [taskCategory, setTaskCategory] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskScheduledForToday, setTaskScheduledForToday] = useState(true);

  // Helper to recursively retrieve paginated model listings
  const listAll = useCallback(async (model) => {
    let allItems = [];
    let nextToken = null;
    do {
      const res = await model.list({ nextToken });
      if (res.data) {
        allItems = allItems.concat(res.data);
      }
      nextToken = res.nextToken;
    } while (nextToken);
    return { data: allItems };
  }, []);

  // Fetch initial tasks & sessions data
  const fetchTasksData = useCallback(async () => {
    if (isAmplifyConfigured && dataClient) {
      try {
        const { data: tasksData } = await listAll(dataClient.models.Task);
        setTasksList(tasksData || []);
        const { data: sessionsData } = await listAll(dataClient.models.TaskSession);
        setSessionsList(sessionsData || []);
      } catch (err) {
        console.error("[TempoTasks] Failed to fetch cloud tasks:", err);
      }
    } else {
      setTasksList(getLocalTasks(userId));
      setSessionsList(getLocalTaskSessions(userId));
    }
  }, [userId, isAmplifyConfigured, dataClient, listAll]);

  useEffect(() => {
    fetchTasksData();
    
    // Hydrate active timer state from local storage
    const timerStateKey = `tempo_active_task_timer_${userId}`;
    const savedTimer = localStorage.getItem(timerStateKey);
    if (savedTimer) {
      try {
        const parsed = JSON.parse(savedTimer);
        setActiveTimer(parsed);
      } catch (e) {
        console.error("Failed to parse active task timer state", e);
      }
    }
  }, [userId, isAmplifyConfigured, fetchTasksData]);

  // Synchronize view prop from parent router
  useEffect(() => {
    if (view) {
      setActiveTab(view);
    }
  }, [view]);

  // Handle window resizing to toggle mobile-only headers
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist active timer state
  useEffect(() => {
    const timerStateKey = `tempo_active_task_timer_${userId}`;
    if (activeTimer) {
      localStorage.setItem(timerStateKey, JSON.stringify(activeTimer));
    } else {
      localStorage.removeItem(timerStateKey);
    }
  }, [activeTimer, userId]);

  // Running timer interval ticker
  useEffect(() => {
    let interval = null;
    if (activeTimer && activeTimer.isRunning) {
      setElapsedTimerSeconds(
        activeTimer.accumulatedSeconds + Math.floor((Date.now() - activeTimer.startTime) / 1000)
      );
      interval = setInterval(() => {
        setElapsedTimerSeconds(
          activeTimer.accumulatedSeconds + Math.floor((Date.now() - activeTimer.startTime) / 1000)
        );
      }, 1000);
    } else if (activeTimer) {
      setElapsedTimerSeconds(activeTimer.accumulatedSeconds);
    } else {
      setElapsedTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleOpenAddTaskModal = (scheduledForToday = true) => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskNotes('');
    setTaskEstHours('0');
    setTaskEstMins('30');
    setTaskCategory(categories[0]?.name || 'Development');
    setTaskPriority('medium');
    setTaskScheduledForToday(scheduledForToday);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTaskModal = (task, e) => {
    e.stopPropagation();
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskNotes(task.notes || '');
    
    const totalEst = task.estimatedMinutes || 0;
    setTaskEstHours(String(Math.floor(totalEst / 60)));
    setTaskEstMins(String(totalEst % 60));
    setTaskCategory(task.category || categories[0]?.name || 'Development');
    setTaskPriority(task.priority || 'medium');
    setTaskScheduledForToday(!!task.scheduledDate);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const estMinutes = (parseInt(taskEstHours) || 0) * 60 + (parseInt(taskEstMins) || 0);
    const todayStr = getLocalDateString();
    
    const taskData = {
      title: taskTitle.trim(),
      notes: taskNotes.trim() || null,
      estimatedMinutes: estMinutes,
      category: taskCategory || null,
      priority: taskPriority,
      scheduledDate: taskScheduledForToday ? todayStr : null
    };

    if (editingTask) {
      const payload = {
        ...editingTask,
        ...taskData
      };
      
      if (isAmplifyConfigured && dataClient) {
        await dataClient.models.Task.update(payload);
      } else {
        const updated = tasksList.map(t => t.id === editingTask.id ? payload : t);
        saveLocalTasks(userId, updated);
      }
    } else {
      const payload = {
        ...taskData,
        status: 'planned',
        actualMinutes: 0,
        createdAt: new Date().toISOString()
      };

      if (isAmplifyConfigured && dataClient) {
        await dataClient.models.Task.create(payload);
      } else {
        const newTask = {
          ...payload,
          id: `task-${Date.now()}`
        };
        const updated = [...tasksList, newTask];
        saveLocalTasks(userId, updated);
      }
    }

    setIsTaskModalOpen(false);
    fetchTasksData();
  };

  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    // Clear active timer if running on this task
    if (activeTimer && activeTimer.taskId === taskId) {
      setActiveTimer(null);
    }

    if (isAmplifyConfigured && dataClient) {
      try {
        await dataClient.models.Task.delete({ id: taskId });
        // Delete associated sessions
        const taskSessions = sessionsList.filter(s => s.taskId === taskId);
        await Promise.all(taskSessions.map(s => dataClient.models.TaskSession.delete({ id: s.id })));
      } catch (err) {
        console.error("Cloud task delete failed:", err);
      }
    } else {
      const updatedTasks = tasksList.filter(t => t.id !== taskId);
      saveLocalTasks(userId, updatedTasks);
      const updatedSessions = sessionsList.filter(s => s.taskId !== taskId);
      saveLocalTaskSessions(userId, updatedSessions);
    }

    if (viewingTask && viewingTask.id === taskId) {
      setIsDetailModalOpen(false);
    }
    fetchTasksData();
  };

  const handleMoveToToday = async (task, e) => {
    e.stopPropagation();
    const payload = {
      ...task,
      scheduledDate: getLocalDateString()
    };

    if (isAmplifyConfigured && dataClient) {
      await dataClient.models.Task.update(payload);
    } else {
      const updated = tasksList.map(t => t.id === task.id ? payload : t);
      saveLocalTasks(userId, updated);
    }
    fetchTasksData();
  };

  const handleMoveToBacklog = async (task, e) => {
    e.stopPropagation();
    
    let updatedTask = { ...task };
    
    // Stop/Pause timer if running and merge updates
    if (activeTimer && activeTimer.taskId === task.id) {
      if (activeTimer.isRunning) {
        const sessionSeconds = Math.floor((Date.now() - activeTimer.startTime) / 1000);
        const totalAccumulatedSeconds = activeTimer.accumulatedSeconds + sessionSeconds;
        const sessionMinutes = parseFloat((sessionSeconds / 60).toFixed(2));

        // Create session
        const sessionPayload = {
          taskId: task.id,
          startedAt: new Date(activeTimer.startTime).toISOString(),
          endedAt: new Date().toISOString(),
          durationMinutes: sessionMinutes
        };

        if (isAmplifyConfigured && dataClient) {
          await dataClient.models.TaskSession.create(sessionPayload);
        } else {
          const newSession = {
            ...sessionPayload,
            id: `session-${Date.now()}`
          };
          const updatedSessions = [...sessionsList, newSession];
          saveLocalTaskSessions(userId, updatedSessions);
        }

        updatedTask.actualMinutes = parseFloat(((task.actualMinutes || 0) + sessionMinutes).toFixed(2));
        updatedTask.status = 'paused';
      }

      // Detach active timer from this backlog-moved task
      setActiveTimer(null);
    }

    const payload = {
      ...updatedTask,
      scheduledDate: null
    };

    if (isAmplifyConfigured && dataClient) {
      await dataClient.models.Task.update(payload);
    } else {
      const updated = tasksList.map(t => t.id === task.id ? payload : t);
      saveLocalTasks(userId, updated);
    }
    fetchTasksData();
  };

  // Timer Actions
  const handleStartTimer = async (task) => {
    // If another timer is running, pause it first
    if (activeTimer && activeTimer.taskId !== task.id) {
      const otherTask = tasksList.find(t => t.id === activeTimer.taskId);
      if (otherTask) await handlePauseTimer(otherTask);
    }

    const newTimerState = {
      taskId: task.id,
      startTime: Date.now(),
      accumulatedSeconds: activeTimer && activeTimer.taskId === task.id ? activeTimer.accumulatedSeconds : 0,
      isRunning: true
    };
    
    setActiveTimer(newTimerState);

    const payload = {
      ...task,
      status: 'active',
      startedAt: task.startedAt || new Date().toISOString()
    };

    if (isAmplifyConfigured && dataClient) {
      await dataClient.models.Task.update(payload);
    } else {
      const updated = tasksList.map(t => t.id === task.id ? payload : t);
      saveLocalTasks(userId, updated);
    }
    fetchTasksData();
  };

  const handlePauseTimer = async (task) => {
    if (!activeTimer || activeTimer.taskId !== task.id) return;

    const sessionSeconds = Math.floor((Date.now() - activeTimer.startTime) / 1000);
    const totalAccumulatedSeconds = activeTimer.accumulatedSeconds + sessionSeconds;
    const sessionMinutes = parseFloat((sessionSeconds / 60).toFixed(2));

    setActiveTimer({
      ...activeTimer,
      isRunning: false,
      accumulatedSeconds: totalAccumulatedSeconds
    });

    // Create session
    const sessionPayload = {
      taskId: task.id,
      startedAt: new Date(activeTimer.startTime).toISOString(),
      endedAt: new Date().toISOString(),
      durationMinutes: sessionMinutes
    };

    // Update task actualMinutes
    const payload = {
      ...task,
      status: 'paused',
      actualMinutes: parseFloat(((task.actualMinutes || 0) + sessionMinutes).toFixed(2))
    };

    if (isAmplifyConfigured && dataClient) {
      await dataClient.models.TaskSession.create(sessionPayload);
      await dataClient.models.Task.update(payload);
    } else {
      const newSession = {
        ...sessionPayload,
        id: `session-${Date.now()}`
      };
      const updatedSessions = [...sessionsList, newSession];
      saveLocalTaskSessions(userId, updatedSessions);

      const updatedTasks = tasksList.map(t => t.id === task.id ? payload : t);
      saveLocalTasks(userId, updatedTasks);
    }
    fetchTasksData();
  };

  const handleCompleteTask = async (task) => {
    let finalActualMinutes = task.actualMinutes || 0;

    // Wrap up active timer session if running
    if (activeTimer && activeTimer.taskId === task.id) {
      const sessionSeconds = activeTimer.isRunning 
        ? Math.floor((Date.now() - activeTimer.startTime) / 1000) 
        : 0;
      const sessionMinutes = parseFloat((sessionSeconds / 60).toFixed(2));
      
      if (sessionMinutes > 0) {
        finalActualMinutes = parseFloat(((task.actualMinutes || 0) + sessionMinutes).toFixed(2));
        
        const sessionPayload = {
          taskId: task.id,
          startedAt: new Date(activeTimer.startTime).toISOString(),
          endedAt: new Date().toISOString(),
          durationMinutes: sessionMinutes
        };

        if (isAmplifyConfigured && dataClient) {
          await dataClient.models.TaskSession.create(sessionPayload);
        } else {
          const newSession = { ...sessionPayload, id: `session-${Date.now()}` };
          saveLocalTaskSessions(userId, [...sessionsList, newSession]);
        }
      }
      setActiveTimer(null);
    }

    const payload = {
      ...task,
      status: 'done',
      actualMinutes: finalActualMinutes,
      completedAt: new Date().toISOString()
    };

    if (isAmplifyConfigured && dataClient) {
      await dataClient.models.Task.update(payload);
    } else {
      const updatedTasks = tasksList.map(t => t.id === task.id ? payload : t);
      saveLocalTasks(userId, updatedTasks);
    }
    fetchTasksData();
  };

  // Helper formatting durations
  const formatMinutesToDuration = (totalMins) => {
    if (!totalMins || isNaN(totalMins)) return '0m';
    const hrs = Math.floor(totalMins / 60);
    const mins = Math.round(totalMins % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatSecondsToClock = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    const pad = (val) => String(val).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Symmetrical Planning Accuracy calculation
  const calculateAccuracy = (est, act) => {
    if (!est || !act) return 0;
    return Math.round((Math.min(est, act) / Math.max(est, act)) * 100);
  };

  // Filter Tasks list
  const todayDateStr = getLocalDateString();
  
  const todayTasks = useMemo(() => {
    return tasksList.filter(t => t.scheduledDate === todayDateStr);
  }, [tasksList, todayDateStr]);

  const backlogTasks = useMemo(() => {
    return tasksList.filter(t => !t.scheduledDate);
  }, [tasksList]);

  // Today Grouped Categories
  const todayGrouped = useMemo(() => {
    const groups = { active: [], planned: [], paused: [], done: [] };
    todayTasks.forEach(t => {
      if (groups[t.status]) {
        groups[t.status].push(t);
      }
    });
    return groups;
  }, [todayTasks]);

  // Today Stats Computations
  const todayStats = useMemo(() => {
    const totalEst = todayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    const totalAct = todayTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
    const completed = todayTasks.filter(t => t.status === 'done').length;
    return {
      est: totalEst,
      act: totalAct,
      completed,
      total: todayTasks.length
    };
  }, [todayTasks]);

  // Analytics Computations
  const analyticsData = useMemo(() => {
    const completedTasks = tasksList.filter(t => t.status === 'done');
    if (completedTasks.length === 0) return null;

    const totalEst = completedTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    const totalAct = completedTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
    const variance = totalAct - totalEst;
    
    // Average accuracy
    let sumAccuracy = 0;
    let accuracyCount = 0;
    completedTasks.forEach(t => {
      if (t.estimatedMinutes > 0 && t.actualMinutes > 0) {
        sumAccuracy += calculateAccuracy(t.estimatedMinutes, t.actualMinutes);
        accuracyCount++;
      }
    });

    const averageAccuracy = accuracyCount > 0 ? Math.round(sumAccuracy / accuracyCount) : 0;

    // Over/Under details
    let overCount = 0;
    let underCount = 0;
    let accurateCount = 0;
    completedTasks.forEach(t => {
      if (t.actualMinutes > t.estimatedMinutes) overCount++;
      else if (t.actualMinutes < t.estimatedMinutes) underCount++;
      else accurateCount++;
    });

    // Category accuracy analysis
    const categoryVariance = {};
    completedTasks.forEach(t => {
      const cat = t.category || 'Uncategorized';
      if (!categoryVariance[cat]) {
        categoryVariance[cat] = { category: cat, est: 0, act: 0, count: 0 };
      }
      categoryVariance[cat].est += t.estimatedMinutes || 0;
      categoryVariance[cat].act += t.actualMinutes || 0;
      categoryVariance[cat].count += 1;
    });

    const categoriesList = Object.values(categoryVariance).map(item => {
      const diff = item.act - item.est;
      const accuracy = calculateAccuracy(item.est, item.act);
      return {
        ...item,
        diff,
        accuracy
      };
    });

    const underestimatedCats = [...categoriesList]
      .filter(c => c.diff > 0)
      .sort((a, b) => b.diff - a.diff);

    const overestimatedCats = [...categoriesList]
      .filter(c => c.diff < 0)
      .sort((a, b) => a.diff - b.diff);

    return {
      totalEst,
      totalAct,
      variance,
      averageAccuracy,
      completedCount: completedTasks.length,
      overCount,
      underCount,
      accurateCount,
      underestimatedCats,
      overestimatedCats
    };
  }, [tasksList]);

  // Active Timer Task reference
  const activeTimerTask = useMemo(() => {
    if (!activeTimer) return null;
    return tasksList.find(t => t.id === activeTimer.taskId);
  }, [activeTimer, tasksList]);

  const renderTaskRow = (task) => {
    const isTimerOnThisTask = activeTimer && activeTimer.taskId === task.id;
    const displayActualMinutes = isTimerOnThisTask 
      ? (task.actualMinutes || 0) + (elapsedTimerSeconds - activeTimer.accumulatedSeconds) / 60 
      : (task.actualMinutes || 0);

    const accuracy = task.status === 'done' ? calculateAccuracy(task.estimatedMinutes, (task.actualMinutes || 0)) : 0;
    const variance = (task.actualMinutes || 0) - task.estimatedMinutes;

    return (
      <div 
        key={task.id} 
        onClick={() => {
          setViewingTask(task);
          setIsDetailModalOpen(true);
        }}
        className="hover-card-row"
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0.75rem 0.85rem', 
          backgroundColor: isTimerOnThisTask ? 'rgba(124, 58, 237, 0.04)' : 'rgba(255,255,255,0.01)',
          border: isTimerOnThisTask ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transition: 'var(--transition-smooth)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ 
              fontSize: '0.9rem', 
              fontWeight: 500, 
              color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {task.title}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {task.category && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                  <Folder size={10} /> {task.category}
                </span>
              )}
              <span>•</span>
              <span>Est: <strong>{formatMinutesToDuration(task.estimatedMinutes)}</strong></span>
              {displayActualMinutes > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: isTimerOnThisTask ? 'var(--color-unbilled)' : 'var(--text-secondary)' }}>
                    Act: <strong>{formatMinutesToDuration(displayActualMinutes)}</strong>
                  </span>
                </>
              )}
              {task.priority && task.status !== 'done' && (
                <>
                  <span>•</span>
                  <span style={{ 
                    color: task.priority === 'high' 
                      ? 'var(--color-danger)' 
                      : task.priority === 'medium' 
                        ? 'var(--color-unbilled)' 
                        : 'var(--text-muted)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.6rem'
                  }}>
                    {task.priority}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
          
          {/* Task Done/Completed badge/action */}
          {task.status === 'done' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ 
                fontSize: '0.65rem', 
                fontWeight: 700, 
                padding: '0.1rem 0.4rem', 
                borderRadius: '50px',
                backgroundColor: variance > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                color: variance > 0 ? 'var(--color-danger)' : 'var(--color-paid)',
                border: `1px solid ${variance > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`
              }}>
                {accuracy}% Acc ({variance === 0 ? '0m' : `${variance > 0 ? '+' : ''}${Math.round(variance)}m`})
              </span>
              <CheckCircle2 size={18} style={{ color: 'var(--color-paid)' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {/* Start / Pause Toggles */}
              {task.scheduledDate ? (
                isTimerOnThisTask && activeTimer.isRunning ? (
                  <button 
                    type="button" 
                    title="Pause Timer"
                    className="btn btn-secondary" 
                    onClick={(e) => { e.stopPropagation(); handlePauseTimer(task); }} 
                    style={{ padding: '0.3rem 0.4rem' }}
                  >
                    <Pause size={12} style={{ color: 'var(--color-unbilled)' }} />
                  </button>
                ) : (
                  <button 
                    type="button" 
                    title="Start Timer"
                    className="btn btn-secondary" 
                    onClick={(e) => { e.stopPropagation(); handleStartTimer(task); }} 
                    style={{ padding: '0.3rem 0.4rem' }}
                  >
                    <Play size={12} style={{ color: 'var(--color-paid)' }} />
                  </button>
                )
              ) : (
                <button 
                  type="button" 
                  title="Move to Today"
                  className="btn btn-secondary" 
                  onClick={(e) => handleMoveToToday(task, e)} 
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.15rem' }}
                >
                  <Calendar size={10} /> Today
                </button>
              )}

              {/* Complete Action */}
              {task.scheduledDate && (
                <button 
                  type="button" 
                  title="Complete Task"
                  className="btn btn-secondary" 
                  onClick={(e) => { e.stopPropagation(); handleCompleteTask(task); }} 
                  style={{ padding: '0.3rem 0.4rem' }}
                >
                  <CheckCircle2 size={12} style={{ color: 'var(--color-paid)' }} />
                </button>
              )}

              {/* Move to Backlog Action */}
              {task.scheduledDate && (
                <button 
                  type="button" 
                  title="Move to Backlog"
                  className="btn btn-secondary" 
                  onClick={(e) => handleMoveToBacklog(task, e)} 
                  style={{ padding: '0.3rem 0.4rem' }}
                >
                  <Calendar size={12} style={{ opacity: 0.6 }} />
                </button>
              )}

              {/* Edit/Delete Actions */}
              <button 
                type="button" 
                title="Edit Task"
                className="btn btn-secondary" 
                onClick={(e) => handleOpenEditTaskModal(task, e)} 
                style={{ padding: '0.3rem 0.4rem' }}
              >
                <Edit3 size={12} />
              </button>
            </div>
          )}
          
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Module Tabs Header (only visible on mobile) */}
      {isMobile && (
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          backgroundColor: 'rgba(255,255,255,0.01)', 
          border: '1px solid var(--border-color)', 
          padding: '0.35rem', 
          borderRadius: 'var(--radius-md)',
          width: 'fit-content'
        }}>
          <button 
            className={`btn ${activeTab === 'today' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('today')}
            style={{ padding: '0.4rem 1.25rem', border: 'none' }}
          >
            Today
          </button>
          <button 
            className={`btn ${activeTab === 'backlog' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('backlog')}
            style={{ padding: '0.4rem 1.25rem', border: 'none' }}
          >
            Task Backlog
          </button>
          <button 
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('analytics')}
            style={{ padding: '0.4rem 1.25rem', border: 'none' }}
          >
            Planning Analytics
          </button>
        </div>
      )}

      {/* TABS VIEWS */}
      
      {/* 1. TODAY TAB */}
      {activeTab === 'today' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Summary Dashboard Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Planned Time Today</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {formatMinutesToDuration(todayStats.est)}
              </span>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actual Work Invested</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-unbilled)' }}>
                {formatMinutesToDuration(todayStats.act)}
              </span>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Tasks Completed</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-paid)' }}>
                {todayStats.completed} <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>/ {todayStats.total}</span>
              </span>
            </div>
          </div>

          {/* Active Timer Box */}
          {activeTimerTask && (
            <div className="card" style={{ 
              borderColor: activeTimer.isRunning ? 'var(--color-unbilled)' : 'var(--border-color)', 
              background: activeTimer.isRunning ? 'rgba(245, 158, 11, 0.03)' : 'var(--bg-card)', 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center', 
              gap: '1rem',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                <div style={{ 
                  width: '50px', 
                  height: '50px', 
                  borderRadius: '50%', 
                  backgroundColor: activeTimer.isRunning ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.03)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: activeTimer.isRunning ? 'var(--color-unbilled)' : 'var(--text-secondary)'
                }}>
                  <Clock size={24} className={activeTimer.isRunning ? 'pulse' : ''} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: activeTimer.isRunning ? 'var(--color-unbilled)' : 'var(--text-muted)', fontWeight: 700 }}>
                    {activeTimer.isRunning ? 'Running Focus Timer' : 'Focus Timer Paused'}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.15rem 0' }}>{activeTimerTask.title}</h3>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Category: <strong>{activeTimerTask.category || 'General'}</strong></span>
                    <span>•</span>
                    <span>Estimate: <strong>{formatMinutesToDuration(activeTimerTask.estimatedMinutes)}</strong></span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span style={{ fontSize: '1.75rem', fontFamily: 'monospace', fontWeight: 700, color: activeTimer.isRunning ? 'var(--color-unbilled)' : 'var(--text-secondary)' }}>
                    {formatSecondsToClock(elapsedTimerSeconds)}
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {activeTimer.isRunning ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => handlePauseTimer(activeTimerTask)} style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Pause size={12} /> Pause
                      </button>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => handleStartTimer(activeTimerTask)} style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Play size={12} /> Resume
                      </button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => handleCompleteTask(activeTimerTask)} style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--color-paid)', borderColor: 'var(--color-paid)', color: '#000', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={12} /> Complete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Today Tasks Categorization Lists */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Today's Planner</h2>
              <button className="btn btn-primary btn-sm" onClick={() => handleOpenAddTaskModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Plus size={14} /> Add Task
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', gap: '0.5rem' }}>
                <ClipboardList size={36} />
                <span style={{ fontSize: '0.85rem' }}>No tasks scheduled for today.</span>
                <button className="btn btn-secondary btn-xs" onClick={() => handleOpenAddTaskModal(true)} style={{ marginTop: '0.5rem' }}>
                  Plan Your First Task
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 1. Active Task Group */}
                {todayGrouped.active.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-unbilled)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Task</span>
                    {todayGrouped.active.map(task => renderTaskRow(task))}
                  </div>
                )}

                {/* 2. Planned Task Group */}
                {todayGrouped.planned.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Planned ({todayGrouped.planned.length})</span>
                    {todayGrouped.planned.map(task => renderTaskRow(task))}
                  </div>
                )}

                {/* 3. Paused Task Group */}
                {todayGrouped.paused.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paused ({todayGrouped.paused.length})</span>
                    {todayGrouped.paused.map(task => renderTaskRow(task))}
                  </div>
                )}

                {/* 4. Completed Task Group */}
                {todayGrouped.done.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-paid)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed ({todayGrouped.done.length})</span>
                    {todayGrouped.done.map(task => renderTaskRow(task))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. BACKLOG TAB */}
      {activeTab === 'backlog' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Backlog Inventory</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tasks not yet scheduled for today</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => handleOpenAddTaskModal(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={14} /> Add to Backlog
            </button>
          </div>

          {backlogTasks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', gap: '0.5rem' }}>
              <ClipboardList size={36} />
              <span style={{ fontSize: '0.85rem' }}>Your backlog is empty.</span>
              <button className="btn btn-secondary btn-xs" onClick={() => handleOpenAddTaskModal(false)}>
                Add Backup Tasks
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {backlogTasks.map(task => renderTaskRow(task))}
            </div>
          )}
        </div>
      )}

      {/* 3. ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {analyticsData === null ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', gap: '0.5rem' }}>
              <Info size={36} />
              <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1rem' }}>No Analytics Data</h3>
              <span style={{ fontSize: '0.85rem', textAlign: 'center', maxWidth: '350px' }}>
                Complete at least one scheduled task to unlock estimate accuracy metrics and workload analytics.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Analytics Core Card Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center', justifyContent: 'center', minHeight: '130px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Avg Estimate Accuracy</span>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {analyticsData.averageAccuracy}%
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Based on {analyticsData.completedCount} completed tasks</span>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated vs. Actual Total</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                    <span>Estimated Time:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatMinutesToDuration(analyticsData.totalEst)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Actual Time Spent:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatMinutesToDuration(analyticsData.totalAct)}</strong>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                    <span>Overall Variance:</span>
                    <span style={{ color: analyticsData.variance > 0 ? 'var(--color-danger)' : 'var(--color-paid)' }}>
                      {analyticsData.variance === 0 
                        ? 'Perfect Match' 
                        : `${analyticsData.variance > 0 ? '+' : ''}${formatMinutesToDuration(analyticsData.variance)}`}
                    </span>
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Accuracy Distribution</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-danger)' }}>Overrun (Underestimated):</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{analyticsData.overCount} tasks ({Math.round(analyticsData.overCount / analyticsData.completedCount * 100)}%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-unbilled)' }}>Underrun (Overestimated):</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{analyticsData.underCount} tasks ({Math.round(analyticsData.underCount / analyticsData.completedCount * 100)}%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-paid)' }}>Perfect Estimations:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{analyticsData.accurateCount} tasks ({Math.round(analyticsData.accurateCount / analyticsData.completedCount * 100)}%)</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Under/Over Estimated Category Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
                
                {/* Underestimated */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <TrendingUp size={18} style={{ color: 'var(--color-danger)' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Underestimated (Overrun) Categories</h3>
                  </div>
                  {analyticsData.underestimatedCats.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No category overruns detected! Good planning.</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {analyticsData.underestimatedCats.map(c => (
                        <div key={c.category} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ fontWeight: 500 }}>{c.category}</span>
                            <span style={{ color: 'var(--color-danger)' }}>Over by {formatMinutesToDuration(c.diff)}</span>
                          </div>
                          <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${Math.min(100, (c.act / c.est) * 50)}%`, 
                              backgroundColor: 'var(--color-danger)',
                              borderRadius: '10px'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Est: {formatMinutesToDuration(c.est)} vs Act: {formatMinutesToDuration(c.act)} ({c.accuracy}% Accuracy)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Overestimated */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <TrendingDown size={18} style={{ color: 'var(--color-unbilled)' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Overestimated (Underrun) Categories</h3>
                  </div>
                  {analyticsData.overestimatedCats.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No category underruns detected.</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {analyticsData.overestimatedCats.map(c => (
                        <div key={c.category} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ fontWeight: 500 }}>{c.category}</span>
                            <span style={{ color: 'var(--color-unbilled)' }}>Under by {formatMinutesToDuration(Math.abs(c.diff))}</span>
                          </div>
                          <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${Math.min(100, (c.est / c.act) * 50)}%`, 
                              backgroundColor: 'var(--color-unbilled)',
                              borderRadius: '10px'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Est: {formatMinutesToDuration(c.est)} vs Act: {formatMinutesToDuration(c.act)} ({c.accuracy}% Accuracy)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      )}


      {/* --- ADD / EDIT TASK MODAL OVERLAY --- */}
      {isTaskModalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form className="modal-content" onSubmit={handleSaveTask} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingTask ? 'Edit Task' : 'Add Standalone Task'}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsTaskModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              <div className="form-group">
                <label>Task Title *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={taskTitle} 
                  onChange={(e) => setTaskTitle(e.target.value)} 
                  placeholder="e.g. Implement dashboard widget charts" 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Estimated Hours</label>
                  <select className="input-field" value={taskEstHours} onChange={(e) => setTaskEstHours(e.target.value)}>
                    {[...Array(25).keys()].map(h => <option key={h} value={h}>{h} hrs</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Estimated Minutes</label>
                  <select className="input-field" value={taskEstMins} onChange={(e) => setTaskEstMins(e.target.value)}>
                    {['0', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                      <option key={m} value={m}>{m} mins</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Category</label>
                  <select className="input-field" value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)}>
                    {categories.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select className="input-field" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ flexDirection: 'row', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                <input 
                  type="checkbox" 
                  id="schedToday" 
                  checked={taskScheduledForToday} 
                  onChange={(e) => setTaskScheduledForToday(e.target.checked)} 
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                />
                <label htmlFor="schedToday" style={{ cursor: 'pointer', margin: 0 }}>Schedule task for today</label>
              </div>

              <div className="form-group">
                <label>Task Notes (optional)</label>
                <textarea 
                  className="input-field" 
                  value={taskNotes} 
                  onChange={(e) => setTaskNotes(e.target.value)} 
                  placeholder="Enter context, subtasks list, or references..." 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsTaskModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- TASK DETAIL / SESSION HISTORY MODAL OVERLAY --- */}
      {isDetailModalOpen && viewingTask && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Task Details</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsDetailModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
              
              {/* Core Info Block */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{viewingTask.title}</h3>
                <div style={{ display: 'flex', gap: '0.65rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ padding: '0.1rem 0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '50px' }}>
                    Category: <strong>{viewingTask.category || 'General'}</strong>
                  </span>
                  <span style={{ padding: '0.1rem 0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '50px', textTransform: 'uppercase' }}>
                    Priority: <strong>{viewingTask.priority || 'medium'}</strong>
                  </span>
                  <span style={{ padding: '0.1rem 0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '50px', textTransform: 'capitalize' }}>
                    Status: <strong>{viewingTask.status}</strong>
                  </span>
                </div>
              </div>

              {/* Estimate vs Actual Box */}
              <div style={{ 
                padding: '0.85rem', 
                backgroundColor: 'rgba(255,255,255,0.01)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Effort:</span>
                  <strong style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>
                    {formatMinutesToDuration(viewingTask.estimatedMinutes)}
                  </strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actual Investment:</span>
                  <strong style={{ fontSize: '1rem', color: 'var(--color-unbilled)' }}>
                    {formatMinutesToDuration(viewingTask.actualMinutes || 0)}
                  </strong>
                </div>

                {viewingTask.status === 'done' && (
                  <div style={{ gridColumn: 'span 2', borderTop: '1px dashed var(--border-color)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>Planning Accuracy:</span>
                    <strong style={{ color: 'var(--color-paid)' }}>
                      {calculateAccuracy(viewingTask.estimatedMinutes, (viewingTask.actualMinutes || 0))}%
                    </strong>
                    <span>Variance:</span>
                    <strong style={{ color: ((viewingTask.actualMinutes || 0) - viewingTask.estimatedMinutes) > 0 ? 'var(--color-danger)' : 'var(--color-paid)' }}>
                      {(viewingTask.actualMinutes || 0) - viewingTask.estimatedMinutes === 0 
                        ? '0m' 
                        : `${((viewingTask.actualMinutes || 0) - viewingTask.estimatedMinutes) > 0 ? '+' : ''}${formatMinutesToDuration((viewingTask.actualMinutes || 0) - viewingTask.estimatedMinutes)}`}
                    </strong>
                  </div>
                )}
              </div>

              {/* Notes */}
              {viewingTask.notes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Notes & Context</span>
                  <p style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-secondary)', 
                    whiteSpace: 'pre-wrap', 
                    padding: '0.6rem 0.75rem', 
                    backgroundColor: 'rgba(255,255,255,0.01)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    {viewingTask.notes}
                  </p>
                </div>
              )}

              {/* Timer Sessions History List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Timer Sessions History</span>
                {sessionsList.filter(s => s.taskId === viewingTask.id).length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No session logs registered yet.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {sessionsList.filter(s => s.taskId === viewingTask.id).map(session => (
                      <div 
                        key={session.id} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '0.4rem 0.6rem', 
                          backgroundColor: 'rgba(255,255,255,0.01)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '4px',
                          fontSize: '0.75rem' 
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {new Date(session.startedAt).toLocaleDateString()} {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {formatMinutesToDuration(session.durationMinutes)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Meta details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                <span>Created At: {new Date(viewingTask.createdAt).toLocaleString()}</span>
                {viewingTask.completedAt && <span>Completed At: {new Date(viewingTask.completedAt).toLocaleString()}</span>}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={(e) => handleDeleteTask(viewingTask.id, e)}
                style={{ borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.02)', color: 'var(--color-danger)' }}
              >
                <Trash2 size={14} style={{ marginRight: '0.25rem' }} /> Delete Task
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </button>
                {viewingTask.status !== 'done' && (
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={(e) => { setIsDetailModalOpen(false); handleOpenEditTaskModal(viewingTask, e); }}
                  >
                    Edit Task
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
