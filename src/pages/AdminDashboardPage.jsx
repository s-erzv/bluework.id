import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

// Supabase client initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function AdminDashboardPage({ currentUser, onLogout }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // State for search bar
  const [selectedJob, setSelectedJob] = useState(''); // State for job filter
  const [availableJobs, setAvailableJobs] = useState([]); // State for unique job positions from job_listings
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for download dropdown
  const navigate = useNavigate();

  // Effect to check authentication and fetch data
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      // If currentUser is null (not logged in), redirect to admin login
      if (!currentUser) {
        navigate('/admin'); // Redirect to the admin login path
        return;
      }
      // If authenticated, fetch data
      fetchApplicants();
      fetchJobPositions(); // Fetch job positions independently
    };

    checkAuthAndFetch();
  }, [currentUser, navigate]); // Depend on currentUser and navigate

  const fetchApplicants = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Error: Konfigurasi Supabase belum lengkap.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch data from the 'applications' table
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

  // New function to fetch job positions from 'job_listings' table
  const fetchJobPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('job_listings') // Assuming your job listings table is named 'job_listings'
        .select('title'); // Select 'title' instead of 'position_name' as per schema

      if (error) {
        console.error('Error fetching job positions:', error.message);
        throw error;
      }

      // Extract unique position names and add an empty option
      const uniqueJobNames = [...new Set(data.map(job => job.title))]; // Use job.title
      setAvailableJobs(['', ...uniqueJobNames]); // Add an empty option for "All Positions"

    } catch (err) {
      console.error('Failed to load job positions for filter:', err.message);
      // Optionally set an error state specific to job positions if needed
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onLogout(); // Call the onLogout prop from App.jsx to clear user state
    } catch (err) {
      console.error('Logout error:', err.message);
      setError(`Gagal logout: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter applicants based on search query and selected job
  const filteredApplicants = useMemo(() => {
    let currentApplicants = applicants;

    // Apply job filter first
    if (selectedJob) {
      currentApplicants = currentApplicants.filter(
        applicant => applicant.applied_position === selectedJob
      );
    }

    // Apply search query filter
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      currentApplicants = currentApplicants.filter(
        applicant =>
          applicant.full_name.toLowerCase().includes(lowerCaseQuery) ||
          applicant.email.toLowerCase().includes(lowerCaseQuery) ||
          applicant.domicile_city.toLowerCase().includes(lowerCaseQuery) ||
          applicant.phone_number.toLowerCase().includes(lowerCaseQuery)
      );
    }

    return currentApplicants;
  }, [applicants, searchQuery, selectedJob]);

  // Function to handle PDF download
  const handleDownloadPdf = () => {
    console.log('Attempting PDF download...');
    console.log('window.jspdf:', typeof window.jspdf); // Check for window.jspdf (lowercase)

    // Corrected access: jsPDF constructor is typically within window.jspdf
    // And autoTable is a method on the jsPDF instance, not a global plugin property.
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
      setError('PDF export libraries not loaded. Please check index.html.');
      return;
    }

    const doc = new window.jspdf.jsPDF(); // Correctly instantiate jsPDF
    // Added 'Siap Relokasi' to tableColumn
    const tableColumn = ["Nama Lengkap", "Posisi Dilamar", "Email", "No HP", "Kota Domisili", "Siap Relokasi", "Diunggah Pada"];
    const tableRows = [];

    filteredApplicants.forEach(applicant => {
      const applicantData = [
        applicant.full_name,
        applicant.applied_position,
        applicant.email,
        applicant.phone_number,
        applicant.domicile_city,
        applicant.ready_to_relocate ? 'Ya' : 'Tidak', // Format boolean to 'Ya'/'Tidak'
        new Date(applicant.applied_at).toLocaleDateString('id-ID', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      ];
      tableRows.push(applicantData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { top: 10, left: 10, right: 10, bottom: 10 },
    });

    doc.save('daftar_pelamar.pdf');
    setIsDropdownOpen(false); // Close dropdown after action
  };

  // Function to handle XLSX download
  const handleDownloadXlsx = () => {
    // Ensure xlsx library is loaded
    if (typeof window.XLSX === 'undefined') {
      setError('XLSX export library not loaded. Please check index.html.');
      return;
    }

    const dataToExport = filteredApplicants.map(applicant => ({
      'Nama Lengkap': applicant.full_name,
      'Posisi Dilamar': applicant.applied_position,
      'Email': applicant.email,
      'No HP': applicant.phone_number,
      'Kota Domisili': applicant.domicile_city,
      'Siap Relokasi': applicant.ready_to_relocate ? 'Ya' : 'Tidak', // Format boolean to 'Ya'/'Tidak'
      'Diunggah Pada': new Date(applicant.applied_at).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }),
      'URL Foto': applicant.photo_url,
      'URL CV': applicant.cv_url,
    }));

    const ws = window.XLSX.utils.json_to_sheet(dataToExport);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Pelamar");
    window.XLSX.writeFile(wb, "daftar_pelamar.xlsx");
    setIsDropdownOpen(false); // Close dropdown after action
  };

  return (
    <div className="min-h-screen pt-16 pb-8 bg-light-bg-secondary dark:bg-dark-bg-secondary transition-colors duration-300">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl bg-light-bg-primary dark:bg-dark-bg-primary shadow-lg rounded-xl p-6 mt-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b dark:border-dark-border pb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-4 md:mb-0">
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

        {/* Search, Filter, and Download Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center">
          <input
            type="text"
            placeholder="Cari pelamar (nama, email, kota, no. HP)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300"
          />
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300"
          >
            <option value="">Semua Posisi</option>
            {availableJobs.map(job => (
              <option key={job} value={job}>
                {job}
              </option>
            ))}
          </select>

          {/* Download Dropdown Button */}
          <div className="relative inline-block text-left">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex justify-center w-full rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-500 text-base font-bold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={filteredApplicants.length === 0 || loading}
              aria-haspopup="true"
              aria-expanded={isDropdownOpen ? "true" : "false"}
            >
              Unduh Sebagai
              <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div
                className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="menu-button"
              >
                <div className="py-1" role="none">
                  <button
                    onClick={handleDownloadPdf}
                    className="text-gray-700 dark:text-gray-200 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    role="menuitem"
                  >
                    PDF
                  </button>
                  <button
                    onClick={handleDownloadXlsx}
                    className="text-gray-700 dark:text-gray-200 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    role="menuitem"
                  >
                    XLSX
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-blue-primary dark:text-blue-accent text-lg">Memuat data pelamar...</div>
        ) : filteredApplicants.length === 0 ? (
          <div className="text-center text-light-text-secondary dark:text-dark-text-secondary text-lg">
            {searchQuery || selectedJob ? 'Tidak ada pelamar yang cocok dengan filter Anda.' : 'Belum ada pelamar.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className="min-w-full bg-light-bg-primary dark:bg-dark-bg-primary">
              <thead className="bg-light-bg-secondary dark:bg-dark-bg-secondary">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider rounded-tl-lg">Nama Lengkap</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Posisi Dilamar</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">No HP</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Kota Domisili</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Siap Relokasi</th> {/* New column header */}
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider rounded-tr-lg">Diunggah Pada</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {filteredApplicants.map((applicant) => (
                  <tr key={applicant.id} className="hover:bg-light-bg-secondary dark:hover:bg-dark-bg-secondary transition-colors duration-200">
                    <td className="py-3 px-4 whitespace-nowrap text-light-text-primary dark:text-dark-text-primary">{applicant.full_name}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-light-text-primary dark:text-dark-text-primary">{applicant.applied_position}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-blue-darker dark:text-blue-accent"><a href={`mailto:${applicant.email}`}>{applicant.email}</a></td>
                    <td className="py-3 px-4 whitespace-nowrap text-light-text-primary dark:text-dark-text-primary">{applicant.phone_number}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-light-text-primary dark:text-dark-text-primary">{applicant.domicile_city}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-light-text-primary dark:text-dark-text-primary">
                      {applicant.ready_to_relocate ? 'Ya' : 'Tidak'} {/* Display 'Ya' or 'Tidak' */}
                    </td>
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
