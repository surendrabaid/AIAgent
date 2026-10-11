import React from 'react';
import { BookOpen, Sun, Leaf, Wind, CheckCircle2, Sparkles, Lightbulb, Compass, Image as ImageIcon } from 'lucide-react';

export default function SlideBoard({ slide, topicTitle, chapterTitle, realWorldAnalogy, teacherName = 'your teacher' }) {
  if (!slide) return null;

  const getDiagramIcon = (type) => {
    switch (type) {
      case 'sun_plant_diagram':
        return <Sun size={48} color="#D97706" />;
      case 'leaf_microscope':
        return <Leaf size={48} color="#059669" />;
      case 'oxygen_cycle':
        return <Wind size={48} color="#0284C7" />;
      default:
        return <Compass size={48} color="#6366F1" />;
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      height: '100%',
      minHeight: '380px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      background: '#FFFFFF'
    }}>
      {/* Background Subtle Pattern */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '180px',
        height: '180px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <BookOpen size={16} color="var(--accent-purple)" />
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
            {chapterTitle || 'Textbook Chapter'}
          </span>
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px' }}>
          {topicTitle || slide.headline}
        </h2>
      </div>

      {/* Real-World Analogy Banner */}
      {(realWorldAnalogy || slide.image_prompt) && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(99, 102, 241, 0.08) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '14px',
          padding: '12px 16px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
          }}>
            <Lightbulb size={20} color="#D97706" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              💡 Real-World Teacher Analogy
            </span>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
              {realWorldAnalogy || slide.image_prompt || "Think of this like a daily adventure in real life!"}
            </p>
          </div>
        </div>
      )}

      {/* Visual Diagram & Interactive Bullets Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr',
        gap: '20px',
        alignItems: 'center',
        margin: '8px 0',
        background: '#F8FAFC',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid #E2E8F0'
      }}>
        {/* Visual Diagram Graphic Container */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #EEF2FF 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #C7D2FE',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
          textAlign: 'center',
          padding: '6px'
        }}>
          {getDiagramIcon(slide.diagram_type)}
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '4px' }}>
            VISUAL MAP
          </span>
        </div>

        {/* Bullet Points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {slide.bullet_points.map((pt, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} color="var(--accent-purple)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {pt}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div style={{
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        fontStyle: 'italic',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '8px'
      }}>
        <Sparkles size={14} color="var(--accent-gold)" />
        <span>Listen carefully to {teacherName}'s explanation, then share if you understood!</span>
      </div>
    </div>
  );
}
