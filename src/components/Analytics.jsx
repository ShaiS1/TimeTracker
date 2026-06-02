import React, { useMemo } from 'react';
import { DollarSign, Clock, BarChart3, PieChart } from 'lucide-react';

export default function Analytics({ entries, clients }) {
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
      const amount = e.duration * e.rate;
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

  // Category calculations
  const categoryStats = useMemo(() => {
    const stats = {};
    let totalHours = 0;

    entries.forEach(e => {
      totalHours += e.duration;
      if (!stats[e.category]) {
        stats[e.category] = { category: e.category, hours: 0 };
      }
      stats[e.category].hours += e.duration;
    });

    return {
      list: Object.values(stats).sort((a, b) => b.hours - a.hours),
      totalHours
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

  return (
    <div className="analytics-section">
      {/* Earnings per Client - Donut Chart & Legend */}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'center', flex: 1 }}>
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

      {/* Hours per Category - Horizontal Progress bars */}
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
    </div>
  );
}
