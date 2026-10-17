// Centralized API configuration for MyTutor Frontend
// In production (Cloud Run), API_BASE is empty string so all requests use relative URLs ('/api/...').
// In development, if VITE_API_URL is set, it uses that; otherwise relative paths work via Vite proxy.
export const API_BASE = import.meta.env.VITE_API_URL || '';
