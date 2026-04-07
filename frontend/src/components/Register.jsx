import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('citizen');
  const [organization, setOrganization] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
      },
      () => setError('Unable to get location')
    );
  };

  const isResponder = ['emergency_responder', 'police', 'hospital'].includes(role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name, email, password, phone, role,
        organization: isResponder ? organization : null,
        badge_number: isResponder ? badgeNumber : null,
        latitude: isResponder && latitude ? parseFloat(latitude) : null,
        longitude: isResponder && longitude ? parseFloat(longitude) : null,
      };
      await axios.post('http://localhost:8000/auth/register', payload);
      navigate('/login');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(', '));
      } else {
        setError(detail || 'Registration failed');
      }
    }
  };

  return (
    <div className="auth-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="citizen">Citizen</option>
          <option value="admin">Admin</option>
          <option value="emergency_responder">Ambulance / Emergency Responder</option>
          <option value="police">Police</option>
          <option value="hospital">Hospital</option>
        </select>
        {isResponder && (
          <>
            <input type="text" placeholder="Organization / Station Name" value={organization} onChange={(e) => setOrganization(e.target.value)} required />
            {(role === 'police' || role === 'emergency_responder') && (
              <input type="text" placeholder="Badge Number" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} required />
            )}
            <p style={{ fontSize: '0.85rem', color: '#666', margin: '4px 0' }}>
              Station/base location (used to receive nearby accident alerts):
            </p>
            <button type="button" className="secondary" onClick={useMyLocation}>
              Use My Location
            </button>
            <div className="coords-row">
              <input type="text" placeholder="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
              <input type="text" placeholder="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
            </div>
          </>
        )}
        <button type="submit">Register</button>
        {error && <p className="error">{error}</p>}
      </form>
      <p>Already have an account? <a href="/login">Login</a></p>
    </div>
  );
};

export default Register;