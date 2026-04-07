import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8000';

const statusColors = {
  pending: '#ff9800',
  accepted: '#4caf50',
  rejected: '#f44336',
  auto_declined: '#9e9e9e',
};

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/accidents/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReports(response.data);
      } catch (err) {
        console.error('Failed to fetch reports');
      }
    };
    fetchReports();
  }, []);

  const viewDispatches = async (accidentId) => {
    if (expandedId === accidentId) {
      setExpandedId(null);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/notifications/accident/${accidentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDispatches(res.data);
      setExpandedId(accidentId);
    } catch {
      setDispatches([]);
      setExpandedId(accidentId);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>My Reports</h2>
        <button onClick={() => navigate('/report')}>Report New Accident</button>
      </div>
      {reports.length === 0 ? (
        <p>No reports found. Start by submitting a new accident report.</p>
      ) : (
        <ul>
          {reports.map((report) => (
            <li key={report.id}>
              <div className="report-row">
                <div>
                  <strong>{report.location}</strong> &bull; {report.severity.toUpperCase()}
                </div>
                <div className="report-status">{report.status}</div>
              </div>
              <p>{report.description}</p>
              <div className="report-details">
                <span>Vehicle: {report.vehicle_type || 'N/A'}</span>
                <span>Injuries: {report.injuries || 'N/A'}</span>
                <span>Weather: {report.weather_conditions || 'N/A'}</span>
              </div>
              <button
                className="secondary"
                style={{ marginTop: 8, width: 'auto', padding: '6px 14px' }}
                onClick={() => viewDispatches(report.id)}
              >
                {expandedId === report.id ? 'Hide' : 'View'} Dispatch Status
              </button>

              {expandedId === report.id && (
                <div className="dispatch-panel">
                  <h4>Dispatch Status</h4>
                  {dispatches.length === 0 ? (
                    <p style={{ fontSize: '0.9rem', color: '#888' }}>
                      No responders notified yet. Dispatches are sent to nearby stations automatically.
                    </p>
                  ) : (
                    dispatches.map((d) => (
                      <div key={d.id} className={`dispatch-row ${d.status}`}>
                        <strong>
                          {d.type === 'emergency_responder' ? 'Ambulance' : d.type.charAt(0).toUpperCase() + d.type.slice(1)}
                        </strong>
                        {' — '}
                        {d.responder?.organization || d.responder?.name}
                        <span
                          className="notif-status-badge"
                          style={{ marginLeft: 8, background: statusColors[d.status] || '#999' }}
                        >
                          {d.status.replace('_', ' ')}
                        </span>
                        {d.distance_km && (
                          <span style={{ marginLeft: 8, fontSize: '0.85rem' }}>({d.distance_km} km)</span>
                        )}
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
    </div>
  );
};

export default Dashboard;