import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // Add this import
import Login from './components/Login/Login';
import Dashboard from './Pages/Dashboard/Dashboard';
import Audits from './Pages/Audits/Audits';
import UserRole from './Pages/Userrole/Userrole';
import Supplier from './Pages/Supplier/Supplier';
import RiskAssessment from './Pages/RiskAssessment/RiskManagement';
import './App.css';

function App() {
  return (
    <AuthProvider> {/* Wrap everything with AuthProvider */}
      <Router>
        <div className="app-container">
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/audits" element={<Audits />} />
              <Route path="/userrole" element={<UserRole />} />
              <Route path="/supplier" element={<Supplier />} />
              <Route path="/risk-assessment" element={<RiskAssessment />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;