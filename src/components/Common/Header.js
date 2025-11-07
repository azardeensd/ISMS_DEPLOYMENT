import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Header.module.css';
import { 
  FiUserPlus, 
  FiUsers, 
  FiFileText, 
  FiFile, 
  FiUser, 
  FiChevronDown,
  FiX,
  FiGrid
} from 'react-icons/fi';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showUnauthorizedPopup, setShowUnauthorizedPopup] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [userDepartment, setUserDepartment] = useState('');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setUserRole(userData.role);
      setUserName(userData.username || '');
      setUserDepartment(userData.department || '');
      console.log('User data from localStorage:', userData);
    }
  }, []);

  const getMainHeaderStyle = () => {
    return { backgroundColor: '#1e40af' }; 
  };
  
  const getNavHeaderStyle = () => {
    return { 
      background: 'linear-gradient(to right, #1058d3ff, #1a202c)'
    };
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleUserManagementClick = (e) => {
    // Only Super Admin can access User Management
    if (userRole !== 'Super Admin') {
      e.preventDefault();
      setShowUnauthorizedPopup(true);
    }
  };

  // Function to handle audit navigation with proper type
  const handleAuditNavigation = (type, e) => {
    e.preventDefault();
    
    if (location.pathname === '/audits') {
      const searchParams = new URLSearchParams();
      if (type) {
        searchParams.set('type', type);
      }
      navigate(`/audits?${searchParams.toString()}`, { replace: true });
      // Use a more React-friendly approach instead of reload
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      if (type) {
        navigate(`/audits?type=${type}`);
      } else {
        navigate('/audits');
      }
    }
  };

  return (
    <div className={styles.headerContainer}>
      {/* First Header - Title, User Profile and Logout */}
      <header className={styles.mainHeader} style={getMainHeaderStyle()}>
        <h1 className={styles.headerTitle}><strong>ISMS AUDIT REPORTS</strong></h1>
        <div className={styles.rightNav}>
          <div className={styles.userInfo}>
            {userName && (
              <span className={styles.userName}>Welcome, {userName}</span>
            )}
            {userDepartment && (
              <span className={styles.userDepartment}>Dept: {userDepartment}</span>
            )}
            <span className={styles.userRole}>Role: {userRole}</span>
          </div>
          <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
        </div>
      </header>
      
      <header className={styles.navHeader} style={getNavHeaderStyle()}>
        <nav className={styles.leftNav}>
          <ul className={styles.navLinks}>
            <li className={styles.auditDropdown}>
              <a href="/audits">Audits <FiChevronDown className={styles.chevronIcon} /></a>
              <div className={styles.dropdownContent}>
                <a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
                  <FiGrid className={styles.dropdownIcon} /> Dashboard
                </a>
                <a 
                  href="/audits?type=internal" 
                  onClick={(e) => handleAuditNavigation('internal', e)}
                >
                  <FiFileText className={styles.dropdownIcon} /> Internal Audits
                </a>
                <a 
                  href="/audits?type=external" 
                  onClick={(e) => handleAuditNavigation('external', e)}
                >
                  <FiFile className={styles.dropdownIcon} /> External Audits
                </a>
              </div>
            </li>
            {userRole === 'Super Admin' && (
              <li>
                <a 
                  href="/userrole" 
                  onClick={handleUserManagementClick}
                >
                  User Management
                </a>
              </li>
            )}
          </ul>
        </nav>
      </header>

      {/* Unauthorized Access Popup */}
      {showUnauthorizedPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContainer}>
            <button className={styles.closeButton} onClick={() => setShowUnauthorizedPopup(false)}>
              <FiX />
            </button>
            <div className={styles.popupContent}>
              <h3>Unauthorized Access</h3>
              <p>Only Super Administrators can access User Management.</p>
              <button 
                className={styles.popupButton} 
                onClick={() => setShowUnauthorizedPopup(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Header.propTypes = {
  user: PropTypes.object
};

export default Header;