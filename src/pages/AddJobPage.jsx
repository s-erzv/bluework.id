import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

// Supabase client initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function AddJobPage({ currentUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '', // Changed from position_name to title
    company: '', // Added as per schema
    location: '',
    type: '', // Added as per schema
    description: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [existingJobs, setExistingJobs] = useState([]); // State to store existing jobs
  const [editingJobId, setEditingJobId] = useState(null); // State to track which job is being edited
  const [existingJobsSearchQuery, setExistingJobsSearchQuery] = useState(''); // New state for search in existing jobs

  // Effect to check authentication and fetch existing jobs
  useEffect(() => {
    if (!currentUser) {
      navigate('/admin'); // Redirect to admin login if not authenticated
    } else {
      fetchExistingJobs();
    }
  }, [currentUser, navigate]);

  const fetchExistingJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingJobs(data);
    } catch (err) {
      console.error('Error fetching existing jobs:', err.message);
      setMessage(`Gagal memuat daftar lowongan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleEditJob = (job) => {
    setEditingJobId(job.id);
    setFormData({
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      description: job.description,
      is_active: job.is_active,
    });
    setMessage(''); // Clear any previous messages
    setIsSuccess(false);
  };

  const handleCancelEdit = () => {
    setEditingJobId(null);
    setFormData({
      title: '',
      company: '',
      location: '',
      type: '',
      description: '',
      is_active: true,
    });
    setMessage('');
    setIsSuccess(false);
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus lowongan ini?')) {
      return;
    }
    setLoading(true);
    setMessage('');
    setIsSuccess(false);
    try {
      const { error } = await supabase
        .from('job_listings')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      setMessage('Lowongan berhasil dihapus!');
      setIsSuccess(true);
      fetchExistingJobs(); // Refresh the list
    } catch (error) {
      console.error('Error deleting job listing:', error);
      setMessage(`Gagal menghapus lowongan: ${error.message}`);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsSuccess(false);

    if (!supabaseUrl || !supabaseAnonKey) {
      setMessage('Error: Konfigurasi Supabase belum lengkap. Tidak dapat menambah/memperbarui lowongan.');
      setLoading(false);
      return;
    }

    try {
      let result;
      if (editingJobId) {
        // Update existing job
        result = await supabase
          .from('job_listings')
          .update({
            title: formData.title,
            company: formData.company,
            location: formData.location,
            type: formData.type,
            description: formData.description,
            is_active: formData.is_active,
            // created_at is not updated
          })
          .eq('id', editingJobId);
      } else {
        // Insert new job listing
        result = await supabase
          .from('job_listings')
          .insert([
            {
              title: formData.title,
              company: formData.company,
              location: formData.location,
              type: formData.type,
              description: formData.description,
              is_active: formData.is_active,
              created_at: new Date().toISOString(),
            },
          ]);
      }

      if (result.error) throw result.error;

      setMessage(editingJobId ? 'Lowongan berhasil diperbarui!' : 'Lowongan pekerjaan berhasil ditambahkan!');
      setIsSuccess(true);
      handleCancelEdit(); // Clear form and exit edit mode
      fetchExistingJobs(); // Refresh the list

    } catch (error) {
      console.error('Error submitting job listing:', error);
      setMessage(`Gagal ${editingJobId ? 'memperbarui' : 'menambahkan'} lowongan: ${error.message}`);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // Filter existing jobs based on search query
  const filteredExistingJobs = useMemo(() => {
    if (!existingJobsSearchQuery) {
      return existingJobs;
    }
    const lowerCaseQuery = existingJobsSearchQuery.toLowerCase();
    return existingJobs.filter(
      (job) =>
        job.title.toLowerCase().includes(lowerCaseQuery) ||
        job.company.toLowerCase().includes(lowerCaseQuery) ||
        job.location.toLowerCase().includes(lowerCaseQuery) ||
        job.type.toLowerCase().includes(lowerCaseQuery) ||
        job.description.toLowerCase().includes(lowerCaseQuery)
    );
  }, [existingJobs, existingJobsSearchQuery]);


  return (
    <div className="min-h-screen pt-16 pb-8 bg-light-bg-secondary dark:bg-dark-bg-secondary transition-colors duration-300">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl bg-light-bg-primary dark:bg-dark-bg-primary shadow-lg rounded-xl p-6 mt-8 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6 border-b dark:border-dark-border pb-2">
          Manajemen Lowongan Pekerjaan
        </h2>

        {message && (
          <div className={`p-4 mb-6 rounded-lg text-center font-medium ${isSuccess ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Existing Job Listings */}
          <div>
            <h3 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">Lowongan Tersedia</h3>
            {/* Search bar for existing jobs */}
            <input
              type="text"
              placeholder="Cari lowongan..."
              value={existingJobsSearchQuery}
              onChange={(e) => setExistingJobsSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 mb-4 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
            />
            {loading && existingJobs.length === 0 ? (
              <div className="text-center text-blue-primary dark:text-blue-accent">Memuat lowongan...</div>
            ) : filteredExistingJobs.length === 0 ? (
              <div className="text-center text-light-text-secondary dark:text-dark-text-secondary">
                {existingJobsSearchQuery ? 'Tidak ada lowongan yang cocok dengan pencarian Anda.' : 'Belum ada lowongan pekerjaan.'}
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2"> {/* Added max-h and overflow-y-auto for scrollbar */}
                {filteredExistingJobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-4 border rounded-lg shadow-sm transition-all duration-300
                               ${editingJobId === job.id ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200 dark:border-gray-700'}
                               bg-white dark:bg-gray-800`}
                  >
                    <h4 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">{job.title}</h4>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {job.company} - {job.location} ({job.type})
                    </p>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                      Status: {job.is_active ? <span className="text-green-600">Aktif</span> : <span className="text-red-600">Tidak Aktif</span>}
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => handleEditJob(job)}
                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Add/Edit Job Form */}
          <div>
            <h3 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
              {editingJobId ? 'Edit Lowongan Pekerjaan' : 'Tambah Lowongan Pekerjaan Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Posisi</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Perusahaan</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Lokasi</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipe Pekerjaan</label>
                <input
                  type="text"
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Deskripsi Pekerjaan</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="5"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
                ></textarea>
              </div>

              {/* Removed Requirements and Salary Range as they are not in your provided schema */}
              {/* If you wish to include these, please add 'requirements TEXT' and 'salary_range TEXT'
                  to your 'job_listings' table schema in Supabase. */}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="is_active" className="ml-2 block text-base font-medium text-gray-700 dark:text-gray-300">Aktif</label>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-grow bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg tracking-wide transform hover:scale-105"
                >
                  {loading ? (editingJobId ? 'Memperbarui...' : 'Menambahkan...') : (editingJobId ? 'Update Lowongan' : 'Tambah Lowongan')}
                </button>
                {editingJobId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={loading}
                    className="px-6 py-3.5 bg-gray-300 text-gray-800 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg tracking-wide transform hover:scale-105"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="w-full text-center text-light-text-secondary dark:text-dark-text-secondary text-sm mt-12">
        &copy; 2025 BlueWork.ID. All rights reserved.
      </footer>
    </div>
  );
}

export default AddJobPage;
