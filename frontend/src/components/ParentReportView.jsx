import React from 'react';
import { Award, CheckCircle2, AlertCircle, Lightbulb, RefreshCw, Star, Share2 } from 'lucide-react';

export default function ParentReportView({ reportData, onRestart }) {
  const report = reportData || {
    child_name: 'Vihana',
    chapter_title: 'Photosynthesis & Plant Life',
    completed_at: 'Just now',
    overall_comprehension_pct: 92,
    mastered_topics: ['What Plants Need: Sunlight & Water', 'Inside the Leaf: Chloroplasts'],
    struggle_topics: ['The Gift of Oxygen'],
    teacher_notes: 'Vihana was highly enthusiastic and quickly grasped how chlorophyll acts as a solar panel!',
    recommended_activities: [
      'Take a walk outside and look closely at green leaves together',
      'Ask Vihana to explain why plants need sunlight at dinner'
    ]
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '20px' }}>
      <div className="glass-panel" style={{ padding: '32px', background: '#FFFFFF' }}>
        {/* Header */}
        <div style={{ textAlignment: 'center', marginBottom: '28px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(5, 150, 105, 0.1)',
            border: '1px solid var(--accent-green)',
            color: 'var(--accent-green)',
            padding: '6px 16px',
            borderRadius: '30px',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '12px'
          }}>
            <Award size={16} /> Lesson Complete - Digest Report
          </div>

          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '6px', color: 'var(--text-main)' }}>
            {report.child_name}'s Learning Performance
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            Chapter: <strong style={{ color: 'var(--text-main)' }}>{report.chapter_title}</strong>
          </p>
        </div>

        {/* Top Analytics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '28px' }}>
          {/* Comprehension Percentage Score Dial */}
          <div className="glass-card" style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            background: 'radial-gradient(circle, rgba(5, 150, 105, 0.08) 0%, transparent 70%)'
          }}>
            <div style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              border: '6px solid var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 900,
              color: 'var(--accent-green)',
              boxShadow: '0 0 20px rgba(5, 150, 105, 0.2)',
              marginBottom: '12px'
            }}>
              {report.overall_comprehension_pct}%
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Comprehension Rating
            </span>
          </div>

          {/* Mastered vs Struggle Breakdown */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-green)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> Mastered Concepts
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {report.mastered_topics.map((t, idx) => (
                  <span key={idx} style={{
                    background: 'rgba(5, 150, 105, 0.1)',
                    border: '1px solid var(--accent-green)',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '8px'
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {report.struggle_topics.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} /> Focus Topics for Review
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {report.struggle_topics.map((t, idx) => (
                    <span key={idx} style={{
                      background: 'rgba(217, 119, 6, 0.1)',
                      border: '1px solid var(--accent-gold)',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: '8px'
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Teacher Notes & Recommended Activities */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-purple)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={18} /> Teacher Persona Notes
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              "{report.teacher_notes}"
            </p>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={18} /> Recommended Parent Activities
            </h3>
            <ul style={{ paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {report.recommended_activities.map((act, idx) => (
                <li key={idx}>{act}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Questions & Answers Audit Log for Parents */}
        {report.qna_history && report.qna_history.length > 0 && (
          <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} color="var(--accent-purple)" />
              Questions Asked & {report.child_name}'s Answers
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {report.qna_history.map((qna, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: qna.is_correct ? 'rgba(5, 150, 105, 0.04)' : 'rgba(239, 68, 68, 0.04)',
                    border: qna.is_correct ? '1px solid rgba(5, 150, 105, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Unit: {qna.topic_title}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '8px',
                      background: qna.is_correct ? 'rgba(5, 150, 105, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: qna.is_correct ? 'var(--accent-green)' : '#DC2626'
                    }}>
                      {qna.is_correct 
                        ? ((qna.attempt_number && qna.attempt_number > 1) || qna.is_remedial
                            ? `✓ Mastered on Attempt ${qna.attempt_number || 2}`
                            : '✓ Correct on 1st Attempt')
                        : `⚠ Attempt ${qna.attempt_number || 1}: Needed Remedial Help`}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                    Q{idx + 1}: {qna.question_text}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: qna.is_correct ? 'var(--accent-green)' : '#DC2626' }}>
                        {report.child_name}'s Answer:
                      </span>
                      <span style={{ color: 'var(--text-main)' }}>
                        {qna.student_selected_text}
                      </span>
                    </div>

                    {!qna.is_correct && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
                          Correct Concept:
                        </span>
                        <span style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>
                          {qna.correct_answer_text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button onClick={onRestart} className="btn-primary">
            <RefreshCw size={18} /> Start Another Chapter
          </button>
        </div>
      </div>
    </div>
  );
}
