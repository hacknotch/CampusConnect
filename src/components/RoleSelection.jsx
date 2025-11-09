import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelection.css';

const RoleSelection = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    // Store the selected role in localStorage for now
    localStorage.setItem('selectedRole', role);
    navigate('/login');
  };

  return (
    <div className="role-selection-container">
      <div className="role-selection-wrapper">
        <h1 className="main-title">Welcome to the Placement Portal</h1>
        
        <div className="role-options">
          <div className="role-card">
            <div className="role-icon-container">
              <div className="role-icon">🎓</div>
            </div>
            <h3 className="role-title">Student</h3>
            <p className="role-description">Access job opportunities, apply for positions, and track your applications.</p>
            <button 
              className="role-btn"
              onClick={() => handleRoleSelect('student')}
            >
              Login
            </button>
          </div>

          <div className="role-card">
            <div className="role-icon-container">
              <div className="role-icon">💼</div>
            </div>
            <h3 className="role-title">TPO/Admin</h3>
            <p className="role-description">Manage job postings, review applications, and coordinate placements.</p>
            <button 
              className="role-btn"
              onClick={() => handleRoleSelect('manager')}
            >
              Login
            </button>
          </div>

          <div className="role-card">
            <div className="role-icon-container">
              <div className="role-icon">👥</div>
            </div>
            <h3 className="role-title">Head of Department</h3>
            <p className="role-description">Oversee placements, approve policies, and monitor student progress.</p>
            <button 
              className="role-btn"
              onClick={() => handleRoleSelect('hod')}
            >
              Login
            </button>
          </div>
        </div>

        <div className="footer">
          <p>New to the platform? Contact your administrator for account setup.</p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
