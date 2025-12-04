import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/themeContext';
import Header from './Header';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Avatar, CircularProgress, TextField,
  Pagination, Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getUsers, getPrivileges } from '../service/user/userService';

/**
 * Composant principal pour l'affichage des utilisateurs (lecture seule)
 */
const UserList = ({ collapsed }) => {
  // État principal
  const [users, setUsers] = useState([]);
  const [privileges, setPrivileges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();
  const marginLeft = collapsed ? 90 : 270;

  // États pour la recherche et pagination
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(7);

  // Chargement initial des utilisateurs et privilèges
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, privilegesRes] = await Promise.all([
          getUsers(),
          getPrivileges()
        ]);
        console.log('Users data:', usersRes); // Debug
        console.log('Privileges data:', privilegesRes); // Debug
        setUsers(usersRes);
        setPrivileges(privilegesRes);
      } catch (error) {
        // Erreur lors de la récupération des données
        console.error('Erreur lors de la récupération des données:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Retourne l'URL de la photo (gère le cas local/uploads)
  const getPhotoSrc = (url) => {
    if (!url) return 'https://i.pravatar.cc/150?u=default';
    if (url.startsWith('/uploads/')) return `http://localhost:8000${url}`;
    return url;
  };

  // Fonction pour obtenir le label du privilège
  const getPrivilegeLabel = (privilege) => {
    let label = '';
    
    // Si privilege est un objet avec label (nouveau format)
    if (privilege && typeof privilege === 'object' && privilege.label) {
      label = privilege.label;
    }
    // Si privilege est juste un string (ancien format)
    else if (typeof privilege === 'string') {
      label = privilege;
    }
    // Si aucun privilège
    else {
      return 'N/A';
    }
    
    // Remplacer "commercial" par "recruteur"
    return label === 'commercial' ? 'recruteur' : label;
  };

  // Styles pour le tableau
  const tableCellHeaderStyle = {
    backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    fontWeight: 'bold',
  };
  const tableCellStyle = {
    color: isDarkMode ? '#FFFFFF' : '#000000',
  };

  // Logique de pagination
  const filteredUsers = users.filter(user => {
    const q = search.toLowerCase();
    return (
      user.name?.toLowerCase().includes(q) ||
      user.last_name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q)
    );
  });

  // Calcul des indices pour la pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Gestion du changement de page
  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  // Reset de la page quand la recherche change
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Rendu principal
  return (
    <div>
      <Header />
      <Box sx={{
        marginLeft: `${marginLeft}px`,
        p: 3,
        flexGrow: 1,
        transition: 'margin-left 0.2s',
        width: `calc(100% - ${marginLeft}px)`,
        minHeight: 'calc(100vh - 64px)',
        overflow: 'auto',
        background: isDarkMode ? '#1E2B45' : '#FFFFFF',
        color: isDarkMode ? '#F0F0F0' : '#333',
        mt: 8,
      }}>
        {/* Barre de recherche */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, width: '100%' }}>
          <Typography variant="h4" gutterBottom>Liste des utilisateurs</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                endAdornment: <SearchIcon />, sx: { background: isDarkMode ? '#2A354D' : '#fff', borderRadius: 2 }
              }}
              sx={{ minWidth: 250 }}
            />
          </Box>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} sx={{ background: isDarkMode ? '#2A354D' : '#FFFFFF' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={tableCellHeaderStyle}>Photo</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Prénom</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Nom</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Email</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Privilège</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentUsers.map(user => (
                    <TableRow key={user.id} sx={{ backgroundColor: isDarkMode ? '#1E2B45' : 'inherit' }}>
                      <TableCell sx={tableCellStyle}>
                        <Avatar src={getPhotoSrc(user.photo_url)} alt={`${user.name} ${user.last_name}`} />
                      </TableCell>
                      <TableCell sx={tableCellStyle}>{user.name}</TableCell>
                      <TableCell sx={tableCellStyle}>{user.last_name}</TableCell>
                      <TableCell sx={tableCellStyle}>{user.email}</TableCell>
                      <TableCell sx={tableCellStyle}>
                        {getPrivilegeLabel(user.privilege)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {currentUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={tableCellStyle}>
                        Aucun utilisateur trouvé.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack spacing={2} sx={{ mt: 2, alignItems: 'center' }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Stack>
          </>
        )}
      </Box>
    </div>
  );
};

export default UserList;