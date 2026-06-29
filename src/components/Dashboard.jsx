import React from 'react';
import { DollarSign, Clock, FileText, CheckCircle, TrendingUp } from 'lucide-react';

export default function Dashboard({ entries, clients, userProfile = {}, onNavigate }) {
  // Utility to parse date strings properly without timezone shifts
  const parseEntryDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getStartOfWeek = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diff = today.getDate() - day;
    const sunday = new Date(today.getFullYear(), today.getMonth(), diff);
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  };

  const getStartOfMonth = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  };

  const now = new Date();
  const startOfWeek = getStartOfWeek();
  const startOfMonth = getStartOfMonth();

  // Quarterly calculation setups (declared at top to prevent TDZ ReferenceErrors)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  let qStart, qEnd, qName;
  if (currentMonth >= 0 && currentMonth <= 2) {
    qStart = new Date(currentYear, 0, 1);
    qEnd = new Date(currentYear, 2, 31, 23, 59, 59);
    qName = 'Q1 (Jan-Mar)';
  } else if (currentMonth >= 3 && currentMonth <= 5) {
    qStart = new Date(currentYear, 3, 1);
    qEnd = new Date(currentYear, 5, 30, 23, 59, 59);
    qName = 'Q2 (Apr-Jun)';
  } else if (currentMonth >= 6 && currentMonth <= 8) {
    qStart = new Date(currentYear, 6, 1);
    qEnd = new Date(currentYear, 8, 30, 23, 59, 59);
    qName = 'Q3 (Jul-Sep)';
  } else {
    qStart = new Date(currentYear, 9, 1);
    qEnd = new Date(currentYear, 11, 31, 23, 59, 59);
    qName = 'Q4 (Oct-Dec)';
  }
  
  const taxRate = userProfile.taxRate || 0;
  const ficaRate = 14.13; // 15.3% on 92.35% effective rate
  const combinedRate = ficaRate + taxRate;

  const dailyWorkTarget = userProfile.dailyWorkTarget || 8;

  const gaps = React.useMemo(() => {
    const getPastFiveWeekdays = () => {
      const list = [];
      const d = new Date();
      d.setDate(d.getDate() - 1);
      
      while (list.length < 5) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) {
          const dateStr = d.toISOString().split('T')[0];
          const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          list.push({ dateStr, label });
        }
        d.setDate(d.getDate() - 1);
      }
      return list;
    };

    const weekdays = getPastFiveWeekdays().reverse();
    const dailyHours = {};
    weekdays.forEach(wd => {
      dailyHours[wd.dateStr] = 0;
    });

    entries.forEach(e => {
      if (dailyHours[e.date] !== undefined) {
        dailyHours[e.date] += e.duration;
      }
    });

    const gapList = [];
    weekdays.forEach(wd => {
      const hours = dailyHours[wd.dateStr];
      if (hours < dailyWorkTarget) {
        gapList.push({
          date: wd.dateStr,
          label: wd.label,
          logged: hours,
          gap: parseFloat((dailyWorkTarget - hours).toFixed(2))
        });
      }
    });

    return gapList;
  }, [entries, dailyWorkTarget]);

  // Next IRS Tax Deadline Info
  const taxDeadlineInfo = React.useMemo(() => {
    const deadlines = [
      { name: 'Q1 Estimated Tax Payment', date: new Date(currentYear, 3, 15), quarter: 1 },
      { name: 'Q2 Estimated Tax Payment', date: new Date(currentYear, 5, 15), quarter: 2 },
      { name: 'Q3 Estimated Tax Payment', date: new Date(currentYear, 8, 15), quarter: 3 },
      { name: 'Q4 Estimated Tax Payment', date: new Date(currentYear, 0, 15), quarter: 4 },
      { name: 'Q4 Estimated Tax Payment', date: new Date(currentYear + 1, 0, 15), quarter: 4 }
    ];

    const upcoming = deadlines
      .filter(d => {
        const dCopy = new Date(d.date);
        dCopy.setHours(23, 59, 59, 999);
        return dCopy >= now;
      })
      .sort((a, b) => a.date - b.date);

    const next = upcoming[0];
    if (!next) return null;

    const diffMs = next.date - now;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return {
      ...next,
      daysRemaining,
      formattedDate: next.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  }, [now, currentYear]);

  // Export Outlook-friendly iCalendar (.ics) all-day event
  const handleExportICS = () => {
    if (!taxDeadlineInfo) return;
    
    const date = taxDeadlineInfo.date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const endYear = nextDay.getFullYear();
    const endMonth = String(nextDay.getMonth() + 1).padStart(2, '0');
    const endDay = String(nextDay.getDate()).padStart(2, '0');
    
    const startDateStr = `${year}${month}${day}`;
    const endDateStr = `${endYear}${endMonth}${endDay}`;
    const stampStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tempo Tracker//Tax Deadlines//EN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:tax-deadline-q${taxDeadlineInfo.quarter}-${year}@tempotracker`,
      `DTSTAMP:${stampStr}`,
      `DTSTART;VALUE=DATE:${startDateStr}`,
      `DTEND;VALUE=DATE:${endDateStr}`,
      `SUMMARY:IRS ${taxDeadlineInfo.name} (Q${taxDeadlineInfo.quarter})`,
      `DESCRIPTION:Reminder to file and pay your IRS quarterly estimated tax payments for Quarter ${taxDeadlineInfo.quarter}. Check your Tempo 1099 tax reserve tracker for estimated amounts!`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'DESCRIPTION:Reminder: IRS Estimated Tax Deadline Tomorrow',
      'ACTION:DISPLAY',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `IRS_Tax_Deadline_Q${taxDeadlineInfo.quarter}_${year}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metric aggregates
  let totalHours = 0;
  let totalEarnings = 0;
  let unbilledEarnings = 0;
  let billedEarnings = 0;
  let paidEarnings = 0;
  
  let weekHours = 0;
  let weekEarnings = 0;
  let monthHours = 0;
  let monthEarnings = 0;

  // (Quarterly calculations moved to the top of the component body to avoid Temporal Dead Zone errors)

  let quarterEarnings = 0;

  entries.forEach(entry => {
    const entryDate = parseEntryDate(entry.date);
    const amount = entry.isBillable !== false ? entry.duration * entry.rate : 0;
    
    // Totals
    totalHours += entry.duration;
    totalEarnings += amount;
    
    if (entry.status === 'Unbilled') unbilledEarnings += amount;
    else if (entry.status === 'Billed') billedEarnings += amount;
    else if (entry.status === 'Paid') paidEarnings += amount;

    // Weekly filters
    if (entryDate >= startOfWeek && entryDate <= now) {
      weekHours += entry.duration;
      weekEarnings += amount;
    }

    // Monthly filters
    if (entryDate >= startOfMonth && entryDate <= now) {
      monthHours += entry.duration;
      monthEarnings += amount;
    }

    // Quarterly filter
    if (entryDate >= qStart && entryDate <= qEnd) {
      quarterEarnings += amount;
    }
  });

  // Tax calculations
  const totalTaxReserve = totalEarnings * (combinedRate / 100);
  const paidTaxReserve = paidEarnings * (combinedRate / 100);
  const outstandingTaxReserve = (unbilledEarnings + billedEarnings) * (combinedRate / 100);
  const quarterTaxReserve = quarterEarnings * (combinedRate / 100);

  // Breakdown details
  const totalFica = totalEarnings * (ficaRate / 100);
  const totalIncome = totalEarnings * (taxRate / 100);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="dashboard-summary">
      {/* Grid of primary stats */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-details">
            <span className="stat-label">Total Earnings</span>
            <span className="stat-value">{formatCurrency(totalEarnings)}</span>
            <span className="stat-subtext">Across all client accounts</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--color-primary)' }}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-details">
            <span className="stat-label">Total Hours Logged</span>
            <span className="stat-value">{totalHours.toFixed(1)} hrs</span>
            <span className="stat-subtext">All time tracker logs</span>
          </div>
          <div className="stat-icon" style={{ color: '#ec4899' }}>
            <Clock size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-details">
            <span className="stat-label">Unbilled Earnings</span>
            <span className="stat-value" style={{ color: 'var(--color-unbilled)' }}>
              {formatCurrency(unbilledEarnings)}
            </span>
            <span className="stat-subtext">Drafts ready to invoice</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--color-unbilled)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
            <FileText size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-details">
            <span className="stat-label">Collected Payments</span>
            <span className="stat-value" style={{ color: 'var(--color-paid)' }}>
              {formatCurrency(paidEarnings)}
            </span>
            <span className="stat-subtext">Successfully settled</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--color-paid)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Date breakdowns sub-cards */}
      <div className="dashboard-targets-grid">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>This Calendar Month</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(monthEarnings)}</span>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>{monthHours.toFixed(1)} hours logged</span>
          </div>
          <div className="progress-bar-track" style={{ marginTop: '0.5rem' }}>
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: `${Math.min(100, (monthHours / 160) * 100)}%`, // Target 160h/month
                backgroundColor: 'var(--color-primary)' 
              }} 
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {((monthHours / 160) * 100).toFixed(0)}% of 160h monthly workload target
          </span>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>This Work Week (Sun-Sat)</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(weekEarnings)}</span>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>{weekHours.toFixed(1)} hours logged</span>
          </div>
          <div className="progress-bar-track" style={{ marginTop: '0.5rem' }}>
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: `${Math.min(100, (weekHours / 40) * 100)}%`, // Target 40h/week
                backgroundColor: '#ec4899' 
              }} 
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {((weekHours / 40) * 100).toFixed(0)}% of 40h weekly target
          </span>
        </div>

        {/* 1099 Tax Estimator Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>1099 Tax Estimator</h3>
            <span style={{ 
              fontSize: '0.75rem', 
              backgroundColor: 'rgba(129, 140, 248, 0.1)', 
              color: 'var(--color-primary)', 
              padding: '0.15rem 0.5rem', 
              borderRadius: '50px',
              fontWeight: 600,
              border: '1px solid rgba(129, 140, 248, 0.2)'
            }}>
              {combinedRate.toFixed(1)}% Est. Combined
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
            {taxDeadlineInfo && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.4rem 0.6rem',
                fontSize: '0.75rem',
                marginBottom: '0.25rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Next Deadline: <strong>{taxDeadlineInfo.formattedDate}</strong>
                  </span>
                  <span style={{ color: taxDeadlineInfo.daysRemaining <= 15 ? 'var(--color-danger)' : 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 600 }}>
                    {taxDeadlineInfo.daysRemaining === 0 ? 'Today!' : `${taxDeadlineInfo.daysRemaining} days remaining`}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportICS}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                >
                  Add to Calendar
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                This Quarter <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({qName})</span>:
              </span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {formatCurrency(quarterTaxReserve)}
              </span>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.15rem 0' }} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Taxes Owed (Cash basis):</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-paid)' }}>
                  {formatCurrency(paidTaxReserve)}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>On collected cash</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outstanding Taxes:</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-unbilled)' }}>
                  {formatCurrency(outstandingTaxReserve)}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>On unbilled/billed logs</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.5rem 0.6rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>FICA Self-Employment (14.13%):</span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatCurrency(totalFica)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Income Tax ({taxRate.toFixed(1)}%):</span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatCurrency(totalIncome)}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--border-color)', margin: '0.15rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                <span style={{ color: 'var(--text-primary)' }}>Total Est. Reserve (All-time):</span>
                <span>{formatCurrency(totalTaxReserve)}</span>
              </div>
            </div>

            {taxRate === 0 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '0.4rem 0.6rem', 
                backgroundColor: 'rgba(245, 158, 11, 0.08)', 
                border: '1px solid rgba(245, 158, 11, 0.2)', 
                borderRadius: '4px',
                fontSize: '0.7rem',
                color: 'var(--color-unbilled)',
                marginTop: '0.25rem',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <span>Income tax rate not configured.</span>
                <button 
                  type="button" 
                  onClick={() => onNavigate && onNavigate('profile')}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Configure Settings
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Time Log Gap Finder Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>Time Log Gap Finder</h3>
            <span style={{ 
              fontSize: '0.75rem', 
              backgroundColor: gaps.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
              color: gaps.length > 0 ? 'var(--color-danger)' : 'var(--color-paid)', 
              padding: '0.15rem 0.5rem', 
              borderRadius: '50px',
              fontWeight: 600,
              border: `1px solid ${gaps.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
            }}>
              {gaps.length === 0 ? 'All Hours Logged' : `${gaps.length} Gaps`}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', flex: 1, overflowY: 'auto', maxHeight: '180px', paddingRight: '0.25rem' }}>
            {gaps.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Awesome! You have met your target of {dailyWorkTarget}h/day for all workdays this past week.
              </div>
            ) : (
              gaps.map((gap, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.4rem 0.6rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{gap.label}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      Logged: {gap.logged.toFixed(1)}h / Target: {dailyWorkTarget}h
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>-{gap.gap.toFixed(1)}h</span>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onQuickLog && onQuickLog({ date: gap.date })}
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                    >
                      Quick Log
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {clients.filter(c => c.budgetType && c.budgetType !== 'none' && c.budgetLimit).length > 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Client Budget & Retainer Limits</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              {clients.filter(c => c.budgetType && c.budgetType !== 'none' && c.budgetLimit).map(client => {
                let usage = 0;
                let filterDate = null;
                const period = client.budgetPeriod || 'total';
                if (period === 'weekly') {
                  filterDate = startOfWeek;
                } else if (period === 'monthly') {
                  filterDate = startOfMonth;
                }
                
                entries.forEach(e => {
                  if (e.clientId !== client.id) return;
                  if (filterDate) {
                    const entryDate = parseEntryDate(e.date);
                    if (entryDate < filterDate) return;
                  }
                  
                  if (client.budgetType === 'hours') {
                    usage += e.duration;
                  } else if (client.budgetType === 'revenue') {
                    usage += e.isBillable !== false ? e.duration * e.rate : 0;
                  }
                });
                
                const limit = client.budgetLimit;
                const percent = limit > 0 ? (usage / limit) * 100 : 0;
                
                let barColor = 'var(--color-paid)';
                if (percent >= 100) {
                  barColor = 'var(--color-danger)';
                } else if (percent >= 75) {
                  barColor = 'var(--color-unbilled)';
                }
                
                return (
                  <div key={client.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</span>
                      <span style={{ color: barColor }}>{percent.toFixed(0)}%</span>
                    </div>
                    
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {period} {client.budgetType === 'hours' ? 'hours limit' : 'revenue cap'}
                    </div>
                    
                    <div className="progress-bar-track" style={{ marginTop: '0.25rem', height: '6px' }}>
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${Math.min(100, percent)}%`,
                          backgroundColor: barColor 
                        }} 
                      />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      <span>
                        {client.budgetType === 'hours' ? `${usage.toFixed(1)} hrs` : formatCurrency(usage)}
                      </span>
                      <span>
                        Limit: {client.budgetType === 'hours' ? `${limit.toFixed(1)} hrs` : formatCurrency(limit)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
