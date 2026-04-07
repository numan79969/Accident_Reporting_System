import { Link, useNavigate } from 'react-router-dom';

const roleLabels = {
  citizen: 'Citizen',
  admin: 'Admin',
  police: 'Police',
  emergency_responder: 'Ambulance',
  hospital: 'Hospital',
};

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const name = localStorage.getItem('name');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/dashboard" className="nav-brand">
          Accident Reporter
        </Link>
      </div>
      <div className="nav-right">
        {token ? (
          <>
            {role === 'citizen' && (
              <Link to="/report" className="nav-link">Report Accident</Link>
            )}
            <span className="nav-text">{name || 'User'}</span>
            <span className="role-badge">{roleLabels[role] || role}</span>
            <button className="nav-button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-link">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
