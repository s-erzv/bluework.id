import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { MagnifyingGlassIcon, BriefcaseIcon, MapPinIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const useInView = (options) => {
  const [entry, setEntry] = useState(null);
  const observerRef = useRef(null);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([ent]) => {
      setEntry(ent);
    }, options);

    observerRef.current = observer;

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (observerRef.current && elementRef.current) {
        observerRef.current.unobserve(elementRef.current);
      }
    };
  }, [options]);

  return [elementRef, entry];
};

function LandingPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [jobListings, setJobListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredJobListings, setFilteredJobListings] = useState([]);

  const [heroRef, heroEntry] = useInView({ threshold: 0.5 });
  const [jobsRef, jobsEntry] = useInView({ threshold: 0.1 });

  useEffect(() => {
    const fetchJobListings = async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        setError('Error: Supabase configuration incomplete. Check your .env file.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('job_listings')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }
        setJobListings(data);
        setFilteredJobListings(data);
      } catch (err) {
        setError(`Failed to load job listings: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchJobListings();
  }, []);

  useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = jobListings.filter(job =>
      job.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.company.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.location.toLowerCase().includes(lowerCaseSearchTerm) ||
      (job.type && job.type.toLowerCase().includes(lowerCaseSearchTerm))
    );
    setFilteredJobListings(filtered);
  }, [searchTerm, jobListings]);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300
                    ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-dark-bg-primary to-gray-950' : 'bg-light-bg-primary'}`}>

      <section
        ref={heroRef}
        className={`relative flex flex-col items-center justify-center py-24 px-4 sm:px-6 lg:px-8 overflow-hidden
                    ${theme === 'dark' ? 'bg-dark-bg-primary text-dark-text-primary' : 'bg-gradient-to-br from-blue-600 to-blue-800 text-white'} rounded-b-[4rem] md:rounded-b-[6rem]
                    transition-all duration-700 ease-out
                    ${heroEntry?.isIntersecting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}
      >
        <div className="absolute inset-0 opacity-30 dark:opacity-10" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
        <div className="relative z-10 p-4 max-w-3xl mx-auto w-full text-center">
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-extrabold mb-5 leading-tight
                          ${theme === 'dark' ? 'text-blue-accent' : 'text-white'} drop-shadow-lg`}>
            Temukan Pekerjaan Impian Anda
          </h1>
          <p className={`text-lg sm:text-xl mb-8 opacity-95
                          ${theme === 'dark' ? 'text-dark-text-secondary' : 'text-blue-100'}`}>
            Platform sederhana untuk pekerja <strong>BlueWork.ID</strong> mencari kerja atau masuk talent pool nasional.
          </p>
          <div className="relative w-full max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Cari posisi, perusahaan, atau lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full py-3.5 pl-5 pr-14 rounded-full shadow-xl focus:outline-none focus:ring-4
                          ${theme === 'dark' ? 'bg-dark-input-bg text-dark-text-primary placeholder-dark-text-secondary focus:ring-blue-600/50' : 'bg-white text-light-text-primary placeholder-light-text-secondary focus:ring-blue-200/50'}
                          transition-all duration-300 ease-in-out text-lg`}
            />
            <MagnifyingGlassIcon className={`absolute right-5 top-1/2 -translate-y-1/2 h-7 w-7
                                           ${theme === 'dark' ? 'text-blue-accent' : 'text-blue-primary'}`} />
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {error && (
          <div className={`p-4 mb-8 rounded-lg text-center shadow-md text-base
                            ${theme === 'dark' ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-700'}`}>
            {error}
          </div>
        )}

        <section
          ref={jobsRef}
          className={`my-12 transition-all duration-1000 ease-out
                      ${jobsEntry?.isIntersecting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <h2 className={`text-3xl sm:text-4xl font-extrabold mb-8 text-center
                          ${theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
            Lowongan Terbaru
          </h2>
          {loading ? (
            <div className={`text-center text-xl font-medium ${theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
              Memuat lowongan...
            </div>
          ) : filteredJobListings.length === 0 ? (
            <div className={`text-center text-xl font-medium ${theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
              Tidak ada lowongan yang ditemukan. Coba kata kunci lain!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredJobListings.map((job) => (
                <div
                  key={job.id}
                  className={`p-7 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer
                              ${theme === 'dark' ? 'bg-dark-bg-secondary border border-dark-border' : 'bg-light-bg-secondary border border-light-border'}
                              text-left flex flex-col`}
                >
                  <h3 className={`text-2xl font-bold mb-2 leading-tight ${theme === 'dark' ? 'text-blue-accent' : 'text-blue-primary'}`}>
                    {job.title}
                  </h3>
                  <div className={`flex items-center text-sm mb-1 ${theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                    <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                    <p className="font-medium">{job.company}</p>
                  </div>
                  <div className={`flex items-center text-sm mb-3 ${theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    <p>{job.location}</p>
                    {job.type && (
                      <>
                        <span className="mx-2">&bull;</span>
                        <BriefcaseIcon className="h-4 w-4 mr-2" />
                        <p>{job.type}</p>
                      </>
                    )}
                  </div>
                  <p className={`text-base line-clamp-4 mb-5 flex-grow ${theme === 'dark' ? 'text-dark-text-primary' : 'text-light-text-primary'}`}>
                    {job.description}
                  </p>
                  <button
                    onClick={() => navigate('/application-form', { state: { initialAppliedPosition: job.title } })}
                    className="w-full bg-blue-primary hover:bg-blue-darker text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg
                               transition-all duration-300 text-lg tracking-wide mt-auto"
                  >
                    Lamar Sekarang
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className={`w-full py-10 px-4 sm:px-6 lg:px-8 text-sm transition-colors duration-300 border-t mt-16
                          ${theme === 'dark' ? 'bg-dark-bg-primary border-dark-border' : 'bg-light-bg-primary border-light-border'}
                          ${theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-center md:text-left">
          <p>&copy; {new Date().getFullYear()} BlueWork.ID. All rights reserved.</p>
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6 mt-4 md:mt-0">
            <Link to="/admin" className={`hover:text-blue-primary dark:hover:text-blue-accent transition-colors duration-200 text-base font-medium`}>Login Admin</Link>
            <Link to="/privacy-policy" className={`hover:text-blue-primary dark:hover:text-blue-accent transition-colors duration-200 text-base font-medium`}>Privacy Policy</Link>
            <Link to="/terms-of-service" className={`hover:text-blue-primary dark:hover:text-blue-accent transition-colors duration-200 text-base font-medium`}>Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;