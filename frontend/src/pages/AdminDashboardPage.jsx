import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase client initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function AdminDashboardPage({ currentUser, onNavigate, onLogout }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated (simple check, full auth flow would be more robust)
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // If not authenticated, redirect to login
        onNavigate('adminLogin');
        return;
      }
      // If authenticated, fetch data
      fetchApplicants();
    };

    if (!currentUser) { // Only check if currentUser is not already set
      checkAuthAndFetch();
    } else {
      fetchApplicants(); // If currentUser is already set, just fetch
    }
  }, [currentUser, onNavigate]);

  const fetchApplicants = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Error: Konfigurasi Supabase belum lengkap.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch data from the 'applications' table
      // RLS policy 'applications_read_authenticated' allows authenticated users to read
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('applied_at', { ascending: false }); // Order by application date, newest first

      if (error) {
        console.error('Error fetching applicants:', error.message);
        throw error;
      }
      setApplicants(data);
    } catch (err) {
      setError(`Gagal memuat daftar pelamar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onLogout(); // Clear user state in parent
      onNavigate('adminLogin'); // Redirect to login page
    } catch (err) {
      console.error('Logout error:', err.message);
      setError(`Gagal logout: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 pb-8 bg-light-bg-secondary dark:bg-dark-bg-secondary transition-colors duration-300">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl bg-light-bg-primary dark:bg-dark-bg-secondary shadow-lg rounded-xl p-6 mt-8 animate-fade-in">
        <div className="flex justify-between items-center mb-6 border-b dark:border-dark-border pb-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Dashboard Admin
          </h2>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging Out...' : 'Logout'}
          </button>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-lg bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100 text-center shadow-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-blue-primary dark:text-blue-accent text-lg">Memuat data pelamar...</div>
        ) : applicants.length === 0 ? (
          <div className="text-center text-light-text-secondary dark:text-dark-text-secondary text-lg">
            Belum ada pelamar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-light-bg-primary dark:bg-dark-bg-primary rounded-lg shadow-md">
              <thead className="bg-light-bg-secondary dark:bg-dark-bg-secondary">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider rounded-tl-lg">Nama Lengkap</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Posisi Dilamar</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">No HP</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Kota Domisili</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Diunggah Pada</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider rounded-tr-lg">Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {applicants.map((applicant) => (
                  <tr key={applicant.id} className="hover:bg-light-bg-secondary dark:hover:bg-dark-bg-secondary transition-colors duration-200">
                    <td className="py-3 px-4 whitespace-nowrap text-light-text-primary dark:text-dark-text-primary">{applicant.full_name}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-light-text-primary dark:text-dark-text-primary">{applicant.applied_position}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-blue-darker dark:text-blue-accent"><a href={`mailto:${applicant.email}`}>{applicant.email}</a></td>
                    <td className="py-3 px-4 whitespace-nowrap text-light-text-primary dark:text-dark-text-primary">{applicant.phone_number}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-light-text-primary dark:text-dark-text-primary">{applicant.domicile_city}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-light-text-secondary dark:text-dark-text-secondary text-sm">
                      {new Date(applicant.applied_at).toLocaleDateString('id-ID', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {applicant.photo_url && (
                        <a href={applicant.photo_url} target="_blank" rel="noopener noreferrer" className="text-blue-primary hover:underline mr-2">Foto</a>
                      )}
                      {applicant.cv_url && (
                        <a href={applicant.cv_url} target="_blank" rel="noopener noreferrer" className="text-blue-primary hover:underline">CV</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer className="w-full text-center text-light-text-secondary dark:text-dark-text-secondary text-sm mt-12">
        &copy; 2025 BlueWork.ID. All rights reserved.
      </footer>
    </div>
  );
}

export default AdminDashboardPage;
