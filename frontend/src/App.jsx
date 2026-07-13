import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { getCurrentPerson, clearCurrentPerson } from './api';
import Navbar from './components/Navbar';
import Landing from './components/Landing';
import Register from './components/Register';
import AddConnection from './components/AddConnection';
import MyConnections from './components/MyConnections';
import Search from './components/Search';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = getCurrentPerson();
    if (user) setCurrentUser(user);
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    navigate('/search');
  };

  const handleLogout = () => {
    clearCurrentPerson();
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Landing currentUser={currentUser} onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onRegister={handleLogin} />} />
          <Route
            path="/connections"
            element={<MyConnections currentUser={currentUser} />}
          />
          <Route
            path="/connect"
            element={<AddConnection currentUser={currentUser} />}
          />
          <Route
            path="/search"
            element={<Search currentUser={currentUser} />}
          />
        </Routes>
      </main>
    </div>
  );
}
