// ResetPassword.jsx
// Page de réinitialisation de mot de passe (layout + formulaire)
import AuthLayout from '../layouts/AuthLayout';
import ResetPasswordForm from './ResetPasswordForm';

/**
 * Page de réinitialisation de mot de passe (layout + formulaire).
 */
export default function ResetPassword() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
} 