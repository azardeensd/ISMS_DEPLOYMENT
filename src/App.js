import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login/Login';
import Dashboard from './Pages/Dashboard/Dashboard';
import Audits from './Pages/Audits/Audits';
import UserRole from './Pages/Userrole/Userrole';
import './App.css';



function App() {
  return (
    <Router>
      <div className="app-container">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/audits" element={<Audits />} />
            <Route path="/userrole" element={<UserRole />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;