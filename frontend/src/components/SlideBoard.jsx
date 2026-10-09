import React from 'react';
import { BookOpen, Sun, Leaf, Wind, CheckCircle2, Sparkles } from 'lucide-react';

export default function SlideBoard({ slide, topicTitle, chapterTitle }) {
  if (!slide) return null;

  const getDiagramIcon = (type) => {
    switch (type) {
      case 'sun_plant_diagram':
        return <Sun size={44} color="#D97706" />;
      case 'leaf_microscope':
        return <Leaf size={44} color="#059669" />;
      case 'oxygen_cycle':
        return <Wind size={44} color="#0284C7" />;
      default:
        return <Sparkles size={44} color="#6366F1" />;
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      height: '100%',
      minHeight: '360px',
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
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px' }}>
          {topicTitle || slide.headline}
        </h2>
      </div>

      {/* Diagram & Bullet Points Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr',
        gap: '20px',
        alignItems: 'center',
        margin: '16px 0',
        background: '#F8FAFC',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid #E2E8F0'
      }}>
        {/* Diagram Graphic */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '16px',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #CBD5E1',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
        }}>
          {getDiagramIcon(slide.diagram_type)}
        </div>

        {/* Bullet Points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {slide.bullet_points.map((pt, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} color="var(--accent-purple)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
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
        gap: '6px'
      }}>
        <Sparkles size={14} color="var(--accent-gold)" />
        <span>Listen carefully to your teacher and get ready for a fun question!</span>
      </div>
    </div>
  );
}
