// Dashboard.jsx
// Composant d'affichage du tableau de bord PowerBI
import React from 'react';
import Header from './Header';
import { useTheme } from '../context/themeContext';

/**
 * Composant principal pour l'affichage du dashboard PowerBI.
 */
export default function Dashboard({ collapsed }) {
  const marginLeft = collapsed ? 90 : 270;
  const { isDarkMode } = useTheme();

  // Rendu principal
  return (
    <div>
      <Header />
      <main style={{
        marginLeft: marginLeft,
        marginTop: 64,
        padding: 32,
        transition: 'margin-left 0.2s',
        width: `calc(100% - ${marginLeft}px)`,
        height: 'calc(100vh - 64px - 64px)',
        overflow: 'auto',
        background: isDarkMode ? '#1E2B45' : '#fff',
        color: isDarkMode ? '#F0F0F0' : '#333',
      }}>
        <iframe 
          title="Dashboard" 
          width="1140"
          height="541.25"
          src="https://app.powerbi.com/reportEmbed?reportId=0a977f2d-71b6-4439-a950-c17000833f24&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730&filterPaneEnabled=false&navContentPaneEnabled=false"
          frameBorder="0" 
          allowFullScreen="true"
        ></iframe>
      </main>
    </div>
  );
}

