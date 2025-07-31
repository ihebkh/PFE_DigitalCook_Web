// ForgotPassword.jsx
// Page de mot de passe oublié (layout + formulaire)
import AuthLayout from '../layouts/AuthLayout';
import ForgotPasswordForm from './ForgotPasswordForm';

/**
 * Page de mot de passe oublié (layout + formulaire).
 */
export default function ForgotPassword() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
} 