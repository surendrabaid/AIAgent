import React, { useState } from 'react';
import { Upload, User, GraduationCap, Sparkles, BookOpen, Bot, Check, ArrowRight, FileText } from 'lucide-react';

export default function ParentSetup({ onStartLesson, onFastSample }) {
  const [childName, setChildName] = useState('Timmy');
  const [childAge, setChildAge] = useState(9);
  const [grade, setGrade] = useState('Grade 4');
  const [gender, setGender] = useState('female');
  const [avatarStyle, setAvatarStyle] = useState('young_mentor');
  const [avatarName, setAvatarName] = useState('Miss Priya');
  const [pdfFile, setPdfFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    const el = document.getElementById('pdf-upload-input');
    if (el) el.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pdfFile) {
      alert("Please click 'Upload Chapter PDF / Material' to select your text file or PDF chapter before clicking Generate!");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      if (pdfFile) {
        formData.append('file', pdfFile);
      }
      formData.append('child_age', childAge.toString());
      formData.append('grade', grade);

      const res = await fetch('http://localhost:8000/api/upload-curriculum', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      // Immediately initialize teaching session
      const startRes = await fetch(`http://localhost:8000/api/start-lesson?curriculum_id=${data.curriculum_id}&child_name=${encodeURIComponent(childName)}&gender=${gender}&avatar_style=${avatarStyle}&avatar_name=${encodeURIComponent(avatarName)}`, {
        method: 'POST'
      });

      const startData = await startRes.json();
      setIsUploading(false);

      onStartLesson({
        ...startData,
        child_name: childName
      });
    } catch (err) {
      console.warn('Backend API connection fallback. Using local sample curriculum.', err);
      setIsUploading(false);
      alert('Error uploading file to server. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
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
          Set up your child's profile, select teacher avatar preferences, and upload your textbook chapter.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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

          {/* Quick Demo Launch Button */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
            <button 
              type="button" 
              onClick={onFastSample}
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Sparkles size={18} color="var(--accent-gold)" /> Quick Demo: Launch Sample Science Lesson
            </button>
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

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Avatar Gender
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button 
                type="button"
                onClick={() => setGender('female')}
                className={`glass-card ${gender === 'female' ? 'dpad-focused' : ''}`}
                style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 700, border: gender === 'female' ? '2px solid var(--accent-purple)' : '1px solid #CBD5E1' }}
              >
                👩 Female Teacher
              </button>
              <button 
                type="button"
                onClick={() => setGender('male')}
                className={`glass-card ${gender === 'male' ? 'dpad-focused' : ''}`}
                style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 700, border: gender === 'male' ? '2px solid var(--accent-purple)' : '1px solid #CBD5E1' }}
              >
                👨 Male Teacher
              </button>
            </div>
          </div>

          {/* Textbook Upload Container */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Upload Chapter PDF / Material
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
                padding: '22px',
                textAlign: 'center',
                cursor: 'pointer',
                background: pdfFile ? 'rgba(5, 150, 105, 0.08)' : '#FFFFFF',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
              }}
            >
              {pdfFile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <FileText size={28} color="var(--accent-green)" />
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>{pdfFile.name}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                      ✓ PDF Ready for AI Extraction
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={28} color="var(--accent-purple)" style={{ marginBottom: '8px' }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Click Anywhere Here to Upload PDF
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
                    Select textbook chapter PDF or TXT file
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '12px' }}>
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
