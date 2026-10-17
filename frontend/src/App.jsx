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
      {/* Top Bar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 18px',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GraduationCap size={18} color="var(--accent-purple)" />
          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
            My Tutor
          </span>
          <span style={{ fontSize: '0.68rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-purple)', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
            Live Avatar Classroom
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.72rem',
          fontWeight: 600,
          color: backendStatus === 'online' ? '#059669' : '#D97706',
          background: backendStatus === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          padding: '3px 9px',
          borderRadius: '12px'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: backendStatus === 'online' ? '#10B981' : '#F59E0B'
          }} />
          <span>{backendStatus === 'online' ? 'System Online' : 'Connecting Backend...'}</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '4px 8px' }}>
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
        My Tutor &copy; 2026 • Single Codebase for Android, iOS, Android TV & Set-Top Boxes
      </footer>
    </div>
  );
}
