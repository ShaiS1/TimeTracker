import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Check, Download, FileText, ChevronDown, ChevronUp, Search, Calendar } from 'lucide-react';

export default function EntryList({ entries, clients, onDeleteEntry, onEditEntry, onUpdateStatus, onGenerateInvoice }) {
  const [filterClient, setFilterClient] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Sort State
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Client mapping helper
  const clientMap = useMemo(() => {
    return clients.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [clients]);

  // Sort logic
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter & Search Logic
  const filteredEntries = useMemo(() => {
    return entries
      .filter(entry => {
        // Client filter
        if (filterClient && entry.clientId !== filterClient) return false;
        
        // Category filter
        if (filterCategory && entry.category !== filterCategory) return false;
        
        // Status filter
        if (filterStatus && entry.status !== filterStatus) return false;
        
        // Date range filters
        if (filterStartDate && entry.date < filterStartDate) return false;
        if (filterEndDate && entry.date > filterEndDate) return false;
        
        // Search query filter (search descriptions and client names)
        if (searchQuery) {
          const clientName = clientMap[entry.clientId]?.name || '';
          const matchStr = `${entry.description} ${entry.category} ${clientName}`.toLowerCase();
          if (!matchStr.includes(searchQuery.toLowerCase())) return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        
        // Date sorting
        if (sortField === 'date') {
          return sortDirection === 'asc' 
            ? new Date(valA) - new Date(valB)
            : new Date(valB) - new Date(valA);
        }

        // Amount sorting (duration * rate)
        if (sortField === 'amount') {
          valA = a.duration * a.rate;
          valB = b.duration * b.rate;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [entries, filterClient, filterCategory, filterStatus, filterStartDate, filterEndDate, searchQuery, sortField, sortDirection, clientMap]);

  // Totals calculations
  const totals = useMemo(() => {
    let hours = 0;
    let amount = 0;
    filteredEntries.forEach(e => {
      hours += e.duration;
      amount += e.duration * e.rate;
    });
    return { hours, amount };
  }, [filteredEntries]);

  // Handle multi-select checkboxes
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredEntries.map(entry => entry.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkStatusChange = (status) => {
    if (selectedIds.length === 0) return;
    onUpdateStatus(selectedIds, status);
    setSelectedIds([]);
  };

  const handleInvoiceRequest = () => {
    // We can only generate an invoice for selected entries, OR if none selected, all filtered entries.
    const targetEntries = selectedIds.length > 0 
      ? entries.filter(e => selectedIds.includes(e.id))
      : filteredEntries;

    if (targetEntries.length === 0) {
      alert("No time entries selected or matching current filters to invoice.");
      return;
    }

    // Verify all belong to the same client
    const clientIds = new Set(targetEntries.map(e => e.clientId));
    if (clientIds.size > 1) {
      alert("Invoice generation requires all selected entries to belong to the SAME client. Please filter by a single client first.");
      return;
    }

    const clientId = Array.from(clientIds)[0];
    onGenerateInvoice(clientId, targetEntries);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} style={{ marginLeft: '4px' }} /> : <ChevronDown size={14} style={{ marginLeft: '4px' }} />;
  };

  const categories = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.category)));
  }, [entries]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filtering and Query Bar */}
      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignSelf: 'stretch', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 0.75rem', flex: 1, minWidth: '220px' }}>
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search description, categories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', padding: '0.6rem 0.5rem', width: '100%', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', mdWidth: 'auto', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
            <select 
              className="select-field filter-item" 
              value={filterClient} 
              onChange={(e) => setFilterClient(e.target.value)}
            >
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select 
              className="select-field filter-item" 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
            </select>

            <select 
              className="select-field filter-item" 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Unbilled">Unbilled</option>
              <option value="Billed">Billed</option>
              <option value="Paid">Paid</option>
            </select>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="date" 
                className="input-field filter-item" 
                style={{ padding: '0.45rem' }} 
                value={filterStartDate} 
                onChange={(e) => setFilterStartDate(e.target.value)} 
                title="Start Date"
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
              <input 
                type="date" 
                className="input-field filter-item" 
                style={{ padding: '0.45rem' }} 
                value={filterEndDate} 
                onChange={(e) => setFilterEndDate(e.target.value)} 
                title="End Date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* List actions & Summary stats bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {selectedIds.length > 0 && (
            <>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {selectedIds.length} selected:
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkStatusChange('Unbilled')}>
                Mark Unbilled
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkStatusChange('Billed')} style={{ color: 'var(--color-billed)' }}>
                Mark Billed
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkStatusChange('Paid')} style={{ color: 'var(--color-paid)' }}>
                Mark Paid
              </button>
            </>
          )}
          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleInvoiceRequest}
            disabled={filteredEntries.length === 0}
            style={{ padding: '0.5rem 1rem' }}
          >
            <FileText size={16} /> Generate Invoice PDF
          </button>
        </div>

        {/* Aggregate panel */}
        <div style={{ display: 'flex', gap: '1.5rem', padding: '0.5rem 1.25rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Filtered Time: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{totals.hours.toFixed(2)} hrs</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Filtered Subtotal: </span>
            <strong style={{ color: 'var(--color-paid)' }}>{formatCurrency(totals.amount)}</strong>
          </div>
        </div>
      </div>

      {/* Main Table (Desktop View) */}
      <div className="card table-container desktop-only-view" style={{ padding: 0 }}>
        {filteredEntries.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <h3>No entries found matching filters</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Try clearing your filters or logging new hours.</p>
          </div>
        ) : (
          <table className="table-entries">
            <thead>
              <tr>
                <th style={{ width: '40px', paddingLeft: '1.25rem' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={selectedIds.length === filteredEntries.length && filteredEntries.length > 0} 
                  />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>Date {getSortIcon('date')}</div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('clientId')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>Client {getSortIcon('clientId')}</div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('category')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>Category {getSortIcon('category')}</div>
                </th>
                <th style={{ width: '30%' }}>Description</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('duration')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>Hours {getSortIcon('duration')}</div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('amount')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>Amount {getSortIcon('amount')}</div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>Status {getSortIcon('status')}</div>
                </th>
                <th style={{ width: '100px', textAlign: 'right', paddingRight: '1.25rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(entry => {
                const client = clientMap[entry.clientId];
                const isSelected = selectedIds.includes(entry.id);
                return (
                  <tr key={entry.id} style={{ backgroundColor: isSelected ? 'rgba(124, 58, 237, 0.04)' : '' }}>
                    <td style={{ paddingLeft: '1.25rem' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => handleSelectRow(entry.id)} 
                      />
                    </td>
                    <td>{entry.date}</td>
                    <td style={{ fontWeight: 500 }}>{client ? client.name : 'Unknown'}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                        {entry.category}
                      </span>
                    </td>
                    <td>
                      <div className="entry-description-text" title={entry.description}>
                        {entry.description}
                      </div>
                    </td>
                    <td style={{ fontFeatureSettings: "tnum" }}>{entry.duration.toFixed(2)}h</td>
                    <td style={{ fontWeight: 600, fontFeatureSettings: "tnum" }}>{formatCurrency(entry.duration * entry.rate)}</td>
                    <td>
                      <span className={`badge badge-${entry.status.toLowerCase()}`}>
                        {entry.status}
                        {entry.invoiceNumber && <span style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: '2px' }}>({entry.invoiceNumber})</span>}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                      <div className="cell-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => onEditEntry(entry)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-secondary btn-icon-only btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => onDeleteEntry(entry.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Card List View */}
      <div className="mobile-only-view">
        {filteredEntries.length === 0 ? (
          <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <h3>No entries found</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Try adjusting filters.</p>
          </div>
        ) : (
          filteredEntries.map(entry => {
            const client = clientMap[entry.clientId];
            const isSelected = selectedIds.includes(entry.id);
            return (
              <div 
                className="card mobile-entry-card" 
                key={entry.id}
                style={{ 
                  backgroundColor: isSelected ? 'rgba(124, 58, 237, 0.04)' : '',
                  borderColor: isSelected ? 'var(--color-primary)' : ''
                }}
              >
                {/* Row 1: Checkbox, Client Name, and Amount */}
                <div className="mobile-card-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => handleSelectRow(entry.id)} 
                    />
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {client ? client.name : 'Unknown'}
                    </strong>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-paid)', fontFeatureSettings: "tnum" }}>
                      {formatCurrency(entry.duration * entry.rate)}
                    </strong>
                  </div>
                </div>

                {/* Row 2: Date, Duration, and Category Badge */}
                <div className="mobile-card-row" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>{entry.date} &bull; {entry.duration.toFixed(2)}h</span>
                  <span style={{ padding: '0.15rem 0.4rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem' }}>
                    {entry.category}
                  </span>
                </div>

                {/* Row 3: Description */}
                <div className="mobile-card-desc">
                  {entry.description}
                </div>

                {/* Row 4: Status Badge and Actions */}
                <div className="mobile-card-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                  <span className={`badge badge-${entry.status.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                    {entry.status}
                    {entry.invoiceNumber && <span style={{ fontSize: '0.6rem', opacity: 0.7, marginLeft: '2px' }}>({entry.invoiceNumber})</span>}
                  </span>
                  
                  <div className="cell-actions">
                    <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => onEditEntry(entry)}>
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn-secondary btn-icon-only btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => onDeleteEntry(entry.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
