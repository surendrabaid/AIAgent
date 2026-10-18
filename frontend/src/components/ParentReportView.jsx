import React from 'react';
import { Award, CheckCircle2, AlertCircle, Lightbulb, RefreshCw, Star } from 'lucide-react';

export default function ParentReportView({ reportData, onRestart }) {
  const report = reportData || {
    child_name: 'Tisha',
    chapter_title: 'Our Families and Communities',
    completed_at: 'Just now',
    overall_comprehension_pct: 95,
    mastered_topics: ['Living Together in Communities', 'Mutual Aid & Helping Neighbors', 'Community Helpers'],
    struggle_topics: ['Civic Duties in Neighborhoods'],
    teacher_notes: 'Tisha was vibrant, attentive, and quickly understood how cooperation makes neighborhoods joyful!',
    recommended_activities: [
      'Take an evening walk around your neighborhood and identify community helpers together',
      'Ask Tisha how your family can help a neighbor this weekend'
    ]
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1040px' }}>
      <div className="panel">
        {/* Header */}
        <div className="panel-header" style={{ textAlign: 'center', padding: '28px 28px 16px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--green-bg)',
            border: '1.5px solid #a7f3d0',
            color: '#065f46',
            padding: '6px 16px',
            borderRadius: '99px',
            fontSize: '14px',
            fontWeight: 800,
            marginBottom: '12px'
          }}>
            <Award size={18} color="#059669" /> LESSON COMPLETE • DIGEST REPORT
          </div>

          <h1 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)', margin: '0 0 8px 0' }}>
            {report.child_name}'s Learning Performance
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16.5px', margin: 0 }}>
            Chapter: <strong style={{ color: 'var(--ink)' }}>{report.chapter_title}</strong>
          </p>
        </div>

        <div className="panel-body">
          {/* Top Analytics Cards */}
          <div className="report-top-grid">
            {/* Comprehension Percentage Score Dial */}
            <div className="report-dial-card" style={{
              background: '#FFFFFF',
              border: '1.5px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(30, 42, 74, 0.06)'
            }}>
              <div style={{
                width: '116px',
                height: '116px',
                borderRadius: '50%',
                border: '7px solid var(--green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '35px',
                fontWeight: 900,
                color: 'var(--green)',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
                marginBottom: '12px'
              }}>
                {report.overall_comprehension_pct}%
              </div>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                Comprehension Rating
              </span>
            </div>

            {/* Mastered vs Struggle Breakdown */}
            <div className="report-breakdown-card" style={{
              background: '#FFFFFF',
              border: '1.5px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '16px',
              boxShadow: '0 4px 16px rgba(30, 42, 74, 0.06)'
            }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#059669', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} /> Mastered Concepts
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {report.mastered_topics.map((t, idx) => (
                    <span key={idx} style={{
                      background: 'var(--green-bg)',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      fontSize: '14px',
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: '8px'
                    }}>
                      ✓ {t}
                    </span>
                  ))}
                </div>
              </div>

              {report.struggle_topics && report.struggle_topics.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#b45309', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} /> Focus Topics for Review
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {report.struggle_topics.map((t, idx) => (
                      <span key={idx} style={{
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        color: '#92400e',
                        fontSize: '14px',
                        fontWeight: 700,
                        padding: '6px 12px',
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
          <div className="report-two-col">
            <div style={{
              background: '#fafbff',
              border: '1.5px solid #e0deff',
              borderRadius: '14px',
              padding: '20px'
            }}>
              <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={19} /> Teacher Persona Notes
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>
                "{report.teacher_notes}"
              </p>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1.5px solid var(--border)',
              borderRadius: '14px',
              padding: '20px'
            }}>
              <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: 'var(--ink)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lightbulb size={19} color="var(--primary)" /> Recommended Parent Activities
              </h3>
              <ul style={{ paddingLeft: '20px', fontSize: '14.5px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                {report.recommended_activities.map((act, idx) => (
                  <li key={idx}>{act}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Questions & Answers Audit Log for Parents */}
          {report.qna_history && report.qna_history.length > 0 && (
            <div style={{
              background: '#FFFFFF',
              border: '1.5px solid var(--border)',
              borderRadius: '14px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: 'var(--ink)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color="var(--primary)" /> Questions Asked &amp; {report.child_name}'s Answers
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {report.qna_history.map((qna, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: qna.is_correct ? 'var(--green-bg)' : '#fef2f2',
                      border: qna.is_correct ? '1px solid #a7f3d0' : '1px solid #fecaca'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        Unit: {qna.topic_title}
                      </span>
                      <span style={{
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: qna.is_correct ? '#065f46' : '#991b1b'
                      }}>
                        {qna.is_correct ? '✓ Correct' : '⚠ Needed Remedial Help'}
                      </span>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px 0' }}>
                      Q{idx + 1}: {qna.question_text}
                    </p>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                      <strong>{report.child_name}'s Answer:</strong> {qna.student_selected_text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="start-section" style={{ padding: '8px 0 0' }}>
            <button 
              type="button" 
              onClick={onRestart} 
              className="btn-start"
            >
              <RefreshCw size={20} /> Start Another Lesson / Parent Setup →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
