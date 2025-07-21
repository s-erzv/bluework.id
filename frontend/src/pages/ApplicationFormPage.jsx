import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useLocation, useNavigate } from 'react-router-dom';
// import { useTheme } from '../contexts/ThemeContext'; // Assuming useTheme is not directly used in this component's rendering logic

// Inisialisasi client Supabase khusus untuk unggahan publik/anonim.
// Ini penting untuk memastikan bahwa unggahan dari formulir ini TIDAK menggunakan
// sesi pengguna yang terautentikasi (misalnya, jika admin sedang login di tab lain).
const publicSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,     // Jangan menyimpan sesi pengguna di sini
      autoRefreshToken: false,   // Jangan mencoba me-refresh token
      detectSessionInUrl: false  // Jangan deteksi sesi dari URL
    }
  }
);

function ApplicationFormPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialAppliedPosition = location.state?.initialAppliedPosition || '';

  const [formData, setFormData] = useState({
    fullName: '',
    nickName: '',
    address: '',
    dob: '',
    age: '',
    phoneNumber: '',
    email: '',
    ktpNumber: '',
    lastEducation: '',
    appliedPosition: initialAppliedPosition,
    lastWorkExperience: '',
    lastSalary: '',
    expectedSalary: '',
    domicileCity: '',
    readyToRelocate: false,
    photoFile: null,
    cvFile: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, appliedPosition: initialAppliedPosition }));
  }, [initialAppliedPosition]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else if (type === 'file') {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    if (name === 'dob' && value) {
      const birthDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setFormData((prev) => ({ ...prev, age: age.toString() }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsSuccess(false);

    // Menggunakan publicSupabase di sini
    // Periksa apakah URL dan kunci Supabase tersedia di instance publicSupabase
    if (!publicSupabase.supabaseUrl || !publicSupabase.supabaseKey) {
      setMessage('Error: Konfigurasi Supabase belum lengkap. Tidak dapat mengirim aplikasi.');
      setLoading(false);
      return;
    }

    try {
      if (formData.photoFile && formData.photoFile.size > 500 * 1024) {
        throw new Error('Ukuran foto melebihi 500KB.');
      }
      if (formData.cvFile && formData.cvFile.size > 1 * 1024 * 1024) {
        throw new Error('Ukuran CV melebihi 1MB.');
      }

      let photoUrl = '';
      let cvUrl = '';

      if (formData.photoFile) {
        const photoFileName = `${Date.now()}-${formData.photoFile.name}`;
        // Menggunakan publicSupabase untuk unggah foto
        const { data: photoUploadData, error: photoUploadError } = await publicSupabase.storage
          .from('applicant-documents')
          .upload(`photos/${photoFileName}`, formData.photoFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (photoUploadError) throw photoUploadError;
        // Menggunakan publicSupabase untuk mendapatkan URL publik
        photoUrl = publicSupabase.storage.from('applicant-documents').getPublicUrl(`photos/${photoFileName}`).data.publicUrl;
      }

      if (formData.cvFile) {
        const cvFileName = `${Date.now()}-${formData.cvFile.name}`;
        // Menggunakan publicSupabase untuk unggah CV
        const { data: cvUploadData, error: cvUploadError } = await publicSupabase.storage
          .from('applicant-documents')
          .upload(`cvs/${cvFileName}`, formData.cvFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (cvUploadError) throw cvUploadError;
        // Menggunakan publicSupabase untuk mendapatkan URL publik
        cvUrl = publicSupabase.storage.from('applicant-documents').getPublicUrl(`cvs/${cvFileName}`).data.publicUrl;
      }

      // Kirim data aplikasi ke database
      // Menggunakan publicSupabase untuk insert data
      const { data, error } = await publicSupabase.from('applications').insert([
        {
          full_name: formData.fullName,
          nick_name: formData.nickName,
          address: formData.address,
          date_of_birth: formData.dob,
          age: parseInt(formData.age),
          phone_number: formData.phoneNumber,
          email: formData.email,
          ktp_number: formData.ktpNumber,
          last_education: formData.lastEducation,
          applied_position: formData.appliedPosition,
          last_work_experience: formData.lastWorkExperience,
          last_salary: formData.lastSalary ? parseFloat(formData.lastSalary) : null,
          expected_salary: parseFloat(formData.expectedSalary),
          domicile_city: formData.domicileCity,
          ready_to_relocate: formData.readyToRelocate,
          photo_url: photoUrl,
          cv_url: cvUrl,
          applied_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setMessage('Aplikasi berhasil dikirim! Anda akan segera diarahkan kembali ke halaman utama.');
      setIsSuccess(true);
      // Reset form data
      setFormData({
        fullName: '', nickName: '', address: '', dob: '', age: '', phoneNumber: '', email: '',
        ktpNumber: '', lastEducation: '', appliedPosition: initialAppliedPosition, // Keep initial applied position
        lastWorkExperience: '', lastSalary: '', expectedSalary: '', domicileCity: '', readyToRelocate: false,
        photoFile: null, cvFile: null,
      });

      // Clear file inputs manually as setting state to null doesn't clear the input value
      const photoInput = document.getElementById('photoFile');
      if (photoInput) photoInput.value = '';
      const cvInput = document.getElementById('cvFile');
      if (cvInput) cvInput.value = '';

      setTimeout(() => navigate('/'), 3000); // Redirect after 3 seconds

    } catch (error) {
      console.error('Error submitting application:', error);
      setMessage(`Gagal mengirim aplikasi: ${error.message}`);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-6 pb-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-black transition-colors duration-300">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl bg-white dark:bg-dark-bg-secondary shadow-xl rounded-2xl p-8 mt-8 md:mt-12 animate-fade-in-up">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
          Formulir Aplikasi Pekerjaan
          {initialAppliedPosition && (
            <span className="block text-blue-600 dark:text-blue-400 text-xl font-semibold mt-2">
              (Untuk Posisi: {initialAppliedPosition})
            </span>
          )}
        </h2>
        {message && (
          <div className={`p-4 mb-6 rounded-lg text-center font-medium ${isSuccess ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              />
            </div>
            <div>
              <label htmlFor="nickName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Panggilan</label>
              <input
                type="text"
                id="nickName"
                name="nickName"
                value={formData.nickName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Alamat Rumah</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                rows="3"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              ></textarea>
            </div>
            <div>
              <label htmlFor="dob" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              />
            </div>
            <div>
              <label htmlFor="age" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Usia</label>
              <input
                type="text"
                id="age"
                name="age"
                value={formData.age}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed text-base"
              />
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nomor HP</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              />
            </div>
            <div>
              <label htmlFor="ktpNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nomor KTP</label>
              <input
                type="text"
                id="ktpNumber"
                name="ktpNumber"
                value={formData.ktpNumber}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              />
            </div>
            <div>
              <label htmlFor="lastEducation" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pendidikan Terakhir</label>
              <select
                id="lastEducation"
                name="lastEducation"
                value={formData.lastEducation}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              >
                <option value="">Pilih Pendidikan</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
                <option value="D1">D1</option>
                <option value="D3">D3</option>
                <option value="S1">S1</option>
              </select>
            </div>
            <div>
              <label htmlFor="appliedPosition" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Posisi yang Dilamar</label>
              <input
                type="text"
                id="appliedPosition"
                name="appliedPosition"
                value={formData.appliedPosition}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="lastWorkExperience" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">5 Pengalaman Kerja Terakhir</label>
              <textarea
                id="lastWorkExperience"
                name="lastWorkExperience"
                value={formData.lastWorkExperience}
                onChange={handleChange}
                required
                rows="4"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              ></textarea>
            </div>
            <div>
              <label htmlFor="lastSalary" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Gaji Terakhir (Opsional)</label>
              <input
                type="number"
                id="lastSalary"
                name="lastSalary"
                value={formData.lastSalary}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              />
            </div>
            <div>
              <label htmlFor="expectedSalary" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Gaji Diharapkan</label>
              <input
                type="number"
                id="expectedSalary"
                name="expectedSalary"
                value={formData.expectedSalary}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              />
            </div>
            <div>
              <label htmlFor="domicileCity" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Kota Domisili</label>
              <input
                type="text"
                id="domicileCity"
                name="domicileCity"
                value={formData.domicileCity}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
              />
            </div>
            <div className="md:col-span-2 flex items-center">
              <input
                type="checkbox"
                id="readyToRelocate"
                name="readyToRelocate"
                checked={formData.readyToRelocate}
                onChange={handleChange}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="readyToRelocate" className="ml-2 block text-base font-medium text-gray-700 dark:text-gray-300">Siap ditempatkan di kota mana saja</label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label htmlFor="photoFile" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Upload Foto (maks. 500KB, JPG/PNG)</label>
              <input
                type="file"
                id="photoFile"
                name="photoFile"
                accept=".jpg,.jpeg,.png"
                onChange={handleChange}
                required
                className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-base file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all duration-300 cursor-pointer"
              />
              {formData.photoFile && formData.photoFile.size > 500 * 1024 && (
                <p className="text-red-500 text-xs mt-1">Ukuran foto melebihi 500KB.</p>
              )}
            </div>
            <div>
              <label htmlFor="cvFile" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Upload CV (maks. 1MB, PDF)</label>
              <input
                type="file"
                id="cvFile"
                name="cvFile"
                accept=".pdf"
                onChange={handleChange}
                required
                className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-base file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all duration-300 cursor-pointer"
              />
              {formData.cvFile && formData.cvFile.size > 1 * 1024 * 1024 && (
                <p className="text-red-500 text-xs mt-1">Ukuran CV melebihi 1MB.</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg tracking-wide transform hover:scale-105"
          >
            {loading ? 'Mengirim Aplikasi...' : 'Kirim Aplikasi'}
          </button>
        </form>
      </main>

      <footer className="w-full text-center text-gray-600 dark:text-gray-400 text-sm mt-12">
        &copy; 2025 BlueWork.ID. All rights reserved.
      </footer>
    </div>
  );
}

export default ApplicationFormPage;