import React, { useState, useEffect } from 'react';
import { Upload, User, GraduationCap, Sparkles, BookOpen, Bot, Check, ArrowRight, FileText, Library, Clock, Zap } from 'lucide-react';

export default function ParentSetup({ onStartLesson }) {
  // Load cached settings from localStorage if available
  const [childName, setChildName] = useState(() => {
    return localStorage.getItem('helpme_child_name') || 'Vihana';
  });
  const [childAge, setChildAge] = useState(() => {
    const saved = localStorage.getItem('helpme_child_age');
    return saved ? parseInt(saved, 10) : 8;
  });
  const [grade, setGrade] = useState(() => {
    return localStorage.getItem('helpme_grade') || 'Grade 3';
  });
  const [gender, setGender] = useState(() => {
    return localStorage.getItem('helpme_teacher_gender') || 'female';
  });
  const [avatarStyle, setAvatarStyle] = useState(() => {
    return localStorage.getItem('helpme_avatar_style') || 'young_mentor';
  });
  const [avatarName, setAvatarName] = useState(() => {
    return localStorage.getItem('helpme_avatar_name') || 'Miss Priya';
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Automatically save any modifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('helpme_child_name', childName);
      localStorage.setItem('helpme_child_age', childAge.toString());
      localStorage.setItem('helpme_grade', grade);
      localStorage.setItem('helpme_teacher_gender', gender);
      localStorage.setItem('helpme_avatar_style', avatarStyle);
      localStorage.setItem('helpme_avatar_name', avatarName);
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

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid var(--accent-purple)',
          color: 'var(--accent-purple)',
          padding: '6px 16px',
          borderRadius: '30px',
          fontSize: '0.85rem',
          fontWeight: 700,
          marginBottom: '12px'
        }}>
          <Bot size={16} /> Parent Setup Portal
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '8px', color: 'var(--text-main)' }}>
          Configure Your Kid's AI Tutor
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Set up your child's profile, choose teacher preferences, and select or upload learning material.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Child Profile Section */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
              <User color="var(--accent-purple)" /> Child Profile
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Child's Name
              </label>
              <input 
                type="text" 
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  color: 'var(--text-main)',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
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
                    padding: '12px 16px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '12px',
                    color: 'var(--text-main)',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Grade / Class
                </label>
                <input 
                  type="text" 
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '12px',
                    color: 'var(--text-main)',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Teacher Avatar Section */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
              <GraduationCap color="var(--accent-purple)" /> Teacher Avatar Persona
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Teacher Avatar Name
              </label>
              <input 
                type="text" 
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  color: 'var(--text-main)',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Avatar Gender
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setGender('female');
                    if (avatarName === 'Mr. Rajesh' || avatarName === 'Mr. Sharma') {
                      setAvatarName('Miss Priya');
                    }
                  }}
                  className={`glass-card ${gender === 'female' ? 'dpad-focused' : ''}`}
                  style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 700, border: gender === 'female' ? '2px solid var(--accent-purple)' : '1px solid #CBD5E1' }}
                >
                  👩 Female Teacher
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setGender('male');
                    if (avatarName === 'Miss Priya' || avatarName === 'Miss Sarah') {
                      setAvatarName('Mr. Rajesh');
                    }
                  }}
                  className={`glass-card ${gender === 'male' ? 'dpad-focused' : ''}`}
                  style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 700, border: gender === 'male' ? '2px solid var(--accent-purple)' : '1px solid #CBD5E1' }}
                >
                  👨 Male Teacher
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Material Selection & Upload Container */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
            <BookOpen color="var(--accent-purple)" /> Learning Material & Textbook Chapters
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Option A: Upload New File */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Option A: Upload New Textbook / TXT File
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
                  borderRadius: '14px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: pdfFile ? 'rgba(5, 150, 105, 0.08)' : '#FFFFFF',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                  minHeight: '130px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {pdfFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText size={32} color="var(--accent-green)" />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>{pdfFile.name}</p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                        ✓ New File Selected for AI Processing
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload size={28} color="var(--accent-purple)" style={{ marginBottom: '6px' }} />
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Click to Upload PDF or Text File
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
                      Supports PDF and TXT textbook chapters
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Option B: Pick from Saved History */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Option B: Saved Chapters Library
                </label>
              </div>

              <div style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '14px',
                padding: '12px',
                maxHeight: '140px',
                overflowY: 'auto'
              }}>
                {library.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {library.map((item, index) => {
                      const isSelected = selectedCurriculumId === item.curriculum_id;
                      return (
                        <div 
                          key={item.curriculum_id}
                          onClick={() => handleSelectSaved(item.curriculum_id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: isSelected ? 'rgba(99, 102, 241, 0.12)' : '#F8FAFC',
                            border: isSelected ? '2px solid var(--accent-purple)' : '1px solid #E2E8F0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Library size={18} color={isSelected ? 'var(--accent-purple)' : '#64748B'} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                                  {item.chapter_title}
                                </p>
                                {index === 0 && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    background: 'var(--accent-purple)',
                                    color: '#FFFFFF',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    letterSpacing: '0.3px'
                                  }}>
                                    RECENT
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {item.topics_count} Units • Cached in History
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check size={18} color="var(--accent-purple)" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Clock size={20} style={{ marginBottom: '4px', opacity: 0.5 }} />
                    <p>No saved chapters yet. Upload a chapter once and it will be saved here!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isUploading}
            style={{ fontSize: '1.1rem', padding: '16px 40px' }}
          >
            {isUploading ? 'Synthesizing AI Lesson Plan...' : <><Sparkles /> Generate AI Lesson & Start Teaching <ArrowRight /></>}
          </button>
        </div>
      </form>
    </div>
  );
}
