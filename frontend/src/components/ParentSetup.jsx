import React, { useState, useEffect } from 'react';
import { Upload, User, GraduationCap, Sparkles, BookOpen, Bot, Check, ArrowRight, FileText, Library, Clock, RotateCcw } from 'lucide-react';
import { API_BASE } from '../apiConfig';

export default function ParentSetup({ onStartLesson, onFastSample }) {
  // Load cached settings from localStorage if available
  const [childName, setChildName] = useState(() => {
    const saved = localStorage.getItem('mytutor_child_name') || localStorage.getItem('helpme_child_name');
    return (saved && saved !== 'Vihana') ? saved : 'Tisha';
  });
  const [childAge, setChildAge] = useState(() => {
    const saved = localStorage.getItem('mytutor_child_age') || localStorage.getItem('helpme_child_age');
    return (saved && saved !== '8') ? parseInt(saved, 10) : 9;
  });
  const [grade, setGrade] = useState(() => {
    const saved = localStorage.getItem('mytutor_grade') || localStorage.getItem('helpme_grade');
    return (saved && saved !== 'Grade 3') ? saved : 'Grade 4';
  });
  const [gender, setGender] = useState(() => {
    return localStorage.getItem('mytutor_teacher_gender') || localStorage.getItem('helpme_teacher_gender') || 'female';
  });
  const [avatarStyle, setAvatarStyle] = useState(() => {
    return localStorage.getItem('mytutor_avatar_style') || localStorage.getItem('helpme_avatar_style') || 'young_mentor';
  });
  const [avatarName, setAvatarName] = useState(() => {
    const saved = localStorage.getItem('mytutor_avatar_name') || localStorage.getItem('helpme_avatar_name');
    return (saved && saved !== 'Miss Priya' && saved !== 'Miss Sarah') ? saved : 'Joya';
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState('profile');

  // Automatically save any modifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mytutor_child_name', childName);
      localStorage.setItem('mytutor_child_age', childAge.toString());
      localStorage.setItem('mytutor_grade', grade);
      localStorage.setItem('mytutor_teacher_gender', gender);
      localStorage.setItem('mytutor_avatar_style', avatarStyle);
      localStorage.setItem('mytutor_avatar_name', avatarName);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [childName, childAge, grade, gender, avatarStyle, avatarName]);

  // Saved Library State
  const [library, setLibrary] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState(null);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/library`);
      if (res.ok) {
        const data = await res.json();
        const sorted = [...data].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        setLibrary(sorted);
        if (sorted.length > 0 && !selectedCurriculumId && !pdfFile) {
          setSelectedCurriculumId(sorted[0].curriculum_id);
        }
      }
    } catch (err) {
      console.warn('Library fetch error:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
      setSelectedCurriculumId(null);
    }
  };

  const triggerFileInput = () => {
    const el = document.getElementById('fileInput');
    if (el) el.click();
  };

  const handleSelectSaved = (cid) => {
    if (selectedCurriculumId === cid) {
      setSelectedCurriculumId(null);
    } else {
      setSelectedCurriculumId(cid);
      setPdfFile(null);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!pdfFile && !selectedCurriculumId) {
      alert("Please upload a PDF/text chapter OR select a saved chapter from your library below!");
      return;
    }

    setIsUploading(true);

    try {
      let activeCurriculumId = selectedCurriculumId;

      if (pdfFile) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        formData.append('child_name', childName);
        formData.append('child_age', childAge.toString());
        formData.append('grade', grade);

        const res = await fetch(`${API_BASE}/api/upload-curriculum`, {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        activeCurriculumId = data.curriculum_id;
      }

      const activeName = avatarName || (gender === 'male' ? 'Mr. Rajesh' : 'Joya');
      const startRes = await fetch(
        `${API_BASE}/api/start-lesson?curriculum_id=${activeCurriculumId}&child_name=${encodeURIComponent(childName)}&gender=${gender}&avatar_style=${avatarStyle}&avatar_name=${encodeURIComponent(activeName)}`,
        { method: 'POST' }
      );

      const startData = await startRes.json();
      setIsUploading(false);

      onStartLesson({
        ...startData,
        child_name: childName
      });
    } catch (err) {
      console.warn('Backend API connection fallback:', err);
      setIsUploading(false);
      alert('Error launching lesson session. Please make sure backend is online.');
    }
  };

  const handleResetDefaults = () => {
    try {
      localStorage.clear();
    } catch (e) {}
    setChildName('Tisha');
    setChildAge(9);
    setGrade('Grade 4');
    setGender('female');
    setAvatarStyle('young_mentor');
    setAvatarName('Joya');
    setPdfFile(null);
  };

  return (
    <div className="page-wrapper setup-wrapper">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-card">
          <div className="sidebar-header">
            <span>⚙️</span> Parent Setup
          </div>
          <nav className="sidebar-nav">
            <button 
              type="button" 
              className="sidebar-item active"
            >
              <span className="icon">👤</span> Child Profile
            </button>
            <button 
              type="button" 
              className="sidebar-item"
              onClick={handleResetDefaults}
              title="Reset all settings to default"
            >
              <span className="icon">⚙️</span> Reset Defaults
            </button>
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <form onSubmit={handleSubmit} className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="panel-title">Child Profile</div>
                <div className="panel-subtitle">Add your child's details to personalize their learning experience.</div>
              </div>
              <button
                type="button"
                onClick={handleResetDefaults}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: '99px',
                  padding: '6px 14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={15} /> Reset
              </button>
            </div>
          </div>

          <div className="panel-body">
            {/* Child name + tutor side-by-side */}
            <div className="two-col">
              {/* LEFT: Child Info */}
              <div className="left-col">
                <div className="profile-row">
                  <div className="avatar-circle">👧</div>
                  <div className="field-group">
                    <div className="field-label">Child's Name</div>
                    <input 
                      className="field-input" 
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      placeholder="Enter name"
                      required
                    />
                  </div>
                </div>

                <div className="field-row-2">
                  <div className="field-group">
                    <div className="field-label">Age</div>
                    <select 
                      className="field-select" 
                      value={childAge}
                      onChange={(e) => setChildAge(parseInt(e.target.value, 10))}
                    >
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                      <option value={6}>6</option>
                      <option value={7}>7</option>
                      <option value={8}>8</option>
                      <option value={9}>9</option>
                      <option value={10}>10</option>
                      <option value={11}>11</option>
                      <option value={12}>12</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <div className="field-label">Grade / Class</div>
                    <select 
                      className="field-select" 
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                    >
                      <option value="Kindergarten">Kindergarten</option>
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* RIGHT: AI Tutor Selection */}
              <div>
                <div className="section-divider">Choose Your AI Tutor</div>
                <div className="tutor-options">
                  {/* Female Teacher Card */}
                  <div 
                    className={`tutor-card ${gender === 'female' ? 'selected' : ''}`}
                    onClick={() => {
                      setGender('female');
                      setAvatarName('Joya');
                    }}
                  >
                    <img 
                      className="tutor-avatar"
                      src="/female_teacher_avatar.jpg"
                      alt="Female Teacher"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const sib = e.currentTarget.nextElementSibling;
                        if (sib) sib.style.display = 'flex';
                      }}
                    />
                    <div className="tutor-avatar-placeholder" style={{ display: 'none' }}>👩‍🏫</div>
                    <div className="tutor-info">
                      <div className="tutor-name">Female Teacher</div>
                      <div className="tutor-desc">Joya • Patient & Warm</div>
                    </div>
                    {gender === 'female' && <div className="tutor-check">✓</div>}
                  </div>

                  {/* Male Teacher Card */}
                  <div 
                    className={`tutor-card ${gender === 'male' ? 'selected' : ''}`}
                    onClick={() => {
                      setGender('male');
                      setAvatarName('Mr. Rajesh');
                    }}
                  >
                    <img 
                      className="tutor-avatar"
                      src="/male_teacher_avatar.jpg"
                      alt="Male Teacher"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const sib = e.currentTarget.nextElementSibling;
                        if (sib) sib.style.display = 'flex';
                      }}
                    />
                    <div className="tutor-avatar-placeholder" style={{ display: 'none' }}>👨‍🏫</div>
                    <div className="tutor-info">
                      <div className="tutor-name">Male Teacher</div>
                      <div className="tutor-desc">Mr. Rajesh • Concept Mentor</div>
                    </div>
                    {gender === 'male' && <div className="tutor-check">✓</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* LEARNING MATERIAL */}
            <div className="material-section">
              <div className="section-divider">📚 Learning Material &amp; Textbook Chapters</div>
              <div className="material-grid">
                {/* Upload */}
                <div>
                  <div className="material-label">Option A: Upload New Textbook / TXT</div>
                  <label className="upload-box" htmlFor="fileInput">
                    {pdfFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="upload-icon" style={{ color: 'var(--green)' }}>📄</div>
                        <div style={{ textAlign: 'left' }}>
                          <div className="upload-label" style={{ color: 'var(--green)' }}>{pdfFile.name}</div>
                          <small style={{ color: 'var(--green)' }}>✓ Ready for Lesson Processing</small>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="upload-icon">⬆️</div>
                        <div className="upload-label">Click to Upload PDF or TXT</div>
                        <small>Supports textbook chapters &amp; study notes</small>
                      </>
                    )}
                  </label>
                  <input 
                    type="file" 
                    id="fileInput" 
                    hidden 
                    accept=".pdf,.txt" 
                    onChange={handleFileChange}
                  />
                </div>

                {/* Library */}
                <div>
                  <div className="material-label">Option B: Saved Chapters Library</div>
                  <div className="library-list">
                    {library.length > 0 ? (
                      library.map((item, idx) => {
                        const isSelected = selectedCurriculumId === item.curriculum_id && !pdfFile;
                        return (
                          <div 
                            key={item.curriculum_id}
                            className={`library-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectSaved(item.curriculum_id)}
                          >
                            <div className="library-item-left">
                              <span className="lib-icon">📊</span>
                              <div>
                                <div className="lib-title">{item.chapter_title}</div>
                                <div className="lib-sub">{item.topics_count || 3} Units · Saved in Library</div>
                              </div>
                            </div>
                            <span className="lib-arrow">{isSelected ? '✓' : '›'}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="library-item selected">
                        <div className="library-item-left">
                          <span className="lib-icon">📊</span>
                          <div>
                            <div className="lib-title">Unit 1: Families and Communities</div>
                            <div className="lib-sub">3 Units · Pre-loaded Default</div>
                          </div>
                        </div>
                        <span className="lib-arrow">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* START BUTTON */}
          <div className="start-section">
            <button 
              type="submit" 
              className="btn-start" 
              disabled={isUploading}
            >
              {isUploading ? (
                <>⏳ Generating AI Lesson &amp; Loading Avatar...</>
              ) : (
                <>✨ Generate AI Lesson &amp; Start Teaching →</>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
