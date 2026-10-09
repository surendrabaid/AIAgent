import React, { useState } from 'react';
import { Building2, Calendar, PhoneCall, CheckCircle, Bot, Sparkles, MessageSquare } from 'lucide-react';
import AvatarCanvas from './AvatarCanvas';

export default function ReceptionistDemo() {
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: 'Good afternoon! Welcome to Apex Health & Dental Clinic. I am Maya, your AI Front-Desk Receptionist. How may I assist you today?'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [bookingDone, setBookingDone] = useState(false);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText;
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInputText('');

    setTimeout(() => {
      let reply = "I would be happy to help you with that. Our clinic operating hours are Monday to Saturday from 8:00 AM to 6:00 PM.";
      if (userMsg.toLowerCase().includes('book') || userMsg.toLowerCase().includes('appointment') || userMsg.toLowerCase().includes('doctor')) {
        reply = "Certainly! I have an available consultation slot with Dr. Emily Watson tomorrow at 10:30 AM. Would you like me to reserve that for you?";
        setBookingDone(true);
      }
      setMessages((prev) => [...prev, { sender: 'agent', text: reply }]);
    }, 1000);
  };

  const receptionistAvatarConfig = {
    gender: 'female',
    name: 'Maya (Receptionist)',
    hair_color: '#1E293B',
    outfit_color: '#0284C7'
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(2, 132, 199, 0.1)',
          border: '1px solid var(--accent-cyan)',
          color: 'var(--accent-cyan)',
          padding: '6px 16px',
          borderRadius: '30px',
          fontSize: '0.85rem',
          fontWeight: 700,
          marginBottom: '10px'
        }}>
          <Building2 size={16} /> Generic Agent Metamorphosis: Receptionist Mode
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '6px', color: 'var(--text-main)' }}>
          AI Front-Desk & Visitor Receptionist
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Demonstrates how the same HelpMe Agent engine transforms into a corporate receptionist using front-desk knowledge context.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        {/* Receptionist Avatar */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
          <AvatarCanvas 
            avatarConfig={receptionistAvatarConfig}
            currentViseme={{ mouth_open: 0.4, mouth_wide: 0.6 }}
            isSpeaking={false}
            isListening={false}
            isThinking={false}
          />
        </div>

        {/* Chat / Intake Window */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '480px', background: '#FFFFFF' }}>
          <div style={{ overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, idx) => (
              <div 
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  background: m.sender === 'user' ? 'linear-gradient(135deg, var(--accent-purple), #4F46E5)' : '#F1F5F9',
                  border: m.sender === 'user' ? 'none' : '1px solid #E2E8F0',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  fontSize: '0.95rem',
                  color: m.sender === 'user' ? '#FFFFFF' : '#0F172A'
                }}
              >
                <strong>{m.sender === 'user' ? 'Visitor' : 'Maya (Receptionist)'}:</strong> {m.text}
              </div>
            ))}

            {bookingDone && (
              <div style={{
                background: 'rgba(5, 150, 105, 0.1)',
                border: '1px solid var(--accent-green)',
                padding: '12px',
                borderRadius: '12px',
                color: 'var(--accent-green)',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle size={18} /> Appointment Intake Slot Held: Dr. Emily Watson (10:30 AM Tomorrow)
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <input 
              type="text" 
              placeholder="Ask a question or request an appointment..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            />
            <button type="submit" className="btn-primary">
              <MessageSquare size={18} /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
