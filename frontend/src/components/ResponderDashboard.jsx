import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const statusColors = {
  pending: '#ff9800',
  accepted: '#4caf50',
  rejected: '#f44336',
  auto_declined: '#9e9e9e',
};

const ResponderDashboard = () => {
  const [notifications, setNotifications] = useState([]);
  const [respondingId, setRespondingId] = useState(null);
  const [message, setMessage] = useState('');
  const role = localStorage.getItem('role');

  const roleLabel = {
    police: 'Police',
    emergency_responder: 'Ambulance',
    hospital: 'Hospital',
  }[role] || role;

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleRespond = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/notifications/${id}/respond`,
        { status, message: message || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRespondingId(null);
      setMessage('');
      fetchNotifications();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to respond');
    }
  };

  const pending = notifications.filter((n) => n.status === 'pending');
  const history = notifications.filter((n) => n.status !== 'pending');

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>{roleLabel} Dashboard</h2>
        <span className="badge-count">
          {pending.length} pending alert{pending.length !== 1 ? 's' : ''}
        </span>
      </div>

      {pending.length === 0 ? (
        <div className="empty-state">
          <p>No pending alerts. You will be notified when an accident occurs nearby.</p>
        </div>
      ) : (
        <div className="notification-list">
          <h3>Incoming Alerts</h3>
          {pending.map((n) => (
            <div key={n.id} className="notification-card pending">
              <div className="notif-header">
                <span className="notif-severity">{n.title}</span>
                <span className="notif-distance">{n.distance_km} km away</span>
              </div>
              <p className="notif-message">{n.message}</p>
              {n.accident && (
                <div className="notif-details">
                  <span>Location: {n.accident.location}</span>
                  <span>Severity: {n.accident.severity}</span>
                  <span>Injuries: {n.accident.injuries || 'N/A'}</span>
                  <span>Vehicle: {n.accident.vehicle_type || 'N/A'}</span>
                </div>
              )}
              <div className="notif-time">
                Reported: {new Date(n.created_at).toLocaleString()}
              </div>
              {respondingId === n.id ? (
                <div className="respond-form">
                  <textarea
                    placeholder="Optional message (e.g., ETA, unit dispatched)..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <div className="respond-actions">
                    <button className="btn-accept" onClick={() => handleRespond(n.id, 'accepted')}>
                      Confirm Accept
                    </button>
                    <button className="btn-reject" onClick={() => handleRespond(n.id, 'rejected')}>
                      Confirm Reject
                    </button>
                    <button className="secondary" onClick={() => { setRespondingId(null); setMessage(''); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="respond-actions">
                  <button className="btn-accept" onClick={() => setRespondingId(n.id)}>
                    Accept
                  </button>
                  <button className="btn-reject" onClick={() => { setRespondingId(n.id); }}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="notification-list">
          <h3>Response History</h3>
          {history.map((n) => (
            <div key={n.id} className={`notification-card ${n.status}`}>
              <div className="notif-header">
                <span className="notif-severity">{n.title}</span>
                <span
                  className="notif-status-badge"
                  style={{ background: statusColors[n.status] || '#999' }}
                >
                  {n.status.replace('_', ' ')}
                </span>
              </div>
              <p className="notif-message">{n.message}</p>
              {n.response_message && (
                <p className="notif-response">
                  <strong>Response:</strong> {n.response_message}
                </p>
              )}
              {n.accident && (
                <div className="notif-details">
                  <span>Location: {n.accident.location}</span>
                  <span>Status: {n.accident.status}</span>
                </div>
              )}
              <div className="notif-time">
                {n.responded_at
                  ? `Responded: ${new Date(n.responded_at).toLocaleString()}`
                  : `Received: ${new Date(n.created_at).toLocaleString()}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResponderDashboard;
