// api.js
// Configuration centralisée des URLs de l'API

// URL de base de l'API backend
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Endpoints de l'API
export const API_ENDPOINTS = {
  // Authentification
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  SEND_VERIFICATION_EMAIL: '/auth/send-verification-email',
  CURRENT_USER: '/auth/current_user',
  
  // Analyse de CV
  ANALYSE_CV: '/analyse/analyse-cv',
  ALL_OFFERS: '/analyse/offres/all',
  
  // Utilisateurs
  USERS: '/users',
  USER_PROFILE: '/users/profile',
};

// Fonction utilitaire pour construire une URL complète
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
}; 