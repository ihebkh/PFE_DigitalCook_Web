// VerifyEmailForm.jsx
// Composant pour la vérification d'email avec token
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../service/auth/authService';
import { toast } from 'react-toastify';

/**
 * Composant de vérification d'email avec token.
 */
export default function VerifyEmailForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Vérifier si les paramètres requis sont présents
  useEffect(() => {
    if (!token || !email) {
      setError(true);
      toast.error('Lien de vérification invalide.', { autoClose: 3000 });
      return;
    }

    // Vérifier automatiquement l'email
    verifyEmailToken();
  }, [token, email]);

  const verifyEmailToken = async () => {
    setLoading(true);
    
    try {
      await verifyEmail(email, token);
      setSuccess(true);
      toast.success('Email vérifié avec succès !', { autoClose: 3000 });
    } catch (error) {
      setError(true);
      toast.error(error.message || 'Erreur lors de la vérification de l\'email.', { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  // Rendu en cas d'erreur
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          <h3 style={{ marginBottom: '10px', color: '#721c24' }}>Erreur de vérification</h3>
          <p style={{ marginBottom: '15px' }}>
            Le lien de vérification est invalide ou a expiré.
          </p>
          <p style={{ fontSize: '14px', color: '#6c757d' }}>
            Veuillez demander un nouveau lien de vérification.
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
          Retour à la connexion
        </button>
      </div>
    );
  }

  // Rendu en cas de succès
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
          <h3 style={{ marginBottom: '10px', color: '#155724' }}>Email vérifié !</h3>
          <p style={{ marginBottom: '15px' }}>
            Votre adresse email a été vérifiée avec succès.
          </p>
          <p style={{ fontSize: '14px', color: '#6c757d' }}>
            Vous pouvez maintenant vous connecter à votre compte.
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

  // Rendu pendant le chargement
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2 style={{ 
        marginBottom: '30px', 
        color: '#333',
        fontSize: '24px',
        fontWeight: '600'
      }}>
        Vérification de votre email
      </h2>
      <div style={{ 
        background: '#e7f3ff', 
        color: '#0c5460', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #bee5eb'
      }}>
        <p style={{ marginBottom: '15px' }}>
          Vérification de votre adresse email en cours...
        </p>
        {loading && (
          <div style={{ 
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #f5b335',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        )}
      </div>
    </div>
  );
} 