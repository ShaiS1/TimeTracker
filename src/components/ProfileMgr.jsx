import React, { useState } from 'react';
import { User, ShieldAlert, Download, Upload, Trash2 } from 'lucide-react';
import { exportBackup, importBackup } from '../utils/storage';

export default function ProfileMgr({ userProfile, onUpdateProfile, onDeleteAccount }) {
  const [name, setName] = useState(userProfile.name || '');
  const [email, setEmail] = useState(userProfile.email || '');
  const [company, setCompany] = useState(userProfile.company || '');
  const [address, setAddress] = useState(userProfile.address || '');
  const [paymentDetails, setPaymentDetails] = useState(userProfile.paymentDetails || '');
  const [taxRate, setTaxRate] = useState(userProfile.taxRate || 0);

  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateProfile({
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      address: address.trim(),
      paymentDetails: paymentDetails.trim(),
      taxRate: parseFloat(taxRate) || 0
    });
    alert('Developer profile updated successfully.');
  };

  const handleExport = () => {
    const dataStr = exportBackup();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `tempo_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    if (!file) return;

    fileReader.onload = (event) => {
      const result = event.target.result;
      const success = importBackup(result);
      if (success) {
        alert('Data backup imported successfully! Reloading to apply changes.');
        window.location.reload();
      } else {
        alert('Failed to parse backup file. Please make sure the JSON format matches Tempo schema.');
      }
    };
    fileReader.readAsText(file);
  };

  const handleDeleteAccountClick = () => {
    if (deleteConfirm === 'DELETE') {
      onDeleteAccount();
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
      {/* Profile Form */}
      <form className="card" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
          <User size={20} style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Billing Contractor Profile</h2>
        </div>

        <div className="profile-grid">
          <div className="form-group">
            <label>Full Contractor Name *</label>
            <input 
              type="text" 
              className="input-field" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Alex Mercer" 
              required
            />
          </div>

          <div className="form-group">
            <label>Professional Email *</label>
            <input 
              type="email" 
              className="input-field" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="e.g. alex@mercer.dev" 
              required
            />
          </div>

          <div className="form-group full-width">
            <label>Company Name (Optional)</label>
            <input 
              type="text" 
              className="input-field" 
              value={company} 
              onChange={(e) => setCompany(e.target.value)} 
              placeholder="e.g. Mercer Consulting LLC" 
            />
          </div>

          <div className="form-group full-width">
            <label>Business Address (for Invoice Header)</label>
            <textarea 
              className="textarea-field" 
              rows="3" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              placeholder="e.g. 742 Evergreen Terrace, Seattle, WA 98101" 
            />
          </div>

          <div className="form-group full-width">
            <label>Payment Methods & Details (Appears on Invoice Footer)</label>
            <textarea 
              className="textarea-field" 
              rows="3" 
              value={paymentDetails} 
              onChange={(e) => setPaymentDetails(e.target.value)} 
              placeholder="e.g. Bank Transfer: Routing #123456789, Account #987654321 or PayPal: payment@mercer.dev" 
            />
          </div>

          <div className="form-group">
            <label>Default Tax Rate (%)</label>
            <input 
              type="number" 
              className="input-field" 
              min="0" 
              max="100" 
              step="0.01" 
              value={taxRate} 
              onChange={(e) => setTaxRate(e.target.value)} 
              placeholder="e.g. 10" 
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
          <button type="submit" className="btn btn-primary">
            Save Profile Settings
          </button>
        </div>
      </form>

      {/* Right Column: Backup and Danger Zone */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Backup Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Data Backup & Portability</h2>
          </div>
          
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Your account database is securely stored in AWS cloud services (Cognito / DynamoDB). You can export a JSON backup file for offline records or manual portability.
          </p>

          <button className="btn btn-secondary" onClick={handleExport} style={{ justifyContent: 'flex-start' }}>
            <Download size={16} /> Export State Backup (.JSON)
          </button>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <label className="btn btn-secondary" style={{ display: 'flex', width: '100%', justifyContent: 'flex-start', cursor: 'pointer' }}>
              <Upload size={16} />
              <span>Import State Backup (.JSON)</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImport} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>
        </div>

        {/* Danger Zone Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(239, 68, 68, 0.25)', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} style={{ color: '#ef4444' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ef4444' }}>Danger Zone</h2>
          </div>
          
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Permanently delete your user credentials and all associated client sheets, invoices, settings, and logs. This action is immediate and cannot be undone.
          </p>

          <div className="form-group" style={{ marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Type <strong style={{ color: '#ef4444' }}>DELETE</strong> to confirm:</label>
            <input 
              type="text" 
              className="input-field" 
              style={{ padding: '0.5rem 0.75rem', borderColor: deleteConfirm === 'DELETE' ? '#ef4444' : 'var(--border-color)', color: deleteConfirm === 'DELETE' ? '#ef4444' : 'var(--text-primary)' }}
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
          </div>

          <button 
            className="btn" 
            onClick={handleDeleteAccountClick}
            disabled={deleteConfirm !== 'DELETE'}
            style={{ 
              backgroundColor: deleteConfirm === 'DELETE' ? '#ef4444' : 'rgba(239, 68, 68, 0.08)', 
              color: deleteConfirm === 'DELETE' ? '#fff' : 'rgba(239, 68, 68, 0.4)',
              cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              padding: '0.6rem'
            }}
          >
            <Trash2 size={16} /> Delete Account Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
