import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusCircleIcon, MinusCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'; // Import icons

// Inisialisasi client Supabase khusus untuk unggahan publik/anonim.
const publicSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

function ApplicationFormPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialAppliedPosition = location.state?.initialAppliedPosition || '';

  const initialWorkExperienceEntry = {
    position: '',
    companyName: '',
    startDate: '', // Format: YYYY-MM
    endDate: '',   // Format: YYYY-MM
    isCurrent: false,
  };

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
    workExperience: [{ ...initialWorkExperienceEntry }], // Start with one empty experience
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
  // State untuk mengelola indeks pengalaman kerja yang saat ini diperluas
  // Default: pengalaman pertama/satu-satunya akan diperluas
  const [expandedExperienceIndex, setExpandedExperienceIndex] = useState(0); 

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

  // Handler untuk perubahan input pengalaman kerja
  const handleWorkExperienceChange = (e, index) => {
    const { name, value, type, checked } = e.target;
    const newWorkExperience = [...formData.workExperience];
    if (type === 'checkbox') {
      newWorkExperience[index][name] = checked;
      // Jika "Saat Ini" dicentang, kosongkan endDate
      if (checked) {
        newWorkExperience[index].endDate = '';
      }
    } else {
      newWorkExperience[index][name] = value;
    }
    setFormData({ ...formData, workExperience: newWorkExperience });
  };

  // Fungsi untuk menambah entri pengalaman kerja baru
  const handleAddWorkExperience = () => {
    if (formData.workExperience.length < 5) { // Maksimal 5 pengalaman
      setFormData(prevFormData => ({
        ...prevFormData,
        workExperience: [...prevFormData.workExperience, { ...initialWorkExperienceEntry }],
      }));
      // Otomatis memperluas entri yang baru ditambahkan
      setExpandedExperienceIndex(formData.workExperience.length); 
    } else {
      setMessage('Maksimal 5 pengalaman kerja.');
      setIsSuccess(false);
    }
  };

  // Fungsi untuk menghapus entri pengalaman kerja
  const handleRemoveWorkExperience = (index) => {
    const newWorkExperience = formData.workExperience.filter((_, i) => i !== index);
    setFormData({ ...formData, workExperience: newWorkExperience });
    // Sesuaikan indeks yang diperluas jika yang dihapus adalah yang diperluas
    // atau jika penghapusan memengaruhi indeks yang diperluas
    if (expandedExperienceIndex === index) {
        setExpandedExperienceIndex(null); // Lipat jika yang dihapus adalah yang diperluas
    } else if (expandedExperienceIndex > index) {
        setExpandedExperienceIndex(prev => prev - 1); // Geser indeks jika yang lebih awal dihapus
    }
    // Jika hanya satu entri tersisa, perluas secara otomatis
    if (newWorkExperience.length === 1) {
        setExpandedExperienceIndex(0);
    } else if (newWorkExperience.length === 0) { // Jika tidak ada entri tersisa
        setExpandedExperienceIndex(null);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsSuccess(false);

    if (!publicSupabase.supabaseUrl || !publicSupabase.supabaseKey) {
      setMessage('Error: Konfigurasi Supabase belum lengkap. Tidak dapat mengirim lamaran.');
      setLoading(false);
      return;
    }

    try {
      if (formData.photoFile && formData.photoFile.size > 200 * 1024) {
        throw new Error('Ukuran foto melebihi 200KB.');
      }
      if (formData.cvFile && formData.cvFile.size > 1 * 1024 * 1024) {
        throw new Error('Ukuran CV melebihi 1MB.');
      }

      let photoUrl = '';
      let cvUrl = '';

      if (formData.photoFile) {
        const photoFileName = `${Date.now()}-${formData.photoFile.name}`;
        const { data: photoUploadData, error: photoUploadError } = await publicSupabase.storage
          .from('applicant-documents')
          .upload(`photos/${photoFileName}`, formData.photoFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (photoUploadError) throw photoUploadError;
        photoUrl = publicSupabase.storage.from('applicant-documents').getPublicUrl(`photos/${photoFileName}`).data.publicUrl;
      }

      if (formData.cvFile) {
        const cvFileName = `${Date.now()}-${formData.cvFile.name}`;
        const { data: cvUploadData, error: cvUploadError } = await publicSupabase.storage
          .from('applicant-documents')
          .upload(`cvs/${cvFileName}`, formData.cvFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (cvUploadError) throw cvUploadError;
        cvUrl = publicSupabase.storage.from('applicant-documents').getPublicUrl(`cvs/${cvFileName}`).data.publicUrl;
      }

      // --- START: Perubahan untuk menyimpan data ke tabel 'applications'
      // Hanya sertakan kolom-kolom yang ada di skema tabel 'applications' Anda saat ini
      const { data: insertedApplication, error: applicationInsertError } = await publicSupabase.from('applications').insert([
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
          last_salary: formData.lastSalary ? parseFloat(formData.lastSalary) : null,
          expected_salary: parseFloat(formData.expectedSalary),
          domicile_city: formData.domicileCity,
          ready_to_relocate: formData.readyToRelocate,
          photo_url: photoUrl,
          cv_url: cvUrl,
          applied_at: new Date().toISOString(),
          // Kolom work_experiences_summary TIDAK LAGI DISERTAKAN di sini
          // karena kita akan menyimpan setiap pengalaman di tabel terpisah
        },
      ]).select('id').single(); // Penting: select('id').single() untuk mendapatkan ID aplikasi yang baru dibuat

      if (applicationInsertError) {
        console.error('Error inserting application main data:', applicationInsertError);
        throw applicationInsertError;
      }

      const newApplicationId = insertedApplication.id;

      // --- START: Simpan setiap pengalaman kerja ke tabel 'applicant_work_experiences'
      // Filter pengalaman kerja yang kosong sebelum insert
      const validWorkExperiences = formData.workExperience.filter(exp => 
        exp.position && exp.companyName && exp.startDate
      );

      if (validWorkExperiences.length > 0) {
        const workExperiencesToInsert = validWorkExperiences.map(exp => ({
          application_id: newApplicationId,
          position: exp.position,
          company_name: exp.companyName,
          start_date: exp.startDate ? `${exp.startDate}-01` : null, // Convert YYYY-MM to YYYY-MM-DD
          end_date: exp.endDate ? `${exp.endDate}-01` : null,     // Convert YYYY-MM to YYYY-MM-DD
          is_current_job: exp.isCurrent,
        }));

        const { error: workExpInsertError } = await publicSupabase.from('applicant_work_experiences').insert(workExperiencesToInsert);

        if (workExpInsertError) {
          console.error('Error inserting work experiences:', workExpInsertError);
          // Jika terjadi error di sini, Anda bisa memilih untuk menghapus aplikasi utama juga
          // agar tidak ada data yang tidak konsisten. Contoh:
          await publicSupabase.from('applications').delete().eq('id', newApplicationId); // Rollback main application
          throw workExpInsertError; // Melempar error agar seluruh proses gagal
        }
      }
      // --- END: Simpan setiap pengalaman kerja ke tabel 'applicant_work_experiences'

      setMessage('Lamaran Anda berhasil dikirim! Anda akan segera diarahkan kembali ke halaman utama.');
      setIsSuccess(true);
      // Reset form data
      setFormData({
        fullName: '', nickName: '', address: '', dob: '', age: '', phoneNumber: '', email: '',
        ktpNumber: '', lastEducation: '', appliedPosition: initialAppliedPosition,
        workExperience: [{ ...initialWorkExperienceEntry }], // Reset to one empty experience
        lastSalary: '', expectedSalary: '', domicileCity: '', readyToRelocate: false,
        photoFile: null, cvFile: null,
      });

      // Clear file inputs manually
      const photoInput = document.getElementById('photoFile');
      if (photoInput) photoInput.value = '';
      const cvInput = document.getElementById('cvFile');
      if (cvInput) cvInput.value = '';

      // Reset expanded index
      setExpandedExperienceIndex(0); // Kembali memperluas entri pertama setelah reset form

      setTimeout(() => navigate('/'), 3000);

    } catch (error) {
      console.error('Error submitting application:', error);
      setMessage(`Gagal mengirim lamaran: ${error.message}`);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-6 pb-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-black transition-colors duration-300">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl bg-white dark:bg-dark-bg-secondary shadow-xl rounded-2xl p-8 mt-8 md:mt-12 animate-fade-in-up">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
          Formulir Lamaran Pekerjaan
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
          </div>

          {/* Bagian Pengalaman Kerja */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Pengalaman Kerja</h3>
            {formData.workExperience.map((exp, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                {/* Header for collapsed view */}
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setExpandedExperienceIndex(expandedExperienceIndex === index ? null : index)}
                >
                  <h4 className="text-base font-medium text-gray-700 dark:text-gray-300">
                    {exp.position && exp.companyName ? `${exp.position} di ${exp.companyName}` : `Pengalaman #${index + 1}`}
                  </h4>
                  {expandedExperienceIndex === index ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                </div>

                {/* Collapsible content */}
                {expandedExperienceIndex === index && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label htmlFor={`position-${index}`} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Posisi</label>
                      <input
                        type="text"
                        id={`position-${index}`}
                        name="position"
                        value={exp.position}
                        onChange={(e) => handleWorkExperienceChange(e, index)}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
                      />
                    </div>
                    <div>
                      <label htmlFor={`companyName-${index}`} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Perusahaan</label>
                      <input
                        type="text"
                        id={`companyName-${index}`}
                        name="companyName"
                        value={exp.companyName}
                        onChange={(e) => handleWorkExperienceChange(e, index)}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
                      />
                    </div>
                    <div>
                      <label htmlFor={`startDate-${index}`} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Dari (Bulan-Tahun)</label>
                      <input
                        type="month"
                        id={`startDate-${index}`}
                        name="startDate"
                        value={exp.startDate}
                        onChange={(e) => handleWorkExperienceChange(e, index)}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base"
                      />
                    </div>
                    <div>
                      <label htmlFor={`endDate-${index}`} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Sampai (Bulan-Tahun)</label>
                      <input
                        type="month"
                        id={`endDate-${index}`}
                        name="endDate"
                        value={exp.endDate}
                        onChange={(e) => handleWorkExperienceChange(e, index)}
                        disabled={exp.isCurrent} // Disable if "Saat Ini" is checked
                        required={!exp.isCurrent} // Required if not current
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white transition-all duration-300 text-base disabled:bg-gray-200 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                      />
                      <div className="flex items-center mt-2">
                        <input
                          type="checkbox"
                          id={`isCurrent-${index}`}
                          name="isCurrent"
                          checked={exp.isCurrent}
                          onChange={(e) => handleWorkExperienceChange(e, index)}
                          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor={`isCurrent-${index}`} className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Saat Ini</label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Remove button for experience entry (only if more than one) */}
                {formData.workExperience.length > 1 && (
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      onClick={() => handleRemoveWorkExperience(index)}
                      className="text-red-500 hover:text-red-700 transition-colors duration-200 flex items-center text-sm font-medium"
                    >
                      <MinusCircleIcon className="h-5 w-5 mr-1" /> Hapus Pengalaman
                    </button>
                  </div>
                )}
              </div>
            ))}
            {/* Add button for new experience entry */}
            {formData.workExperience.length < 5 && (
              <button
                type="button"
                onClick={handleAddWorkExperience}
                className="flex items-center justify-center px-4 py-2 border border-dashed border-blue-400 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200 w-full text-base font-medium"
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" /> Tambah Pengalaman Kerja
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <label htmlFor="photoFile" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Unggah Foto (maks. 200KB, JPG/PNG)</label>
              <input
                type="file"
                id="photoFile"
                name="photoFile"
                accept=".jpg,.jpeg,.png"
                onChange={handleChange}
                required
                className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-base file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all duration-300 cursor-pointer"
              />
              {formData.photoFile && formData.photoFile.size > 200 * 1024 && (
                <p className="text-red-500 text-xs mt-1">Ukuran foto melebihi 200KB.</p>
              )}
            </div>
            <div>
              <label htmlFor="cvFile" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Unggah CV (maks. 1MB, PDF)</label>
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
            {loading ? 'Mengirim Lamaran...' : 'Kirim Lamaran'}
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
