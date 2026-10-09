import React, { useState, useEffect } from 'react';
import ParentSetup from './components/ParentSetup';
import StudentClassroom from './components/StudentClassroom';
import ParentReportView from './components/ParentReportView';
import ReceptionistDemo from './components/ReceptionistDemo';
import { Bot, GraduationCap, BarChart3, Building2, Tv, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('setup'); // 'setup', 'classroom', 'report', 'receptionist'
  const [sessionData, setSessionData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    fetch('http://localhost:8000/')
      .then((res) => res.json())
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline_fallback'));
  }, []);

  const handleStartLesson = (data) => {
    setSessionData(data);
    setActiveTab('classroom');
  };

  const handleFastSample = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/sample-lesson');
      const lessonPlan = await res.json();
      
      const startRes = await fetch(`http://localhost:8000/api/start-lesson?curriculum_id=${lessonPlan.curriculum_id}&child_name=Timmy&gender=female&avatar_style=young_mentor&avatar_name=Miss Sarah`, {
        method: 'POST'
      });
      const startData = await startRes.json();
      
      setSessionData({
        ...startData,
        child_name: 'Timmy'
      });
      setActiveTab('classroom');
    } catch (err) {
      console.warn('Backend API connection fallback for fast sample:', err);
      setSessionData({
        child_name: 'Timmy',
        avatar_config: { gender: 'female', name: 'Miss Sarah' },
        current_response: {
          topic_id: 'topic_1',
          speech_text: "Hi Timmy! I am Miss Sarah. Welcome to Science class! Today we are learning how green plants use sunlight to make food!",
          visemes: [],
          slide: {
            headline: "Plant Power Source ☀️🌱",
            bullet_points: ["Sunlight ☀️ (Energy from above)", "Water 💧 (Absorbed through roots)", "Carbon Dioxide 💨 (Air taken in by leaves)"],
            diagram_type: "sun_plant_diagram"
          },
          question: {
            question_id: "chk_1",
            question_text: "What three magic ingredients does a plant need to make its own food?",
            options: ["Sunlight, Water, and Carbon Dioxide", "Milk, Bread, and Cheese", "Soil, Rocks, and Raindrops"],
            correct_option_index: 0,
            correct_answer_text: "Sunlight, Water, and Carbon Dioxide"
          }
        }
      });
      setActiveTab('classroom');
    }
  };

  const handleLessonFinished = async (sessionId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/parent-report/${sessionId}`);
      const report = await res.json();
      setReportData(report);
    } catch (err) {
      console.warn('Backend report error fallback:', err);
    }
    setActiveTab('report');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Main Navigation Header */}
      <header className="glass-panel" style={{
        margin: '16px 20px',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '16px'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('setup')}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px var(--accent-purple-glow)'
          }}>
            <Bot size={24} color="#FFF" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>
              HelpMe
            </h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-purple)', fontWeight: 700, textTransform: 'uppercase' }}>
              Multi-Platform AI Agent Ecosystem
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('setup')}
            className={`btn-secondary ${activeTab === 'setup' ? 'dpad-focused' : ''}`}
            style={{ fontSize: '0.85rem' }}
          >
            <GraduationCap size={16} /> Parent Setup
          </button>

          <button 
            onClick={() => setActiveTab('classroom')}
            className={`btn-secondary ${activeTab === 'classroom' ? 'dpad-focused' : ''}`}
            style={{ fontSize: '0.85rem' }}
          >
            <Tv size={16} /> Student Classroom
          </button>

          <button 
            onClick={() => setActiveTab('report')}
            className={`btn-secondary ${activeTab === 'report' ? 'dpad-focused' : ''}`}
            style={{ fontSize: '0.85rem' }}
          >
            <BarChart3 size={16} /> Parent Report
          </button>

          <button 
            onClick={() => setActiveTab('receptionist')}
            className={`btn-secondary ${activeTab === 'receptionist' ? 'dpad-focused' : ''}`}
            style={{ fontSize: '0.85rem', borderColor: 'rgba(6, 182, 212, 0.4)' }}
          >
            <Building2 size={16} color="var(--accent-cyan)" /> Receptionist Mode
          </button>
        </nav>

        {/* Backend Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: backendStatus === 'online' ? 'var(--accent-green)' : 'var(--accent-gold)',
            boxShadow: backendStatus === 'online' ? '0 0 10px var(--accent-green)' : 'none'
          }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {backendStatus === 'online' ? 'FastAPI Backend Online' : 'Local Demo Mode'}
          </span>
        </div>
      </header>

      {/* View Content Routing */}
      <main style={{ flex: 1, padding: '10px' }}>
        {activeTab === 'setup' && (
          <ParentSetup 
            onStartLesson={handleStartLesson}
            onFastSample={handleFastSample}
          />
        )}

        {activeTab === 'classroom' && (
          <StudentClassroom 
            sessionData={sessionData}
            onLessonFinished={handleLessonFinished}
          />
        )}

        {activeTab === 'report' && (
          <ParentReportView 
            reportData={reportData}
            onRestart={() => setActiveTab('setup')}
          />
        )}

        {activeTab === 'receptionist' && (
          <ReceptionistDemo />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '16px',
        fontSize: '0.8rem',
        color: 'var(--text-subtle)',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        HelpMe AI Agent Ecosystem &copy; 2026 • Single Codebase for Android, iOS, Android TV & Set-Top Boxes
      </footer>
    </div>
  );
}
