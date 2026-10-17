import React, { useState, useEffect } from 'react';
import { Upload, User, GraduationCap, Sparkles, BookOpen, Bot, Check, ArrowRight, FileText, Library, Clock, Zap, RotateCcw } from 'lucide-react';

export default function ParentSetup({ onStartLesson }) {
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
      const res = await fetch('http://localhost:8000/api/library');
      if (res.ok) {
        const data = await res.json();
        // Sort most recent first (by created_at descending)
        const sorted = [...data].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        setLibrary(sorted);
        // Default select the most recent chapter on top
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
      setSelectedCurriculumId(null); // Clear selected saved item when uploading new file
    }
  };

  const triggerFileInput = () => {
    const el = document.getElementById('pdf-upload-input');
    if (el) el.click();
  };

  const handleSelectSaved = (cid) => {
    if (selectedCurriculumId === cid) {
      setSelectedCurriculumId(null);
    } else {
      setSelectedCurriculumId(cid);
      setPdfFile(null); // Clear pending file upload if picking from library
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pdfFile && !selectedCurriculumId) {
      alert("Please upload a PDF/text chapter OR select a saved chapter from your library below!");
      return;
    }

    setIsUploading(true);

    try {
      let activeCurriculumId = selectedCurriculumId;

      // 1. If uploading new file, submit upload endpoint first
      if (pdfFile) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        formData.append('child_name', childName);
        formData.append('child_age', childAge.toString());
        formData.append('grade', grade);

        const res = await fetch('http://localhost:8000/api/upload-curriculum', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        activeCurriculumId = data.curriculum_id;
      }

      // 2. Start teaching session using selected/uploaded curriculum
      const startRes = await fetch(`http://localhost:8000/api/start-lesson?curriculum_id=${activeCurriculumId}&child_name=${encodeURIComponent(childName)}&gender=${gender}&avatar_style=${avatarStyle}&avatar_name=${encodeURIComponent(avatarName)}`, {
        method: 'POST'
      });

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
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '6px 16px' }}>
      {/* Top Centered Compact Header */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid var(--accent-purple)',
            color: 'var(--accent-purple)',
            padding: '3px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 800
          }}>
            <Bot size={14} /> Parent Setup Portal
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '20px',
              padding: '3px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#64748B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
            title="Reset cached values to Tisha, Joya, Grade 4, Age 9"
          >
            <RotateCcw size={11} /> Reset Defaults
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
          Configure student profile, teacher persona, and select learning material.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Child Profile Section */}
          <div className="glass-panel" style={{ padding: '12px 16px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <User size={16} color="var(--accent-purple)" /> Child Profile
            </h2>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                Child's Name
              </label>
              <input 
                type="text" 
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '7px 11px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '9px',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Age
                </label>
                <input 
                  type="number" 
                  value={childAge}
                  onChange={(e) => setChildAge(parseInt(e.target.value))}
                  min="4"
                  max="18"
                  style={{
                    width: '100%',
                    padding: '7px 11px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '9px',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Grade / Class
                </label>
                <input 
                  type="text" 
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 11px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '9px',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Teacher Avatar Section */}
          <div className="glass-panel" style={{ padding: '12px 16px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <GraduationCap size={16} color="var(--accent-purple)" /> Teacher Avatar Persona
            </h2>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                Teacher Avatar Name
              </label>
              <input 
                type="text" 
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 11px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '9px',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                Avatar Gender
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setGender('female');
                    if (avatarName === 'Mr. Rajesh' || avatarName === 'Mr. Sharma') {
                      setAvatarName('Joya');
                    }
                  }}
                  className={`glass-card ${gender === 'female' ? 'dpad-focused' : ''}`}
                  style={{ padding: '7px 10px', borderRadius: '9px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 700, border: gender === 'female' ? '2px solid var(--accent-purple)' : '1px solid #CBD5E1' }}
                >
                  👩 Female Teacher
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setGender('male');
                    if (avatarName === 'Joya' || avatarName === 'Miss Priya' || avatarName === 'Miss Sarah') {
                      setAvatarName('Mr. Rajesh');
                    }
                  }}
                  className={`glass-card ${gender === 'male' ? 'dpad-focused' : ''}`}
                  style={{ padding: '7px 10px', borderRadius: '9px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 700, border: gender === 'male' ? '2px solid var(--accent-purple)' : '1px solid #CBD5E1' }}
                >
                  👨 Male Teacher
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Material Selection & Upload Container */}
        <div className="glass-panel" style={{ padding: '12px 16px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            <BookOpen size={16} color="var(--accent-purple)" /> Learning Material & Textbook Chapters
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Option A: Upload New File */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                Option A: Upload New Textbook / TXT
              </label>
              <input 
                type="file" 
                accept=".pdf,.txt" 
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="pdf-upload-input"
              />
              <div 
                onClick={triggerFileInput}
                style={{
                  border: pdfFile ? '2px solid var(--accent-green)' : '2px dashed #94A3B8',
                  borderRadius: '10px',
                  padding: '10px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: pdfFile ? 'rgba(5, 150, 105, 0.08)' : '#FFFFFF',
                  transition: 'all 0.2s ease',
                  minHeight: '75px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {pdfFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={24} color="var(--accent-green)" />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{pdfFile.name}</p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                        ✓ Ready for Processing
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload size={20} color="var(--accent-purple)" style={{ marginBottom: '3px' }} />
                    <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      Click to Upload PDF or TXT
                    </p>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', marginTop: '2px', margin: 0 }}>
                      Supports textbook chapters & study notes
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Option B: Pick from Saved History */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Option B: Saved Chapters Library
                </label>
              </div>

              <div style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '6px',
                maxHeight: '75px',
                overflowY: 'auto'
              }}>
                {library.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {library.map((item, index) => {
                      const isSelected = selectedCurriculumId === item.curriculum_id;
                      return (
                        <div 
                          key={item.curriculum_id}
                          onClick={() => handleSelectSaved(item.curriculum_id)}
                          style={{
                            padding: '6px 9px',
                            borderRadius: '7px',
                            background: isSelected ? 'rgba(99, 102, 241, 0.12)' : '#F8FAFC',
                            border: isSelected ? '1.5px solid var(--accent-purple)' : '1px solid #E2E8F0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Library size={15} color={isSelected ? 'var(--accent-purple)' : '#64748B'} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                                  {item.chapter_title}
                                </p>
                                {index === 0 && (
                                  <span style={{
                                    fontSize: '0.6rem',
                                    fontWeight: 800,
                                    background: 'var(--accent-purple)',
                                    color: '#FFFFFF',
                                    padding: '1px 5px',
                                    borderRadius: '5px'
                                  }}>
                                    RECENT
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                                {item.topics_count} Units • Saved in Library
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check size={15} color="var(--accent-purple)" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px 6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <Clock size={16} style={{ marginBottom: '2px', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>No saved chapters yet. Upload a chapter once to save it here!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div style={{ textAlign: 'center', marginTop: '2px' }}>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isUploading}
            style={{ fontSize: '0.92rem', padding: '10px 32px', borderRadius: '12px' }}
          >
            {isUploading ? 'Synthesizing AI Lesson Plan...' : <><Sparkles size={16} /> Generate AI Lesson & Start Teaching <ArrowRight size={16} /></>}
          </button>
        </div>
      </form>
    </div>
  );
}
