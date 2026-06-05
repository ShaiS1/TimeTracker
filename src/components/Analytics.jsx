import React, { useMemo } from 'react';
import { DollarSign, Clock, BarChart3, PieChart, Receipt, Percent, TrendingUp } from 'lucide-react';

export default function Analytics({ entries, clients, invoices = [] }) {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Client calculations
  const clientStats = useMemo(() => {
    const stats = {};
    
    // Initialize stats for each client
    clients.forEach(c => {
      stats[c.id] = { name: c.name, earnings: 0, hours: 0, color: '' };
    });

    // Populate client colors
    const colors = ['#7c3aed', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    clients.forEach((c, idx) => {
      if (stats[c.id]) {
        stats[c.id].color = colors[idx % colors.length];
      }
    });

    let grandTotalEarnings = 0;
    let grandTotalHours = 0;

    entries.forEach(e => {
      const amount = e.isBillable !== false ? e.duration * e.rate : 0;
      grandTotalEarnings += amount;
      grandTotalHours += e.duration;
      
      if (stats[e.clientId]) {
        stats[e.clientId].earnings += amount;
        stats[e.clientId].hours += e.duration;
      } else {
        // Fallback for deleted client entries
        if (!stats['deleted']) {
          stats['deleted'] = { name: 'Legacy Clients', earnings: 0, hours: 0, color: '#62627a' };
        }
        stats['deleted'].earnings += amount;
        stats['deleted'].hours += e.duration;
        grandTotalEarnings += amount;
        grandTotalHours += e.duration;
      }
    });

    return {
      list: Object.values(stats).filter(s => s.hours > 0),
      grandTotalEarnings,
      grandTotalHours
    };
  }, [entries, clients]);

  // Overall statistics
  const totalHours = clientStats.grandTotalHours;
  const billableHours = useMemo(() => entries.filter(e => e.isBillable !== false).reduce((sum, e) => sum + e.duration, 0), [entries]);
  const nonBillableHours = useMemo(() => entries.filter(e => e.isBillable === false).reduce((sum, e) => sum + e.duration, 0), [entries]);
  
  const billableRatio = useMemo(() => totalHours > 0 ? (billableHours / totalHours) * 100 : 0, [billableHours, totalHours]);
  const hourlyYield = useMemo(() => totalHours > 0 ? clientStats.grandTotalEarnings / totalHours : 0, [clientStats.grandTotalEarnings, totalHours]);
  const outstandingAR = useMemo(() => invoices.filter(inv => inv.status === 'Unpaid' || inv.status === 'Overdue').reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0), [invoices]);

  // Category calculations
  const categoryStats = useMemo(() => {
    const stats = {};
    let categoryHours = 0;

    entries.forEach(e => {
      categoryHours += e.duration;
      if (!stats[e.category]) {
        stats[e.category] = { category: e.category, hours: 0 };
      }
      stats[e.category].hours += e.duration;
    });

    return {
      list: Object.values(stats).sort((a, b) => b.hours - a.hours),
      totalHours: categoryHours
    };
  }, [entries]);

  // SVG Donut Chart calculations
  const donutSegments = useMemo(() => {
    let accumulatedPercent = 0;
    return clientStats.list.map(stat => {
      const percent = clientStats.grandTotalEarnings > 0 
        ? (stat.earnings / clientStats.grandTotalEarnings) * 100 
        : 0;
      
      const startPercent = accumulatedPercent;
      accumulatedPercent += percent;
      
      // Calculate SVG stroke coordinates
      const strokeDashArray = `${percent} ${100 - percent}`;
      const strokeDashOffset = 100 - startPercent + 25; // Rotate 25% to start from top
      
      return {
        ...stat,
        percent,
        strokeDashArray,
        strokeDashOffset
      };
    });
  }, [clientStats]);

  // Chronological 6-Week Bucket Trends
  const weeklyTrends = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find Monday of the current week
    const currentDay = today.getDay();
    const diffToMonday = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const currentMonday = new Date(today.setDate(diffToMonday));
    
    // Initialize 6 weeks: index 0 is current week, 5 is 5 weeks ago
    const weeks = [];
    for (let i = 0; i < 6; i++) {
      const startOfWeek = new Date(currentMonday.getTime());
      startOfWeek.setDate(startOfWeek.getDate() - (i * 7));
      
      const label = `${startOfWeek.getMonth() + 1}/${startOfWeek.getDate()}`;
      
      weeks.unshift({
        index: i,
        label, // e.g. "6/1"
        hours: 0,
        earnings: 0
      });
    }
    
    // Distribute entries into the buckets
    entries.forEach(e => {
      const entryDate = new Date(e.date);
      entryDate.setHours(0,0,0,0);
      
      const msDiff = currentMonday - entryDate;
      const daysDiff = msDiff / (1000 * 60 * 60 * 24);
      
      let weeksAgo = 0;
      if (daysDiff > 0) {
        weeksAgo = Math.floor(daysDiff / 7) + 1;
      }
      
      if (weeksAgo >= 0 && weeksAgo < 6) {
        const weekObj = weeks.find(w => w.index === weeksAgo);
        if (weekObj) {
          weekObj.hours += e.duration;
          weekObj.earnings += e.isBillable !== false ? e.duration * e.rate : 0;
        }
      }
    });
    
    return weeks;
  }, [entries]);

  const maxHours = useMemo(() => Math.max(...weeklyTrends.map(w => w.hours), 5), [weeklyTrends]);
  const maxEarnings = useMemo(() => Math.max(...weeklyTrends.map(w => w.earnings), 500), [weeklyTrends]);

  return (
    <div className="analytics-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* 1. Top Row: KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        
        {/* KPI 1: Billable Ratio */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', minHeight: 'auto' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Billable Ratio</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, display: 'block', margin: '0.15rem 0', color: 'var(--text-primary)' }}>
              {billableRatio.toFixed(1)}%
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {billableHours.toFixed(1)}h / {totalHours.toFixed(1)}h logged
            </span>
          </div>
        </div>

        {/* KPI 2: Effective Hourly Yield */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', minHeight: 'auto' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-paid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Blended Yield</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, display: 'block', margin: '0.15rem 0', color: 'var(--text-primary)' }}>
              {formatCurrency(hourlyYield)}/hr
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Actual return per logged hour
            </span>
          </div>
        </div>

        {/* KPI 3: Accounts Receivable Outstanding */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', minHeight: 'auto' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-unbilled)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Receipt size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>A/R Outstanding</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, display: 'block', margin: '0.15rem 0', color: 'var(--text-primary)' }}>
              {formatCurrency(outstandingAR)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Unpaid & Overdue collections
            </span>
          </div>
        </div>

      </div>

      {/* 2. Main Grid: 2x2 Layout of Detailed Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* Card A: Earnings Breakdown by Client */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <PieChart size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Earnings Breakdown by Client</h2>
          </div>

          {clientStats.list.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
              Log hours to view earning analytics
            </div>
          ) : (
            <div className="analytics-grid">
              {/* SVG Donut */}
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <svg viewBox="0 0 42 42" width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
                  {donutSegments.map((seg, idx) => (
                    <circle
                      key={idx}
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="4"
                      strokeDasharray={seg.strokeDashArray}
                      strokeDashoffset={seg.strokeDashOffset}
                    />
                  ))}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCurrency(clientStats.grandTotalEarnings)}</span>
                </div>
              </div>

              {/* Donut Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {donutSegments.map((seg, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: seg.color }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {seg.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '0.9rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>{formatCurrency(seg.earnings)}</span>
                      <span>{seg.percent.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card B: Hours per Category Progress Bars */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <BarChart3 size={20} style={{ color: '#ec4899' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Hours Spent by Category</h2>
          </div>

          {categoryStats.list.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
              Log hours to view category analytics
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
              {categoryStats.list.slice(0, 5).map((stat, idx) => {
                const percentage = categoryStats.totalHours > 0 
                  ? (stat.hours / categoryStats.totalHours) * 100 
                  : 0;
                return (
                  <div key={idx} className="progress-bar-container">
                    <div className="progress-bar-header">
                      <span style={{ fontWeight: 500 }}>{stat.category}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {stat.hours.toFixed(1)} hrs ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="progress-bar-track">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: idx === 0 ? '#7c3aed' : idx === 1 ? '#ec4899' : idx === 2 ? '#3b82f6' : idx === 3 ? '#10b981' : '#f59e0b' 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card C: Billable vs. Non-Billable Progress Ratio */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Percent size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Billable vs. Non-Billable Overhead</h2>
          </div>

          {totalHours === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
              Log hours to view productivity ratio
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', justifyContent: 'center', flex: 1 }}>
              
              {/* Ratio Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ height: '32px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.03)', display: 'flex', overflow: 'hidden', padding: '3px', border: '1px solid var(--border-color)' }}>
                  {billableRatio > 0 && (
                    <div 
                      style={{ 
                        width: `${billableRatio}%`, 
                        background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', 
                        borderRadius: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        transition: 'width 0.5s ease'
                      }}
                      title={`Billable: ${billableRatio.toFixed(1)}%`}
                    >
                      {billableRatio >= 15 ? `${billableRatio.toFixed(0)}%` : ''}
                    </div>
                  )}
                  {100 - billableRatio > 0 && (
                    <div 
                      style={{ 
                        width: `${100 - billableRatio}%`, 
                        backgroundColor: 'rgba(255,255,255,0.06)', 
                        borderRadius: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        transition: 'width 0.5s ease'
                      }}
                      title={`Non-Billable: ${(100 - billableRatio).toFixed(1)}%`}
                    >
                      {100 - billableRatio >= 15 ? `${(100 - billableRatio).toFixed(0)}%` : ''}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#a78bfa', fontWeight: 500 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7c3aed' }} />
                    Billable ({billableHours.toFixed(1)} hrs)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.3)' }} />
                    Non-Billable ({nonBillableHours.toFixed(1)} hrs)
                  </span>
                </div>
              </div>

              {/* Aggregated details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>BILLABLE EARNINGS</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-paid)' }}>{formatCurrency(clientStats.grandTotalEarnings)}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>OVERHEAD TIME</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{((nonBillableHours / (totalHours || 1)) * 100).toFixed(0)}%</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Card D: Weekly Earning & Effort Trends */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingUp size={20} style={{ color: '#10b981' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Weekly Earning & Effort Trends</h2>
          </div>

          {totalHours === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
              Log hours to view weekly trends
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'space-between' }}>
              
              {/* SVG Chart */}
              <div style={{ position: 'relative', width: '100%', height: '180px', marginTop: '1rem' }}>
                <svg viewBox="0 0 300 150" style={{ width: '100%', height: '100%' }}>
                  {/* Guide lines */}
                  <line x1="20" y1="20" x2="280" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <line x1="20" y1="70" x2="280" y2="70" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <line x1="20" y1="120" x2="280" y2="120" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                  {weeklyTrends.map((w, idx) => {
                    const x = 32 + idx * 41;
                    
                    const hHours = maxHours > 0 ? (w.hours / maxHours) * 100 : 0;
                    const yHours = 120 - hHours;
                    
                    const hEarnings = maxEarnings > 0 ? (w.earnings / maxEarnings) * 100 : 0;
                    const yEarnings = 120 - hEarnings;

                    return (
                      <g key={idx}>
                        {/* Hours Bar */}
                        <rect 
                          x={x} 
                          y={yHours} 
                          width="9" 
                          height={Math.max(hHours, 1)} 
                          fill="url(#hoursGrad)" 
                          rx="2"
                        />
                        {/* Earnings Bar */}
                        <rect 
                          x={x + 11} 
                          y={yEarnings} 
                          width="9" 
                          height={Math.max(hEarnings, 1)} 
                          fill="url(#earningsGrad)" 
                          rx="2"
                        />
                        {/* X Axis Label */}
                        <text 
                          x={x + 10} 
                          y="138" 
                          textAnchor="middle" 
                          fill="var(--text-muted)" 
                          fontSize="7" 
                          fontWeight="600"
                        >
                          {w.label}
                        </text>
                      </g>
                    );
                  })}

                  <defs>
                    <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                    <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#a78bfa', fontWeight: 500 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#7c3aed' }} />
                  Effort (Hours)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#34d399', fontWeight: 500 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10b981' }} />
                  Earnings (USD)
                </span>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
