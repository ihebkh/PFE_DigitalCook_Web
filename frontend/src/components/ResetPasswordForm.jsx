// ResetPasswordForm.jsx
// Composant de formulaire pour la réinitialisation de mot de passe avec token
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../service/auth/authService';
import { toast } from 'react-toastify';

/**
 * Formulaire de réinitialisation de mot de passe avec token.
 */
export default function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Vérifier si les paramètres requis sont présents
  useEffect(() => {
    if (!token || !email) {
      toast.error('Lien de réinitialisation invalide.', { autoClose: 3000 });
      navigate('/forgot-password');
    }
  }, [token, email, navigate]);

  // Gère la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.', { autoClose: 3000 });
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.', { autoClose: 3000 });
      return;
    }

    setLoading(true);
    
    try {
      await resetPassword(email, token, newPassword);
      setSuccess(true);
      toast.success('Mot de passe réinitialisé avec succès !', { autoClose: 3000 });
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la réinitialisation du mot de passe.', { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  // Rendu après succès
  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ 
          background: '#d4edda', 
          color: '#155724', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          <h3 style={{ marginBottom: '10px', color: '#155724' }}>Mot de passe réinitialisé !</h3>
          <p style={{ marginBottom: '15px' }}>
            Votre mot de passe a été réinitialisé avec succès.
          </p>
          <p style={{ fontSize: '14px', color: '#6c757d' }}>
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: '#f5b335',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          Se connecter
        </button>
      </div>
    );
  }

  // Rendu du formulaire
  return (
    <div>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '30px', 
        color: '#333',
        fontSize: '24px',
        fontWeight: '600'
      }}>
        Réinitialiser votre mot de passe
      </h2>
      <p style={{ 
        textAlign: 'center', 
        marginBottom: '30px', 
        color: '#666',
        fontSize: '16px'
      }}>
        Entrez votre nouveau mot de passe ci-dessous.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#333'
          }}>
            Nouveau mot de passe *
          </label>
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength="6"
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              border: '1px solid #ddd',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#333'
          }}>
            Confirmer le mot de passe *
          </label>
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              border: '1px solid #ddd',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || !newPassword || !confirmPassword}
          style={{
            width: '100%',
            padding: '14px 0',
            background: loading || !newPassword || !confirmPassword ? '#ccc' : '#f5b335',
            color: '#fff',
            fontSize: '16px',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: loading || !newPassword || !confirmPassword ? 'not-allowed' : 'pointer',
            marginTop: '10px',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? 'Réinitialisation en cours...' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
      
      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px' 
      }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'none',
            border: 'none',
            color: '#f5b335',
            cursor: 'pointer',
            fontSize: '14px',
            textDecoration: 'underline'
          }}
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  );
} 