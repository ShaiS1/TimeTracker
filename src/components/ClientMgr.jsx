import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Mail, MapPin, DollarSign, X, Pin } from 'lucide-react';

export default function ClientMgr({ clients, onAddClient, onUpdateClient, onDeleteClient, onTogglePinClient }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [roundingRule, setRoundingRule] = useState('default');
  const [budgetType, setBudgetType] = useState('none');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState('none');

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setEmail('');
    setDefaultRate('100');
    setAddress('');
    setNotes('');
    setRoundingRule('default');
    setBudgetType('none');
    setBudgetLimit('');
    setBudgetPeriod('none');
    setIsModalOpen(true);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setName(client.name);
    setEmail(client.email || '');
    setDefaultRate(client.defaultRate.toString());
    setAddress(client.address || '');
    setNotes(client.notes || '');
    setRoundingRule(client.roundingRule || 'default');
    setBudgetType(client.budgetType || 'none');
    setBudgetLimit(client.budgetLimit ? client.budgetLimit.toString() : '');
    setBudgetPeriod(client.budgetPeriod || 'none');
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Client Name is required.');
      return;
    }
    const rateVal = parseFloat(defaultRate);
    if (isNaN(rateVal) || rateVal < 0) {
      alert('Hourly Rate must be a valid number >= 0.');
      return;
    }

    const limitVal = parseFloat(budgetLimit);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      defaultRate: rateVal,
      address: address.trim(),
      notes: notes.trim(),
      roundingRule,
      budgetType,
      budgetLimit: isNaN(limitVal) ? null : limitVal,
      budgetPeriod
    };

    if (editingClient) {
      onUpdateClient(editingClient.id, payload);
    } else {
      onAddClient(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? Existing time logs for this client will not be deleted but will remain associated with their name.`)) {
      onDeleteClient(id);
    }
  };

  return (
    <div className="client-manager-section">
      <div className="view-header-container">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Client Management</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manage your corporate clients, contact info, and base billing rates.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Add New Client
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {clients.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <h3>No clients added yet</h3>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>Add your first client to start tracking hourly billings.</p>
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={16} /> Add First Client
            </button>
          </div>
        ) : (
          clients.map(client => (
            <div className="card" key={client.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{client.name}</h3>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    <DollarSign size={16} /> {client.defaultRate}/hr
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-icon-only btn-sm" 
                    onClick={() => onTogglePinClient(client.id)}
                    title={client.isPinned ? "Unpin Client" : "Pin Client"}
                    style={{ 
                      color: client.isPinned ? 'var(--color-primary)' : 'var(--text-muted)',
                      borderColor: client.isPinned ? 'var(--color-primary)' : ''
                    }}
                  >
                    <Pin size={14} style={{ transform: client.isPinned ? 'none' : 'rotate(45deg)', transition: 'transform 0.2s' }} />
                  </button>
                  <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => openEditModal(client)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="btn btn-danger btn-icon-only btn-sm" onClick={() => handleDelete(client.id, client.name)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 'auto' }}>
                {client.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <MapPin size={14} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {client.address}
                    </span>
                  </div>
                )}
              </div>

              {client.notes && (
                <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  {client.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleSave}>
            <div className="modal-header">
              <h2 className="modal-title">{editingClient ? 'Edit Client Details' : 'Add New Client'}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Client Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required 
                  placeholder="e.g. Acme Corp" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>Billing Email Address</label>
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="e.g. billing@acme.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>Hourly Billing Rate ($/hr) *</label>
                <input 
                  type="number" 
                  className="input-field" 
                  required 
                  min="0" 
                  step="0.01" 
                  placeholder="e.g. 120" 
                  value={defaultRate} 
                  onChange={(e) => setDefaultRate(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>Time Rounding Configuration</label>
                <select 
                  className="select-field"
                  value={roundingRule}
                  onChange={(e) => setRoundingRule(e.target.value)}
                >
                  <option value="default">Use profile default</option>
                  <option value="none">None (Raw Time)</option>
                  <option value="nearest_6">Nearest 6 Minutes (0.1h)</option>
                  <option value="nearest_15">Nearest 15 Minutes (0.25h)</option>
                  <option value="nearest_30">Nearest 30 Minutes (0.5h)</option>
                  <option value="ceil_15">Round Up to Nearest 15 Minutes</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Budget Type</label>
                  <select 
                    className="select-field"
                    value={budgetType}
                    onChange={(e) => setBudgetType(e.target.value)}
                  >
                    <option value="none">No Cap</option>
                    <option value="hours">Hours Limit</option>
                    <option value="revenue">Revenue Cap</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Budget Period</label>
                  <select 
                    className="select-field"
                    value={budgetPeriod}
                    onChange={(e) => setBudgetPeriod(e.target.value)}
                    disabled={budgetType === 'none'}
                  >
                    <option value="none">No Period</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="total">Total / Lifetime</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Limit Value</label>
                  <input 
                    type="number"
                    className="input-field"
                    placeholder={budgetType === 'none' ? '—' : budgetType === 'hours' ? 'e.g. 40' : 'e.g. 5000'}
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                    disabled={budgetType === 'none'}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Client Office Address (for Invoices)</label>
                <textarea 
                  className="textarea-field" 
                  rows="3" 
                  placeholder="e.g. 100 Main St, Suite 500, Seattle, WA 98101" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Notes / Context</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Primary contact name, slack channel, etc." 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingClient ? 'Save Changes' : 'Create Client'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
