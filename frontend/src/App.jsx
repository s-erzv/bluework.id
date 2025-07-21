// src/App.jsx
import React, { useState, useEffect } from 'react';
// Remove BrowserRouter import here if it was present
import { Routes, Route, useNavigate } from 'react-router-dom'; // Keep Routes, Route, useNavigate
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import ApplicationFormPage from './pages/ApplicationFormPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import { createClient } from '@supabase/supabase-js';
import AddJobPage from './pages/AddJobPage';
//import ViewApplicantsPage from './pages/ViewApplicantsPage';


// Supabase client initialization (for auth state monitoring)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [initialAppliedPosition, setInitialAppliedPosition] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // useNavigate() will now work correctly because App is wrapped by <Router> in index.jsx
  const navigate = useNavigate();

  // Monitor Supabase Auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
      if (!session && window.location.pathname === '/admin-dashboard') {
        navigate('/admin'); // Or your admin login path
      }
    });

    const checkInitialAuth = async () => {
      const { data: { user } = {} } = await supabase.auth.getUser();
      setCurrentUser(user || null);
    };
    checkInitialAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [navigate]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    navigate('/admin-dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/admin'); // Or your admin login path
  };

  return (
    // NO <Router> component needed here anymore!
    <>
      <Navbar /> {/* Navbar is now inside the Router context automatically */}
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/application-form" element={<ApplicationFormPage initialAppliedPosition={initialAppliedPosition} />} />
          <Route path="/admin" element={<AdminLoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/admin-dashboard" element={<AdminDashboardPage currentUser={currentUser} onLogout={handleLogout} />} />
          <Route path="/admin/add-job" element={<AddJobPage currentUser={currentUser} />} />
          
        </Routes>
      </main>
    </>
  );
}

export default App;