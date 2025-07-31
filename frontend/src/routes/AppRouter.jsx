import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';
import Recruteur from '../components/Recruteur';
// import CVparsing from '../components/cv-parsing';
import Sidebar from '../components/Sidebar';
import CommRecuSidebar from '../components/CommRecuSidebar';
import Header from '../components/Header';
import CommRecuHeader from '../components/CommRecuHeader';
import EditProfile from '../components/EditProfile';
import UserList from '../components/UserList';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/authContext';
import { useTheme } from '../context/themeContext';
import CvAnalyse from '../components/CvAnalyse';
import ForgotPassword from '../components/ForgotPassword';
import ResetPassword from '../components/ResetPassword';
import VerifyEmail from '../components/VerifyEmail';

function DarkModeWrapper({ children }) {
  const { isDarkMode } = useTheme();
  const mainStyle = {
    backgroundColor: isDarkMode ? '#1E2B45' : '#fff',
    color: isDarkMode ? '#fff' : '#000',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  };
  return <div style={mainStyle}>{children}</div>;
}

export default function AppRouter() {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const getDefaultRoute = () => {
    if (!user) return "/";
    if (user.role === "TopAdmin") return "/dashboard";
    if (user.role === "commercial") return "/Recruteur";
    if (["influenceur", "agence", "apporteur", "topApporteur"].includes(user.role)) return "/user-dashboard";
    return "/dashboard";
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <BrowserRouter>
      <DarkModeWrapper>
        {user?.role === "TopAdmin" && (
          <>
            <Header />
            <Sidebar collapsed={collapsed} toggleSidebar={toggleSidebar} />
          </>
        )}
        {user?.role === "commercial" && (
          <>
            <CommRecuHeader />
            <CommRecuSidebar collapsed={collapsed} toggleSidebar={toggleSidebar} />
          </>
        )}
        <Routes>
          <Route path="/" element={user ? <Navigate to={getDefaultRoute()} /> : <Login />} />
          <Route path="/login" element={user ? <Navigate to={getDefaultRoute()} /> : <Login />} />
          <Route path="/forgot-password" element={user ? <Navigate to={getDefaultRoute()} /> : <ForgotPassword />} />
          <Route path="/reset-password" element={user ? <Navigate to={getDefaultRoute()} /> : <ResetPassword />} />
          <Route path="/verify-email" element={user ? <Navigate to={getDefaultRoute()} /> : <VerifyEmail />} />
          <Route
            path="/dashboard"
            element={user && user.role === "TopAdmin" ? <Dashboard collapsed={collapsed} /> : <Navigate to="/" />}
          />
          <Route
            path="/Recruteur"
            element={user && user.role === "commercial" ? <Recruteur collapsed={collapsed} /> : <Navigate to="/" />}
          />
          <Route
            path="/cv-analyse"
            element={user && user.role === "commercial" ? <CvAnalyse collapsed={collapsed} /> : <Navigate to="/" />}
          />
          <Route
            path="/profile"
            element={user ? <EditProfile collapsed={collapsed} /> : <Navigate to="/" />}
          />
          <Route
            path="/users"
            element={user ? <UserList collapsed={collapsed} /> : <Navigate to="/" />}
          />
        </Routes>
      </DarkModeWrapper>
    </BrowserRouter>
  );
}
