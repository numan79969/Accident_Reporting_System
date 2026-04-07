import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const ROLES = ['citizen', 'admin', 'police', 'emergency_responder', 'hospital'];

const emptyForm = {
  name: '', email: '', password: '', phone: '',
  role: 'citizen', organization: '', badge_number: '',
  latitude: '', longitude: '', is_verified: true,
};

const AdminDashboard = () => {
  const [tab, setTab] = useState('accidents');

  // ── Accidents state ──
  const [accidents, setAccidents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [dispatches, setDispatches] = useState([]);

  // ── User management state ──
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const headers = useCallback(() => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }, []);

  // ── Fetch accidents + analytics ──
  useEffect(() => {
    const h = headers();
    axios.get(`${API}/accidents/all`, { headers: h }).then((r) => setAccidents(r.data)).catch(() => {});
    axios.get(`${API}/admin/analytics`, { headers: h }).then((r) => setAnalytics(r.data)).catch(() => {});
  }, [headers]);

  // ── Fetch users when tab switches ──
  const fetchUsers = useCallback(() => {
    axios.get(`${API}/admin/users`, { headers: headers() })
      .then((r) => setUsers(r.data))
      .catch(() => {});
  }, [headers]);

  useEffect(() => {
    if (tab === 'users') fetchUsers();
  }, [tab, fetchUsers]);

  // ── Accidents helpers ──
  const viewDispatches = async (accidentId) => {
    try {
      const res = await axios.get(`${API}/notifications/accident/${accidentId}`, { headers: headers() });
      setDispatches(res.data);
      setSelectedAccident(accidentId);
    } catch (err) {
      console.error(err);
    }
  };

  // ── User form helpers ──
  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingUser(null);
    setShowForm(false);
    setUserError('');
    setUserSuccess('');
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditingUser(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      role: user.role,
      organization: user.organization || '',
      badge_number: user.badge_number || '',
      latitude: user.latitude ?? '',
      longitude: user.longitude ?? '',
      is_verified: user.is_verified,
    });
    setShowForm(true);
    setUserError('');
    setUserSuccess('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');
    try {
      const payload = { ...form };
      // Clean optional numeric fields
      payload.latitude = payload.latitude !== '' ? parseFloat(payload.latitude) : null;
      payload.longitude = payload.longitude !== '' ? parseFloat(payload.longitude) : null;
      payload.phone = payload.phone || null;
      payload.organization = payload.organization || null;
      payload.badge_number = payload.badge_number || null;

      if (editingUser) {
        if (!payload.password) delete payload.password;
        await axios.put(`${API}/admin/users/${editingUser}`, payload, { headers: headers() });
        setUserSuccess('User updated successfully');
      } else {
        if (!payload.password) { setUserError('Password is required'); return; }
        await axios.post(`${API}/admin/users`, payload, { headers: headers() });
        setUserSuccess('User created successfully');
      }
      fetchUsers();
      setTimeout(resetForm, 1200);
    } catch (err) {
      setUserError(err.response?.data?.detail || 'Operation failed');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.organization || '').toLowerCase().includes(q)
    );
  });

  // ── Render ──
  return (
    <div className="dashboard" style={{ maxWidth: 960 }}>
      <h2>Admin Dashboard</h2>

      {/* Tab bar */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'accidents' ? 'active' : ''}`}
          onClick={() => setTab('accidents')}
        >
          Accidents
        </button>
        <button
          className={`admin-tab ${tab === 'users' ? 'active' : ''}`}
          onClick={() => setTab('users')}
        >
          User Management
        </button>
      </div>

      {/* ════════════ ACCIDENTS TAB ════════════ */}
      {tab === 'accidents' && (
        <>
          {analytics && (
            <div className="analytics-row">
              <div className="stat-card">
                <div className="stat-number">{analytics.total_accidents}</div>
                <div className="stat-label">Total Accidents</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{analytics.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{analytics.resolved}</div>
                <div className="stat-label">Resolved</div>
              </div>
            </div>
          )}

          <h3>All Accidents</h3>
          {accidents.length === 0 ? (
            <p>No accidents reported yet.</p>
          ) : (
            <ul>
              {accidents.map((a) => (
                <li key={a.id}>
                  <div className="report-row">
                    <div>
                      <strong>{a.location}</strong> &bull; {a.severity.toUpperCase()}
                    </div>
                    <div className="report-status">{a.status}</div>
                  </div>
                  <p>{a.description}</p>
                  <div className="report-details">
                    <span>Injuries: {a.injuries || 'N/A'}</span>
                    <span>Vehicle: {a.vehicle_type || 'N/A'}</span>
                    <span>Reported: {new Date(a.reported_at).toLocaleString()}</span>
                  </div>
                  <button
                    className="secondary"
                    style={{ marginTop: 8, width: 'auto', padding: '6px 14px' }}
                    onClick={() => viewDispatches(a.id)}
                  >
                    View Dispatches
                  </button>

                  {selectedAccident === a.id && (
                    <div className="dispatch-panel">
                      {dispatches.length === 0 ? (
                        <p style={{ fontSize: '0.9rem', color: '#888' }}>No dispatches sent yet.</p>
                      ) : (
                        dispatches.map((d) => (
                          <div key={d.id} className={`dispatch-row ${d.status}`}>
                            <strong>{d.type === 'emergency_responder' ? 'Ambulance' : d.type}</strong>
                            {' — '}
                            {d.responder?.organization || d.responder?.name}
                            <span
                              className="notif-status-badge"
                              style={{
                                marginLeft: 8,
                                background:
                                  d.status === 'accepted' ? '#4caf50' :
                                  d.status === 'rejected' ? '#f44336' :
                                  d.status === 'auto_declined' ? '#9e9e9e' : '#ff9800',
                              }}
                            >
                              {d.status.replace('_', ' ')}
                            </span>
                            {d.distance_km && <span style={{ marginLeft: 8, fontSize: '0.85rem' }}>({d.distance_km} km)</span>}
                            {d.response_message && (
                              <p style={{ fontSize: '0.85rem', color: '#555', margin: '4px 0 0' }}>
                                &quot;{d.response_message}&quot;
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ════════════ USER MANAGEMENT TAB ════════════ */}
      {tab === 'users' && (
        <div className="user-mgmt">
          <div className="user-mgmt-header">
            <input
              type="text"
              placeholder="Search users by name, email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="user-search"
            />
            <button className="add-user-btn" onClick={openAddForm}>+ Add User</button>
          </div>

          {/* Add / Edit form */}
          {showForm && (
            <div className="user-form-card">
              <div className="user-form-title">
                {editingUser ? 'Edit User' : 'Add New User'}
                <button type="button" className="close-form-btn" onClick={resetForm}>×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="two-col">
                  <div className="field-group">
                    <label>Name</label>
                    <input name="name" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="field-group">
                    <label>Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} required />
                  </div>
                </div>
                <div className="two-col">
                  <div className="field-group">
                    <label>{editingUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                    <input name="password" type="password" value={form.password} onChange={handleChange}
                      {...(!editingUser && { required: true })} placeholder={editingUser ? 'Unchanged' : ''} />
                  </div>
                  <div className="field-group">
                    <label>Phone</label>
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="Optional" />
                  </div>
                </div>
                <div className="two-col">
                  <div className="field-group">
                    <label>Role</label>
                    <select name="role" value={form.role} onChange={handleChange}>
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Organization</label>
                    <input name="organization" value={form.organization} onChange={handleChange} placeholder="Optional" />
                  </div>
                </div>
                <div className="two-col">
                  <div className="field-group">
                    <label>Badge Number</label>
                    <input name="badge_number" value={form.badge_number} onChange={handleChange} placeholder="Optional" />
                  </div>
                  <div className="field-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                    <input type="checkbox" name="is_verified" checked={form.is_verified} onChange={handleChange}
                      style={{ width: 'auto', margin: 0 }} />
                    <label style={{ margin: 0, textTransform: 'none', letterSpacing: 0, fontSize: '0.9rem' }}>Verified</label>
                  </div>
                </div>
                <div className="two-col">
                  <div className="field-group">
                    <label>Latitude</label>
                    <input name="latitude" type="number" step="any" value={form.latitude} onChange={handleChange} placeholder="Optional" />
                  </div>
                  <div className="field-group">
                    <label>Longitude</label>
                    <input name="longitude" type="number" step="any" value={form.longitude} onChange={handleChange} placeholder="Optional" />
                  </div>
                </div>
                {userError && <p className="error">{userError}</p>}
                {userSuccess && <p className="success-msg">{userSuccess}</p>}
                <button type="submit">{editingUser ? 'Save Changes' : 'Create User'}</button>
              </form>
            </div>
          )}

          {/* User table */}
          <div className="user-table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Organization</th>
                  <th>Verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>No users found</td></tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td><strong>{u.name}</strong></td>
                      <td>{u.email}</td>
                      <td><span className={`role-chip role-${u.role}`}>{u.role.replace('_', ' ')}</span></td>
                      <td>{u.organization || '—'}</td>
                      <td>{u.is_verified ? '✅' : '❌'}</td>
                      <td>
                        <button className="edit-btn" onClick={() => openEditForm(u)}>Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
