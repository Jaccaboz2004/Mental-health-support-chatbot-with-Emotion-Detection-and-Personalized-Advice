import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ChatPage from "./pages/chatpage"; // Note: matches your lowercase filename
import XAIDashboard from "./pages/XAIDashboard";
import CBTJournal from "./pages/CBTJournal";
import LoginPage from "./pages/LoginPage";
import HistoryPage from "./pages/HistoryPage";
import MusicTherapy from "./pages/MusicTherapy";
import BreathingGuide from "./pages/BreathingGuide";
import DailyTasks from "./pages/DailyTasks";
import Journal from "./pages/Journal";
import FeedbackPage from "./pages/FeedbackPage";
import NotificationBell from "./components/NotificationBell";
import "./App.css";
import axios from "axios";

// Add a request interceptor to inject the JWT token into all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.body.classList.add('dark-mode');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
    }
  };

  return (
    <div className="App">
      <button 
        onClick={toggleDarkMode} 
        className="theme-toggle-btn"
        aria-label="Toggle Dark Mode"
      >
        {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>
      <BrowserRouter>
        <NotificationBell />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/xai" element={<XAIDashboard />} />
          <Route path="/cbt" element={<CBTJournal />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/music" element={<MusicTherapy />} />
          <Route path="/breathing" element={<BreathingGuide />} />
          <Route path="/tasks" element={<DailyTasks />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/feedback" element={<FeedbackPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;