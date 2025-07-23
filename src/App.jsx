import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'; 
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import ApplicationFormPage from './pages/ApplicationFormPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AddJobPage from './pages/AddJobPage';
import { createClient } from '@supabase/supabase-js';
import { ThemeProvider } from './contexts/ThemeContext';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [initialAppliedPosition, setInitialAppliedPosition] = useState(''); 
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); 

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
      if (!session && location.pathname.startsWith('/admin')) { 
        navigate('/admin');
      }
      if (session && location.pathname === '/admin') { 
        navigate('/admin-dashboard');
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
  }, [navigate, location.pathname]); 

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    navigate('/admin-dashboard');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      navigate('/admin');
    } catch (error) {
      console.error('Logout failed:', error.message);
    }
  };

  const showNavbar = location.pathname !== '/admin';

  return (
    <ThemeProvider>
      {showNavbar && <Navbar />}
      <main className={showNavbar ? "pt-16" : ""}> 
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/application-form" element={<ApplicationFormPage initialAppliedPosition={initialAppliedPosition} />} />
          <Route path="/admin" element={<AdminLoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/admin-dashboard" element={<AdminDashboardPage currentUser={currentUser} onLogout={handleLogout} />} />
          <Route path="/admin/add-job" element={<AddJobPage currentUser={currentUser} />} />
          
          <Route path="*" element={
            <div className="min-h-screen flex flex-col items-center justify-center text-center bg-light-bg-secondary dark:bg-dark-bg-secondary text-light-text-primary dark:text-dark-text-primary">
              <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
              <p className="mt-4">The page you are looking for does not exist.</p>
              <button onClick={() => navigate('/')} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Go to Homepage
              </button>
            </div>
          } />
        </Routes>
      </main>
    </ThemeProvider>
  );
}

export default App;
