// authService.jsx
// Service pour l'authentification et le profil utilisateur
import axios from 'axios';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';

/**
 * Authentifie l'utilisateur (login).
 */
export async function login(email, password) {
  try {
    const res = await axios.post(buildApiUrl(API_ENDPOINTS.LOGIN), { email, password }, {withCredentials: true});
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Erreur serveur');
  }
}

/**
 * Récupère l'utilisateur courant.
 */
export async function getCurrentUser() {
  try {
    const res = await axios.get(buildApiUrl(API_ENDPOINTS.CURRENT_USER), {
      withCredentials: true,
    });
    return res.data;
  } catch (err) {
    return null;
  }
}

/**
 * Déconnecte l'utilisateur.
 */
export async function logout() {
  try {
    const res = await axios.get(buildApiUrl('/auth/logout'), { withCredentials: true });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Erreur lors de la déconnexion');
  }
}

/**
 * Met à jour le profil utilisateur courant.
 */
export async function updateUserProfile(userData) {
  try {
    const res = await axios.put(buildApiUrl('/auth/profile'), userData, { withCredentials: true });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Erreur lors de la mise à jour du profil');
  }
}

/**
 * Upload une photo de profil pour l'utilisateur courant.
 */
export async function uploadProfilePhoto(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post(buildApiUrl('/auth/upload_photo'), formData, {
    withCredentials: true,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data.photo_url;
}

/**
 * Envoie un email de réinitialisation de mot de passe.
 */
export async function forgotPassword(email) {
  try {
    const res = await axios.post(buildApiUrl(API_ENDPOINTS.FORGOT_PASSWORD), { email });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Erreur lors de l\'envoi de l\'email de réinitialisation');
  }
}

/**
 * Réinitialise le mot de passe avec le token.
 */
export async function resetPassword(email, token, newPassword) {
  try {
    const res = await axios.post(buildApiUrl(API_ENDPOINTS.RESET_PASSWORD), {
      email,
      token,
      new_password: newPassword
    });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Erreur lors de la réinitialisation du mot de passe');
  }
}

/**
 * Vérifie l'email avec le token.
 */
export async function verifyEmail(email, token) {
  try {
    const res = await axios.post(buildApiUrl(API_ENDPOINTS.VERIFY_EMAIL), {
      email,
      token
    });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Erreur lors de la vérification de l\'email');
  }
}

/**
 * Envoie un email de vérification.
 */
export async function sendVerificationEmail(email) {
  try {
    const res = await axios.post(buildApiUrl(API_ENDPOINTS.SEND_VERIFICATION_EMAIL), { email });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Erreur lors de l\'envoi de l\'email de vérification');
  }
}

/**
 * Analyse un CV PDF (pour compatibilité, à ne plus utiliser).
 */
export async function analyseCv(file) {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await axios.post(buildApiUrl(API_ENDPOINTS.ANALYSE_CV), formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || "Erreur lors de l'analyse du CV");
  }
}
