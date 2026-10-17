import React, { useState, useEffect } from 'react';
import ParentSetup from './components/ParentSetup';
import StudentClassroom from './components/StudentClassroom';
import ParentReportView from './components/ParentReportView';
import ReceptionistDemo from './components/ReceptionistDemo';
import { GraduationCap } from 'lucide-react';

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
      
      const startRes = await fetch(`http://localhost:8000/api/start-lesson?curriculum_id=${lessonPlan.curriculum_id}&child_name=Tisha&gender=female&avatar_style=young_mentor&avatar_name=Joya`, {
        method: 'POST'
      });
      const startData = await startRes.json();
      
      setSessionData({
        ...startData,
        child_name: 'Tisha'
      });
      setActiveTab('classroom');
    } catch (err) {
      console.warn('Backend API connection fallback for fast sample:', err);
      setSessionData({
        child_name: 'Tisha',
        avatar_config: { gender: 'female', name: 'Joya' },
        current_response: {
          topic_id: 'topic_1',
          speech_text: "Hi Tisha! I am Joya. Welcome to Science class! Today we are learning how green plants use sunlight to make food!",
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

  // Live Avatar Classroom is the single active learning interface
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar matching template design */}
      <header className="topbar">
        <div className="brand" onClick={() => setActiveTab('setup')}>
          <div className="brand-icon">🎓</div>
          <div className="brand-title">My<span>Tutor</span></div>
          <span className="live-tag">Live Avatar Classroom</span>
        </div>
        <nav className="nav-links">
          <button 
            type="button"
            className={`nav-link ${activeTab === 'setup' ? 'active' : ''}`}
            onClick={() => setActiveTab('setup')}
          >
            ⚙️ Parent Setup
          </button>
          {sessionData && (
            <button 
              type="button"
              className={`nav-link ${activeTab === 'classroom' ? 'active' : ''}`}
              onClick={() => setActiveTab('classroom')}
            >
              📚 Classroom
            </button>
          )}
          {reportData && (
            <button 
              type="button"
              className={`nav-link ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              📊 Report
            </button>
          )}
        </nav>
        <div className="nav-right">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 700,
            color: backendStatus === 'online' ? '#059669' : '#D97706',
            background: backendStatus === 'online' ? '#D1FAE5' : '#FEF3C7',
            padding: '4px 10px',
            borderRadius: '99px'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: backendStatus === 'online' ? '#10B981' : '#F59E0B'
            }} />
            <span>{backendStatus === 'online' ? 'System Online' : 'Connecting...'}</span>
          </div>
        </div>
      </header>

      {/* Spacer below sticky topbar matching template */}
      <div style={{ height: '36px' }} />

      {/* Main Content */}
      <main style={{ flex: 1, width: '100%' }}>
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
            onBackToSetup={() => {
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              setSessionData(null);
              setActiveTab('setup');
            }}
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
        padding: '6px',
        fontSize: '0.72rem',
        color: 'var(--text-subtle)',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        MyTutor &copy; 2026 • Single Codebase for Android, iOS, Android TV & Set-Top Boxes
      </footer>
    </div>
  );
}
