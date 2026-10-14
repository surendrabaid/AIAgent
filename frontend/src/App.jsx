import React, { useState, useEffect } from 'react';
import ParentSetup from './components/ParentSetup';
import StudentClassroom from './components/StudentClassroom';
import ParentReportView from './components/ParentReportView';
import ReceptionistDemo from './components/ReceptionistDemo';
import LiveAvatarApp from './live-avatar/LiveAvatarApp';
import { Bot, GraduationCap, BarChart3, Building2, Tv, Sparkles, User, Video, ArrowLeft, ExternalLink } from 'lucide-react';

export default function App() {
  // null = Launch Mode Selection Screen, 'static' = Static Avatar Home, 'live' = AI Home Tutor Live Avatar
  const [selectedMode, setSelectedMode] = useState(null);
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
      
      const startRes = await fetch(`http://localhost:8000/api/start-lesson?curriculum_id=${lessonPlan.curriculum_id}&child_name=Vihana&gender=female&avatar_style=young_mentor&avatar_name=Miss Sarah`, {
        method: 'POST'
      });
      const startData = await startRes.json();
      
      setSessionData({
        ...startData,
        child_name: 'Vihana'
      });
      setActiveTab('classroom');
    } catch (err) {
      console.warn('Backend API connection fallback for fast sample:', err);
      setSessionData({
        child_name: 'Vihana',
        avatar_config: { gender: 'female', name: 'Miss Sarah' },
        current_response: {
          topic_id: 'topic_1',
          speech_text: "Hi Vihana! I am Miss Sarah. Welcome to Science class! Today we are learning how green plants use sunlight to make food!",
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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("LiveAvatarApp ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0F172A',
          color: '#F8FAFC',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>
            Oops! An issue occurred in Gemini Live Avatar
          </h2>
          <p style={{ color: '#94A3B8', maxWidth: '500px', marginBottom: '24px', fontSize: '0.95rem' }}>
            {this.state.error?.message || 'Unexpected application error.'}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                background: '#6366F1',
                color: '#FFF',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.props.onBack}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                background: '#334155',
                color: '#FFF',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Back to Selection
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

  // Option 2: Gemini Live Avatar -> Integrated AI Home Tutor Native Component
  if (selectedMode === 'live') {
    return (
      <ErrorBoundary onBack={() => setSelectedMode(null)}>
        <LiveAvatarApp onBackToSelection={() => setSelectedMode(null)} />
      </ErrorBoundary>
    );
  }

  // Before launch home screen: Choose between Static Avatar and Gemini Live Avatar
  if (selectedMode === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.12) 0%, rgba(248, 250, 252, 0.95) 100%)',
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '780px',
          width: '100%',
          textAlign: 'center'
        }}>
          {/* Header */}
          <div style={{ marginBottom: '36px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: 'var(--accent-purple)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 800,
              marginBottom: '14px',
              letterSpacing: '0.04em'
            }}>
              <Sparkles size={14} /> AI HOME TUTOR ECOSYSTEM
            </span>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: 'var(--text-main)',
              marginBottom: '10px',
              letterSpacing: '-0.02em'
            }}>
              Select Avatar Option
            </h1>
            <p style={{
              fontSize: '1rem',
              color: 'var(--text-muted)',
              maxWidth: '520px',
              margin: '0 auto',
              lineHeight: 1.5
            }}>
              Please choose an avatar mode to begin your learning experience.
            </p>
          </div>

          {/* Two Main Option Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '22px',
            textAlign: 'left'
          }}>
            {/* Option 1: Static Avatar */}
            <div
              onClick={() => {
                setSelectedMode('static');
                setActiveTab('setup');
              }}
              className="glass-panel"
              style={{
                padding: '28px',
                borderRadius: '24px',
                border: '2px solid var(--accent-purple)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#FFFFFF',
                boxShadow: '0 10px 30px rgba(99, 102, 241, 0.12)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 18px 40px rgba(99, 102, 241, 0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.12)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
                  }}>
                    <GraduationCap size={28} />
                  </div>
                  <span style={{
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: 'var(--accent-purple)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '14px',
                    border: '1px solid rgba(99, 102, 241, 0.25)'
                  }}>
                    OPTION 1
                  </span>
                </div>

                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Static Avatar
                </h3>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-purple)', marginBottom: '10px' }}>
                  2D Viseme Teacher (Miss Priya / Mr. Rajesh)
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
                  Interactive 1-on-1 tutoring with real-time lip-sync, Socratic slide board, quizzes, and doubt clarification.
                </p>
              </div>

              <button
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
                }}
              >
                <span>Launch Static Avatar</span>
              </button>
            </div>

            {/* Option 2: Gemini Live Avatar */}
            <div
              onClick={() => {
                setSelectedMode('live');
              }}
              className="glass-panel"
              style={{
                padding: '28px',
                borderRadius: '24px',
                border: '1px solid #CBD5E1',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#FFFFFF',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = '#0284C7';
                e.currentTarget.style.boxShadow = '0 18px 40px rgba(2, 132, 199, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    boxShadow: '0 8px 16px rgba(2, 132, 199, 0.3)'
                  }}>
                    <Video size={26} />
                  </div>
                  <span style={{
                    background: 'rgba(2, 132, 199, 0.1)',
                    color: '#0284C7',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '14px',
                    border: '1px solid rgba(2, 132, 199, 0.25)'
                  }}>
                    OPTION 2
                  </span>
                </div>

                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Gemini Live Avatar
                </h3>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284C7', marginBottom: '10px' }}>
                  AI Home Tutor • Gemini 3.8 Live Stream
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
                  Live bidirectional video (24 FPS) & audio streaming with Teacher Jay, Quiz Master HUD, and real-time transcription.
                </p>
              </div>

              <button
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                }}
              >
                <span>Launch Gemini Live Avatar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Option 1: Static Avatar Home Screen (Parent Setup, Classroom, Report)
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar with Switch Mode action */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GraduationCap size={20} color="var(--accent-purple)" />
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
            HelpMe AI Tutor
          </span>
          <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-purple)', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
            Static Avatar Mode
          </span>
        </div>

        <button
          onClick={() => {
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            setSelectedMode(null);
          }}
          style={{
            background: '#F1F5F9',
            border: '1px solid #CBD5E1',
            borderRadius: '14px',
            padding: '5px 12px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Return to Avatar Selection"
        >
          <ArrowLeft size={13} /> Switch Avatar Mode
        </button>
      </header>

      {/* Main Content */}
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
