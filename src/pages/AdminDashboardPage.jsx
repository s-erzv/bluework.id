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
  const [downloading, setDownloading] = useState(false); // New state for download loading
  const navigate = useNavigate();

  // Helper function to format work experience for display and PDF export (multiline in one cell)
  const formatWorkExperiencesForDisplay = (experiences) => {
    if (!experiences || experiences.length === 0) return '-';
    // Sort experiences by start_date descending (most recent first)
    const sortedExperiences = [...experiences].sort((a, b) => {
      if (a.is_current_job && !b.is_current_job) return -1;
      if (!a.is_current_job && b.is_current_job) return 1;
      return new Date(b.start_date) - new Date(a.start_date);
    });

    return sortedExperiences.map(exp => {
      const startDate = exp.start_date ? new Date(exp.start_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) : '';
      const endDate = exp.is_current_job ? 'Saat Ini' : (exp.end_date ? new Date(exp.end_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) : '');
      return `${exp.position} di ${exp.company_name} (${startDate} - ${endDate})`;
    }).join('\n'); // Join with newline for display in table cell and PDF
  };

  // Helper function to flatten work experiences into separate columns for XLSX
  // Format: "Pengalaman Kerja X - Posisi", "Pengalaman Kerja X - Perusahaan", "Pengalaman Kerja X - Periode Mulai", "Pengalaman Kerja X - Periode Selesai", "Pengalaman Kerja X - Saat Ini"
  const flattenWorkExperiencesForXLSX = (experiences, maxExperiences = 5) => {
    const flattened = {};
    // Sort experiences by start_date descending (most recent first)
    const sortedExperiences = [...experiences].sort((a, b) => {
      if (a.is_current_job && !b.is_current_job) return -1;
      if (!a.is_current_job && b.is_current_job) return 1;
      return new Date(b.start_date) - new Date(a.start_date);
    });

    for (let i = 0; i < maxExperiences; i++) {
      const exp = sortedExperiences[i];
      const prefix = `Pengalaman Kerja ${i + 1}`; // Prefix for column names
      if (exp) {
        const startDate = exp.start_date ? new Date(exp.start_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) : '';
        const endDate = exp.is_current_job ? 'Saat Ini' : (exp.end_date ? new Date(exp.end_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) : '');
        
        flattened[`${prefix} - Posisi`] = exp.position;
        flattened[`${prefix} - Perusahaan`] = exp.company_name;
        flattened[`${prefix} - Periode Mulai`] = startDate;
        flattened[`${prefix} - Periode Selesai`] = endDate;
        flattened[`${prefix} - Saat Ini`] = exp.is_current_job ? 'Ya' : 'Tidak';
      } else {
        // Fill with '-' if no experience for this slot
        flattened[`${prefix} - Posisi`] = '-';
        flattened[`${prefix} - Perusahaan`] = '-';
        flattened[`${prefix} - Periode Mulai`] = '-';
        flattened[`${prefix} - Periode Selesai`] = '-';
        flattened[`${prefix} - Saat Ini`] = '-';
      }
    }
    return flattened;
  };


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
      // AND also fetch related 'applicant_work_experiences' using a join (or separate query)
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select(`
          *,
          applicant_work_experiences (
            position,
            company_name,
            start_date,
            end_date,
            is_current_job
          )
        `)
        .order('applied_at', { ascending: false });

      if (applicationsError) {
        console.error('Error fetching applicants for display:', applicationsError.message);
        throw applicationsError;
      }

      setApplicants(applicationsData);

    } catch (err) {
      setError(`Gagal memuat daftar pelamar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch ALL job positions from 'job_listings' table
  const fetchJobPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('job_listings')
        .select('title');

      if (error) {
        console.error('Error fetching job positions:', error.message);
        throw error;
      }

      const uniqueJobNames = [...new Set(data.map(job => job.title))];
      setAvailableJobs(['', ...uniqueJobNames]);

    } catch (err) {
      console.error('Failed to load job positions for filter:', err.message);
    }
  };

  // New function to fetch ALL applicants with their work experiences for download
  const fetchAllApplicantsForDownload = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          applicant_work_experiences (
            position,
            company_name,
            start_date,
            end_date,
            is_current_job
          )
        `)
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Error fetching all applicants for download:', error.message);
        throw error;
      }
      return data;
    } catch (err) {
      setError(`Gagal memuat semua data pelamar untuk unduhan: ${err.message}`);
      return null;
    } finally {
      setDownloading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onLogout();
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

    if (selectedJob) {
      currentApplicants = currentApplicants.filter(
        applicant => applicant.applied_position === selectedJob
      );
    }

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      currentApplicants = currentApplicants.filter(
        applicant =>
          applicant.full_name.toLowerCase().includes(lowerCaseQuery) ||
          applicant.email.toLowerCase().includes(lowerCaseQuery) ||
          applicant.domicile_city.toLowerCase().includes(lowerCaseQuery) ||
          applicant.phone_number.toLowerCase().includes(lowerCaseQuery) ||
          // Also search within work experiences
          (applicant.applicant_work_experiences && applicant.applicant_work_experiences.some(exp => 
            exp.position.toLowerCase().includes(lowerCaseQuery) ||
            exp.company_name.toLowerCase().includes(lowerCaseQuery)
          ))
      );
    }

    return currentApplicants;
  }, [applicants, searchQuery, selectedJob]);

  // Function to handle PDF download
   const handleDownloadPdf = async () => {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
      setError('PDF export libraries not loaded. Please check index.html.');
      return;
    }

    const allApplicants = await fetchAllApplicantsForDownload();
    if (!allApplicants) return;

    const doc = new window.jspdf.jsPDF('landscape'); // Use landscape for more columns
    
    // Updated tableColumn for PDF: fewer columns, more relevant data
    // Prioritizing key information for PDF readability
    const tableColumn = [
      "Nama Lengkap",
      "Posisi Dilamar",
      "Email",
      "No HP",
      "Kota Domisili",
      "Siap Relokasi",
      "Pengalaman Kerja", // Single column for all experiences (multiline)
      "Diunggah Pada",
      "Dokumen (Foto & CV)" // Combined Photo & CV URLs for brevity
    ];
    const tableRows = [];

    allApplicants.forEach(applicant => { // Gunakan allApplicants untuk ekspor
      const applicantData = [
        applicant.full_name,
        applicant.applied_position,
        applicant.email,
        applicant.phone_number,
        applicant.domicile_city,
        applicant.ready_to_relocate ? 'Ya' : 'Tidak',
        formatWorkExperiencesForDisplay(applicant.applicant_work_experiences), // Gunakan pengalaman yang diformat untuk PDF
        new Date(applicant.applied_at).toLocaleDateString('id-ID', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        // Combine Photo and CV URLs into one cell for PDF
        `${applicant.photo_url ? 'Foto: ' + applicant.photo_url.substring(0, 30) + '...' : ''}\n${applicant.cv_url ? 'CV: ' + applicant.cv_url.substring(0, 30) + '...' : ''}`.trim() || '-',
      ];
      tableRows.push(applicantData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { 
        fontSize: 6, // Further reduced font size
        cellPadding: 0.8, // Reduced cell padding
        overflow: 'linebreak',
        valign: 'top' // Align text to top in cells
      },
      headStyles: { 
        fillColor: [41, 128, 185], 
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center' // Center header text
      },
      margin: { top: 10, left: 5, right: 5, bottom: 10 }, // Adjusted margins
      columnStyles: {
        // Adjust column widths for better fit in landscape A4
        0: { cellWidth: 28 },  // Nama Lengkap
        1: { cellWidth: 28 },  // Posisi Dilamar
        2: { cellWidth: 35 },  // Email
        3: { cellWidth: 22 },  // No HP
        4: { cellWidth: 22 },  // Kota Domisili
        5: { cellWidth: 18 },  // Siap Relokasi
        6: { cellWidth: 65 },  // Pengalaman Kerja (increased width significantly)
        7: { cellWidth: 25 },  // Diunggah Pada
        8: { cellWidth: 45 },  // Dokumen (increased width for URLs, also truncated)
      },
      didDrawCell: (data) => {
        // Add borders to cells for better readability
        if (data.cell.raw) { // Only draw if cell has content
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'S');
        }
      }
    });

    doc.save('daftar_pelamar_lengkap.pdf');
    setIsDropdownOpen(false);
  };

  // Function to handle XLSX download
  const handleDownloadXlsx = async () => {
    if (typeof window.XLSX === 'undefined') {
      setError('XLSX export library not loaded. Please check index.html.');
      return;
    }

    const allApplicants = await fetchAllApplicantsForDownload();
    if (!allApplicants) return;

    // Prepare data for XLSX, including all main columns and flattened experiences
    const dataToExport = allApplicants.map(applicant => {
      const mainData = {
        'Nama Lengkap': applicant.full_name,
        'Nama Panggilan': applicant.nick_name || '-',
        'Alamat': applicant.address || '-',
        'Tanggal Lahir': applicant.date_of_birth || '-',
        'Usia': applicant.age || '-',
        'Nomor HP': applicant.phone_number,
        'Email': applicant.email,
        'Nomor KTP': applicant.ktp_number || '-',
        'Pendidikan Terakhir': applicant.last_education || '-',
        'Posisi Dilamar': applicant.applied_position,
        'Gaji Terakhir': applicant.last_salary || '-',
        'Gaji Diharapkan': applicant.expected_salary || '-',
        'Kota Domisili': applicant.domicile_city,
        'Siap Relokasi': applicant.ready_to_relocate ? 'Ya' : 'Tidak',
        'Diunggah Pada': new Date(applicant.applied_at).toLocaleDateString('id-ID', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        'URL Foto': applicant.photo_url || '-',
        'URL CV': applicant.cv_url || '-',
      };

      const applicantExperiences = applicant.applicant_work_experiences || [];
      const flattenedExperiences = flattenWorkExperiencesForXLSX(applicantExperiences, 5); // Maksimal 5 pengalaman
      
      return { ...mainData, ...flattenedExperiences };
    });

    const ws = window.XLSX.utils.json_to_sheet(dataToExport);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Pelamar");
    window.XLSX.writeFile(wb, "daftar_pelamar_lengkap.xlsx");
    setIsDropdownOpen(false);
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
            disabled={loading || downloading}
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
              disabled={downloading || loading}
              aria-haspopup="true"
              aria-expanded={isDropdownOpen ? "true" : "false"}
            >
              {downloading ? 'Menyiapkan Unduhan...' : 'Unduh Sebagai'}
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
                    disabled={downloading}
                  >
                    PDF
                  </button>
                  <button
                    onClick={handleDownloadXlsx}
                    className="text-gray-700 dark:text-gray-200 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    role="menuitem"
                    disabled={downloading}
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
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Siap Relokasi</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Pengalaman Kerja</th> {/* Changed to generic 'Pengalaman Kerja' */}
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
                      {applicant.ready_to_relocate ? 'Ya' : 'Tidak'}
                    </td>
                    {/* Displaying ALL work experiences in one cell */}
                    <td className="py-3 px-4 text-light-text-primary dark:text-dark-text-primary text-sm">
                      {applicant.applicant_work_experiences && applicant.applicant_work_experiences.length > 0 ? (
                        <div className="space-y-1">
                          {applicant.applicant_work_experiences.map((exp, expIndex) => (
                            <div key={expIndex}>
                              <p className="font-medium">{exp.position} di {exp.company_name}</p>
                              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                {exp.start_date ? new Date(exp.start_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) : ''} -
                                {exp.is_current_job ? ' Saat Ini' : (exp.end_date ? new Date(exp.end_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) : '')}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
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
