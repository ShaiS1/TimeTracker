import React from 'react';
import { DollarSign, Clock, FileText, CheckCircle, TrendingUp } from 'lucide-react';

export default function Dashboard({ entries, clients }) {
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

  entries.forEach(entry => {
    const entryDate = parseEntryDate(entry.date);
    const amount = entry.duration * entry.rate;
    
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
  });

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
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
      </div>
    </div>
  );
}
