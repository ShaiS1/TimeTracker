import React, { useState, useMemo } from 'react';
import { Search, Calendar, FileText, Check, Trash2, Download, AlertCircle, Clock } from 'lucide-react';

export default function Invoices({ invoices, clients, entries, onMarkPaid, onMarkUnpaid, onDeleteInvoice, onRedownloadPDF }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Sort State
  const [sortField, setSortField] = useState('issueDate');
  const [sortDirection, setSortDirection] = useState('desc');

  // Client mapping helper
  const clientMap = useMemo(() => {
    return clients.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [clients]);

  // Derived status and overdue check helper
  const resolvedInvoices = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return invoices.map(inv => {
      let status = inv.status;
      if (status === 'Unpaid' && inv.dueDate < todayStr) {
        status = 'Overdue';
      }
      return {
        ...inv,
        resolvedStatus: status
      };
    });
  }, [invoices]);

  // Sort and Filter logic
  const filteredInvoices = useMemo(() => {
    return resolvedInvoices
      .filter(inv => {
        // Client filter
        if (filterClient && inv.clientId !== filterClient) return false;
        
        // Status filter
        if (filterStatus) {
          if (filterStatus === 'Overdue') {
            if (inv.resolvedStatus !== 'Overdue') return false;
          } else {
            if (inv.status !== filterStatus) return false;
          }
        }
        
        // Search query (invoice number or client name)
        if (searchQuery) {
          const clientName = clientMap[inv.clientId]?.name || '';
          const matchStr = `${inv.invoiceNumber} ${clientName}`.toLowerCase();
          if (!matchStr.includes(searchQuery.toLowerCase())) return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        
        if (sortField === 'amount') {
          valA = parseFloat(a.amount);
          valB = parseFloat(b.amount);
        }
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [resolvedInvoices, filterClient, filterStatus, searchQuery, sortField, sortDirection, clientMap]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const getStatusBadge = (status) => {
    if (status === 'Paid') {
      return <span className="badge badge-paid"><Check size={12} /> Paid</span>;
    }
    if (status === 'Overdue') {
      return <span className="badge badge-danger" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}><AlertCircle size={12} /> Overdue</span>;
    }
    return <span className="badge badge-unbilled"><Clock size={12} /> Unpaid</span>;
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
              placeholder="Search invoice number..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', padding: '0.6rem 0.5rem', width: '100%', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', mdWidth: 'auto' }}>
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
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table (Desktop View) */}
      <div className="card table-container desktop-only-view" style={{ padding: 0 }}>
        {filteredInvoices.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <h3>No invoices found</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Create invoices from the Time Logs tab to populate this registry.</p>
          </div>
        ) : (
          <table className="table-entries">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('invoiceNumber')}>Invoice #</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('clientId')}>Client</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('issueDate')}>Issue Date</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('dueDate')}>Due Date</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('amount')}>Total Amount</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>Status</th>
                <th style={{ width: '180px', textAlign: 'right', paddingRight: '1.25rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => {
                const client = clientMap[inv.clientId];
                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{inv.invoiceNumber}</td>
                    <td style={{ fontWeight: 500 }}>{client ? client.name : 'Unknown Client'}</td>
                    <td>{inv.issueDate}</td>
                    <td>{inv.dueDate}</td>
                    <td style={{ fontWeight: 600, fontFeatureSettings: "tnum", textAlign: 'right' }}>
                      {formatCurrency(inv.amount)}
                      {inv.taxRate > 0 && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          Inc. {inv.taxRate}% Tax
                        </div>
                      )}
                    </td>
                    <td>{getStatusBadge(inv.resolvedStatus)}</td>
                    <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                      <div className="cell-actions" style={{ justifyContent: 'flex-end' }}>
                        {inv.status === 'Unpaid' && (
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ color: 'var(--color-paid)', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                            onClick={() => onMarkPaid(inv.id)}
                            title="Mark as Paid"
                          >
                            <Check size={13} /> Pay
                          </button>
                        )}
                        {inv.status === 'Paid' && (
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ color: 'var(--color-unbilled)', borderColor: 'rgba(245, 158, 11, 0.2)' }}
                            onClick={() => onMarkUnpaid(inv.id)}
                            title="Mark as Unpaid"
                          >
                            <Clock size={13} /> Unpay
                          </button>
                        )}
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          onClick={() => onRedownloadPDF(inv)}
                          title="Re-download PDF Invoice"
                        >
                          <Download size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          style={{ color: 'var(--color-danger)' }} 
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber}? Associated time entries will be reset back to "Unbilled".`)) {
                              onDeleteInvoice(inv.id);
                            }
                          }}
                          title="Delete Invoice Registry Record"
                        >
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
        {filteredInvoices.length === 0 ? (
          <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <h3>No invoices found</h3>
          </div>
        ) : (
          filteredInvoices.map(inv => {
            const client = clientMap[inv.clientId];
            return (
              <div className="card mobile-entry-card" key={inv.id}>
                {/* Row 1: Invoice # & Client Name */}
                <div className="mobile-card-row">
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{inv.invoiceNumber}</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {client ? client.name : 'Unknown Client'}
                  </strong>
                </div>

                {/* Row 2: Dates & Amount */}
                <div className="mobile-card-row" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Due: {inv.dueDate}</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontFeatureSettings: "tnum" }}>
                    {formatCurrency(inv.amount)}
                  </strong>
                </div>

                {/* Row 3: Status Badge and Actions */}
                <div className="mobile-card-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                  {getStatusBadge(inv.resolvedStatus)}
                  
                  <div className="cell-actions">
                    {inv.status === 'Unpaid' && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ color: 'var(--color-paid)', borderColor: 'rgba(16, 185, 129, 0.2)', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => onMarkPaid(inv.id)}
                      >
                        <Check size={12} /> Pay
                      </button>
                    )}
                    {inv.status === 'Paid' && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ color: 'var(--color-unbilled)', borderColor: 'rgba(245, 158, 11, 0.2)', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => onMarkUnpaid(inv.id)}
                      >
                        <Clock size={12} /> Unpay
                      </button>
                    )}
                    <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => onRedownloadPDF(inv)}>
                      <Download size={13} />
                    </button>
                    <button 
                      className="btn btn-secondary btn-icon-only btn-sm" 
                      style={{ color: 'var(--color-danger)' }} 
                      onClick={() => {
                        if (window.confirm(`Delete invoice ${inv.invoiceNumber}? Entries will reset to "Unbilled".`)) {
                          onDeleteInvoice(inv.id);
                        }
                      }}
                    >
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
