// CvAnalyse.jsx
// Composant d'analyse de CV (upload PDF, affichage résultats, UX optimisée)
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper, Button, CircularProgress, Grid, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination } from '@mui/material';
import { FaFilePdf, FaTimes } from 'react-icons/fa';
import { useTheme } from '../context/themeContext';
import Header from './Header';
import { analyseCv, getAllOffers } from '../service/cv/cvAnalyseService';
import DescriptionIcon from '@mui/icons-material/Description';

/**
 * Composant principal pour l'analyse de CV (upload PDF, affichage des résultats d'analyse)
 */
const CvAnalyse = ({ collapsed }) => {
  // États principaux
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [allOffers, setAllOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const { isDarkMode } = useTheme();
  const marginLeft = collapsed ? 90 : 270;
  const [showAllExperiences, setShowAllExperiences] = useState(false);
  
  // États pour la pagination des offres correspondantes
  const [currentPage, setCurrentPage] = useState(1);
  const [offersPerPage] = useState(5);
  
  // États pour la pagination de toutes les offres
  const [currentAllOffersPage, setCurrentAllOffersPage] = useState(1);
  const [allOffersPerPage] = useState(10);

  // Charger toutes les offres d'emploi au montage du composant
  useEffect(() => {
    const loadAllOffers = async () => {
      try {
        console.log("DEBUG: Chargement des offres depuis l'API");
        const data = await getAllOffers();
        console.log("DEBUG: Offres reçues:", data.length);
        setAllOffers(data);
      } catch (err) {
        console.error("Erreur lors du chargement des offres:", err);
        setAllOffers([]);
      } finally {
        setLoadingOffers(false);
      }
    };

    loadAllOffers();
  }, []);

  // Gestion du drag & drop de fichiers
  const onDrop = useCallback((acceptedFiles) => {
    setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    setResult(null);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  });

  // Supprime un fichier sélectionné
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Lance l'analyse du CV
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCurrentPage(1); // Reset à la première page
    try {
      const data = await analyseCv(selectedFiles[0]);
      console.log("Données reçues du backend:", data); // Debug
      console.log("Expériences:", data.experiences); // Debug
      console.log("Offres correspondantes:", data.matches); // Debug
      setResult(data);
    } catch (err) {
      console.error("Erreur lors de l'analyse:", err); // Debug
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  // Calculs pour la pagination
  const indexOfLastOffer = currentPage * offersPerPage;
  const indexOfFirstOffer = indexOfLastOffer - offersPerPage;
  const currentOffers = result?.matches ? 
    result.matches
      .sort((a, b) => b.global_score - a.global_score)
      .slice(indexOfFirstOffer, indexOfLastOffer) : [];
  const totalPages = result?.matches ? Math.ceil(result.matches.length / offersPerPage) : 0;

  // Gestion du changement de page
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };
  
  // Calculs pour la pagination de toutes les offres
  const indexOfLastAllOffer = currentAllOffersPage * allOffersPerPage;
  const indexOfFirstAllOffer = indexOfLastAllOffer - allOffersPerPage;
  const currentAllOffers = allOffers.slice(indexOfFirstAllOffer, indexOfLastAllOffer);
  const totalAllOffersPages = Math.ceil(allOffers.length / allOffersPerPage);

  // Gestion du changement de page pour toutes les offres
  const handleAllOffersPageChange = (event, value) => {
    setCurrentAllOffersPage(value);
  };

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
        minHeight: 'calc(100vh - 64px - 64px)',
        overflow: 'auto',
        background: isDarkMode ? '#1E2B45' : '#fff',
        color: isDarkMode ? '#F0F0F0' : '#333',
      }}>
       <Box display="flex" alignItems="center" mb={3}>
        <DescriptionIcon sx={{ mr: 2, color: 'primary.main', fontSize: 40 }} />
        <Typography variant="h4" color="primary">
          Analyse intelligente de CV
        </Typography>
      </Box>

        {/* Zone de drop et sélection de fichier */}
        <Paper sx={{ p: 3, mb: 3, background: isDarkMode ? '#2A354D' : '#fff', color: isDarkMode ? '#F0F0F0' : '#333' }}>
          <Typography variant="h6" gutterBottom sx={{ color: isDarkMode ? '#F0F0F0' : '#333', mb: 2 }}>
            Analysez votre CV pour trouver les offres correspondantes
          </Typography>
          <Box
            {...getRootProps()} 
            sx={{ 
              border: '2px dashed', 
              borderColor: isDragActive ? 'primary.main' : (isDarkMode ? '#404B60' : 'grey.300'),
              borderRadius: 1,
              p: 3,
              mb: selectedFiles.length > 0 ? 2 : 0,
              textAlign: 'center',
              backgroundColor: isDragActive ? 'action.hover' : (isDarkMode ? '#2A354D' : 'background.paper'),
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: isDragActive ? 'action.hover' : (isDarkMode ? '#404B60' : 'action.hover')
              }
            }}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <Typography sx={{ color: isDarkMode ? '#F0F0F0' : '#333' }}>Déposez le fichier ici...</Typography>
            ) : (
              <Typography sx={{ color: isDarkMode ? '#F0F0F0' : '#333' }}>
                Glissez-déposez un fichier PDF ici ou cliquez pour sélectionner
              </Typography>
            )}
          </Box>

          {/* Affichage du fichier sélectionné */}
          {selectedFiles.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: isDarkMode ? '#F0F0F0' : '#333' }}>
                Fichier sélectionné :
              </Typography>
              <Paper
                sx={{
                  p: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isDarkMode ? '#2A354D' : '#fff',
                  color: isDarkMode ? '#F0F0F0' : '#333',
                  border: `1px solid ${isDarkMode ? '#404B60' : '#eee'}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FaFilePdf className="text-red-600" size={22} />
                  <Typography variant="body2" noWrap sx={{ color: isDarkMode ? '#F0F0F0' : '#333' }}>
                    {selectedFiles[0].name}
                  </Typography>
                </Box>
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={() => removeFile(0)}
                  sx={{ color: isDarkMode ? '#F0F0F0' : 'error.main' }}
                >
                  <FaTimes />
                </IconButton>
              </Paper>
            </Box>
          )}

          {/* Bouton d'analyse */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: selectedFiles.length > 0 ? 2 : 0 }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleUpload}
              disabled={loading || selectedFiles.length === 0}
              sx={{
                bgcolor: isDarkMode ? '#404B60' : '#1976d2',
                color: isDarkMode ? '#F0F0F0' : '#fff',
                '&:hover': {
                  bgcolor: isDarkMode ? '#555' : '#1565c0',
                },
              }}
            >
              Analyser le CV
            </Button>
          </Box>
        </Paper>

        {/* Loader */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress size={50} sx={{ color: isDarkMode ? '#F0F0F0' : '#1976d2' }} />
          </Box>
        )}

        {/* Affichage erreur */}
        {error && (
          <Box sx={{ color: 'red', mt: 2, textAlign: 'center' }}>{error}</Box>
        )}

        {/* Résultats d'analyse */}
        {result && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ color: isDarkMode ? '#F0F0F0' : '#333' }}>
              Résultats d'analyse
            </Typography>
            <Grid container spacing={3} alignItems="stretch" direction="column">
              {/* Compétences */}
              <Grid item xs={12} sx={{ display: 'flex' }}>
                <Paper sx={{ p: 2, background: isDarkMode ? '#2A354D' : '#fff', flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}><b>Compétences détectées</b></Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {result.competences && result.competences.map((c, i) => (
                      <Paper key={i} sx={{ p: 0.5, px: 1, m: 0.2, bgcolor: '#e3f2fd', fontSize: 13 }}>{c}</Paper>
                    ))}
                  </Box>
                </Paper>
              </Grid>
              {/* Expériences */}
              <Grid item xs={12} sx={{ display: 'flex' }}>
                <Paper sx={{ p: 2, background: isDarkMode ? '#2A354D' : '#fff', flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}><b>Expériences</b></Typography>
                  {result.experiences && (
                    <>
                                             <ul style={{ marginBottom: 16 }}>
                         {(showAllExperiences ? result.experiences : result.experiences.slice(0, 3))
                           .filter(exp => {
                             // Filtrer la phrase spécifique
                             if (exp.includes("o Gathered requirements and designed system architecture.")) {
                               return false;
                             }
                             
                             // Filtrer les patterns de listes de technologies/langues
                             const expLower = exp.toLowerCase();
                             const patternsToFilter = [
                               'technologies:', 'technology:', 'tech:',
                               'database administration:', 'db administration:',
                               'web frameworks:', 'frameworks:',
                               'devops tools:', 'tools:',
                               'data tools:', 'data:',
                               'languages:', 'langues:', 'lang:',
                               'english:', 'french:', 'arabic:',
                               'skills:', 'compétences:',
                               'softwares:', 'software:',
                               'platforms:', 'platform:',
                               'libraries:', 'library:',
                               'apis:', 'api:',
                               'databases:', 'database:',
                               'servers:', 'server:',
                               'cloud:', 'clouds:',
                               'os:', 'operating system:',
                               'methodologies:', 'methodology:',
                               'protocols:', 'protocol:',
                               'standards:', 'standard:'
                             ];
                             
                             // Vérifier si c'est un pattern de liste
                             const isListPattern = patternsToFilter.some(pattern => expLower.includes(pattern));
                             
                             // Vérifier si c'est une liste avec beaucoup de virgules
                             const commaCount = (exp.match(/,/g) || []).length;
                             const isLikelyList = commaCount >= 3 && exp.split(',').length >= 4;
                             
                             // Vérifier si c'est une liste de langues avec tirets
                             const dashCount = (exp.match(/[—-]/g) || []).length;
                             const isLanguageList = dashCount >= 2 && ['english', 'french', 'arabic', 'spanish', 'german', 'italian'].some(lang => expLower.includes(lang));
                             
                             return !isListPattern && !isLikelyList && !isLanguageList;
                           })
                           .map((exp, i) => {
                             // Nettoyer la phrase pour l'affichage
                             let cleanExp = exp.replace(/^([*+])\s*/, '').replace(/^o\s+/, '');
                             // S'assurer qu'il n'y a pas de point-virgule restant
                             cleanExp = cleanExp.replace(/;\s*$/, '');
                             return <li key={i}>{cleanExp}</li>;
                           })}
                       </ul>
                      {result.experiences.length > 3 && (
                        <Button
                          size="small"
                          onClick={() => setShowAllExperiences(v => !v)}
                          sx={{ textTransform: 'none', mb: 2 }}
                        >
                          {showAllExperiences ? 'Voir moins' : `Voir plus (${result.experiences.length - 3} de plus)`}
                        </Button>
                      )}
                    </>
                  )}
                </Paper>
              </Grid>
              {/* Pays détectés */}
              <Grid item xs={12} sx={{ display: 'flex' }}>
                <Paper sx={{ p: 2, background: isDarkMode ? '#2A354D' : '#fff', flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}><b>Pays détectés</b></Typography>
                  <Typography sx={{ mb: 2 }}>{result.pays && result.pays.join(", ")}</Typography>
                </Paper>
              </Grid>
                             {/* Durée d'expérience */}
               <Grid item xs={12} sx={{ display: 'flex' }}>
                 <Paper sx={{ p: 2, background: isDarkMode ? '#2A354D' : '#fff', flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                   <Typography variant="subtitle1" sx={{ mb: 1 }}><b>Durée d'expérience</b></Typography>
                   
                   {/* Détails des expériences */}
                   {result.duree_experience_details && result.duree_experience_details.length > 0 && (
                     <Box sx={{ mb: 2 }}>
                       <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold', color: isDarkMode ? '#F0F0F0' : '#333' }}>
                         Détails des périodes :
                       </Typography>
                       {result.duree_experience_details.map((detail, index) => (
                         <Box key={index} sx={{ 
                           mb: 1, 
                           p: 1, 
                           border: `1px solid ${isDarkMode ? '#404B60' : '#e0e0e0'}`, 
                           borderRadius: 1,
                           backgroundColor: isDarkMode ? '#1E2B45' : '#f9f9f9'
                         }}>
                           <Typography variant="body2" sx={{ 
                             color: isDarkMode ? '#F0F0F0' : '#333',
                             fontSize: '0.9rem',
                             mb: 0.5
                           }}>
                             <strong>Période {index + 1}:</strong> {detail.start_date} - {detail.end_date}
                           </Typography>
                           <Typography variant="body2" sx={{ 
                             color: isDarkMode ? '#888' : '#666',
                             fontSize: '0.8rem',
                             fontStyle: 'italic'
                           }}>
                             Durée: {detail.duration}
                           </Typography>
                           <Typography variant="body2" sx={{ 
                             color: isDarkMode ? '#888' : '#666',
                             fontSize: '0.8rem',
                             fontStyle: 'italic'
                           }}>
                             Ligne: {detail.line}
                           </Typography>
                         </Box>
                       ))}
                     </Box>
                   )}
                   
                   {/* Total */}
                   <Box sx={{ 
                     p: 1.5, 
                     backgroundColor: isDarkMode ? '#404B60' : '#e3f2fd', 
                     borderRadius: 1,
                     border: `2px solid ${isDarkMode ? '#1976d2' : '#1976d2'}`
                   }}>
                     <Typography variant="body1" sx={{ 
                       fontWeight: 'bold',
                       color: isDarkMode ? '#F0F0F0' : '#1976d2',
                       textAlign: 'center'
                     }}>
                       Total: {result.duree_experience}
                     </Typography>
                   </Box>
                 </Paper>
               </Grid>
              {/* Offres correspondantes */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, background: isDarkMode ? '#2A354D' : '#fff' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    <b>Offres correspondantes ({result.matches?.length || 0})</b>
                  </Typography>
                  {result.matches && result.matches.length > 0 ? (
                    <>
                      <TableContainer component={Paper} sx={{ background: isDarkMode ? '#2A354D' : '#FFFFFF' }}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{
                                backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                                color: isDarkMode ? '#FFFFFF' : '#000000',
                                fontWeight: 'bold',
                              }}>N°</TableCell>
                              <TableCell sx={{
                                backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                                color: isDarkMode ? '#FFFFFF' : '#000000',
                                fontWeight: 'bold',
                              }}>Titre</TableCell>
                              <TableCell sx={{
                                backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                                color: isDarkMode ? '#FFFFFF' : '#000000',
                                fontWeight: 'bold',
                              }}>Société</TableCell>
                              <TableCell sx={{
                                backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                                color: isDarkMode ? '#FFFFFF' : '#000000',
                                fontWeight: 'bold',
                              }}>Ville</TableCell>
                              
                              <TableCell sx={{
                                backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                                color: isDarkMode ? '#FFFFFF' : '#000000',
                                fontWeight: 'bold',
                              }}>Salaire</TableCell>
                                                             <TableCell sx={{
                                 backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                                 color: isDarkMode ? '#FFFFFF' : '#000000',
                                 fontWeight: 'bold',
                               }}>Compétences communes</TableCell>
                               <TableCell sx={{
                                 backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                                 color: isDarkMode ? '#FFFFFF' : '#000000',
                                 fontWeight: 'bold',
                               }}>Score</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                                                         {currentOffers.map((m, i) => {
                               const offre = m.offre;
                               // Formater le salaire
                               const minSalaire = offre.minSalaire || 0;
                               const maxSalaire = offre.maxSalaire || 0;
                               const devise = offre.deviseSalaire || '';
                               const salaire = minSalaire && maxSalaire ? `${minSalaire} - ${maxSalaire} ${devise}` : 'Non spécifié';
                               
                               // Formater le score en pourcentage
                               const scorePercentage = Math.round(m.global_score * 100);
                               
                                                               // Utiliser les compétences communes déjà calculées par le backend
                                const competencesCommunes = m.matching_skills || [];
                                
                                // Debug: afficher les informations pour vérification
                                console.log('Compétences communes du backend:', competencesCommunes);
                                console.log('Match object:', m);
                               
                               return (
                                 <TableRow key={i} sx={{ 
                                   '&:hover': { 
                                     backgroundColor: isDarkMode ? '#404B60' : '#f5f5f5' 
                                   } 
                                 }}>
                                   <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                                     {indexOfFirstOffer + i + 1}
                                   </TableCell>
                                   <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000', fontWeight: 'bold' }}>{offre.titre}</TableCell>
                                   <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>{offre.societe}</TableCell>
                                   <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>{offre.lieuSociete || offre.ville}</TableCell>
                                   <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>{salaire}</TableCell>
                                   <TableCell>
                                     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                       {competencesCommunes.length > 0 ? (
                                         competencesCommunes.map((comp, idx) => (
                                           <Paper key={idx} sx={{ 
                                             px: 1, 
                                             py: 0.2, 
                                             bgcolor: '#4caf50', 
                                             color: 'white',
                                             fontSize: 11, 
                                             m: 0 
                                           }}>
                                             {comp}
                                           </Paper>
                                         ))
                                       ) : (
                                         <Typography variant="body2" sx={{ 
                                           color: isDarkMode ? '#888' : '#666',
                                           fontStyle: 'italic'
                                         }}>
                                           Aucune compétence commune
                                         </Typography>
                                       )}
                                     </Box>
                                   </TableCell>
                                   <TableCell sx={{ 
                                     color: scorePercentage >= 80 ? '#4caf50' : 
                                            scorePercentage >= 60 ? '#ff9800' : '#f44336',
                                     fontWeight: 'bold'
                                   }}>
                                     {scorePercentage}%
                                   </TableCell>
                                 </TableRow>
                               );
                             })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                          <Pagination
                            count={totalPages}
                            page={currentPage}
                            onChange={handlePageChange}
                            color="primary"
                            size="small"
                            sx={{
                              '& .MuiPaginationItem-root': {
                                color: isDarkMode ? '#F0F0F0' : '#333',
                                backgroundColor: isDarkMode ? '#2A354D' : '#fff',
                                '&:hover': {
                                  backgroundColor: isDarkMode ? '#404B60' : '#f5f5f5'
                                },
                                '&.Mui-selected': {
                                  backgroundColor: isDarkMode ? '#1976d2' : '#1976d2',
                                  color: '#fff'
                                }
                              }
                            }}
                          />
                        </Box>
                      )}
                      
                      {/* Informations de pagination */}
                      <Box sx={{ mt: 1, textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ color: isDarkMode ? '#F0F0F0' : '#333' }}>
                          Affichage {indexOfFirstOffer + 1}-{Math.min(indexOfLastOffer, result.matches.length)} sur {result.matches.length} offres
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <Typography sx={{ mt: 2, color: isDarkMode ? '#F0F0F0' : '#333' }}>Aucune offre ne correspond au seuil.</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Section : Toutes les offres disponibles - Affichée seulement si pas d'analyse terminée */}
        {!result && (
          <Paper sx={{ p: 3, mb: 3, background: isDarkMode ? '#2A354D' : '#fff', color: isDarkMode ? '#F0F0F0' : '#333' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h5" sx={{ color: isDarkMode ? '#F0F0F0' : '#333' }}>
                Toutes les offres d'emploi disponibles ({allOffers.length})
              </Typography>
            </Box>
            
            {loadingOffers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={40} sx={{ color: isDarkMode ? '#F0F0F0' : '#1976d2' }} />
              </Box>
            ) : (
              <>
                <TableContainer component={Paper} sx={{ background: isDarkMode ? '#2A354D' : '#FFFFFF' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{
                          backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                          color: isDarkMode ? '#FFFFFF' : '#000000',
                          fontWeight: 'bold',
                        }}>N°</TableCell>
                        <TableCell sx={{
                          backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                          color: isDarkMode ? '#FFFFFF' : '#000000',
                          fontWeight: 'bold',
                        }}>Titre</TableCell>
                        <TableCell sx={{
                          backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                          color: isDarkMode ? '#FFFFFF' : '#000000',
                          fontWeight: 'bold',
                        }}>Société</TableCell>
                        <TableCell sx={{
                          backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                          color: isDarkMode ? '#FFFFFF' : '#000000',
                          fontWeight: 'bold',
                        }}>Ville</TableCell>
                        <TableCell sx={{
                          backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                          color: isDarkMode ? '#FFFFFF' : '#000000',
                          fontWeight: 'bold',
                        }}>Salaire</TableCell>
                        <TableCell sx={{
                          backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                          color: isDarkMode ? '#FFFFFF' : '#000000',
                          fontWeight: 'bold',
                        }}>Type</TableCell>
                        <TableCell sx={{
                          backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                          color: isDarkMode ? '#FFFFFF' : '#000000',
                          fontWeight: 'bold',
                        }}>Expérience</TableCell>
                        <TableCell sx={{
                          backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                          color: isDarkMode ? '#FFFFFF' : '#000000',
                          fontWeight: 'bold',
                        }}>Compétences</TableCell>
                        <TableCell sx={{
                          backgroundColor: isDarkMode ? '#3E4A5B' : '#F4F6F8',
                          color: isDarkMode ? '#FFFFFF' : '#000000',
                          fontWeight: 'bold',
                        }}>Langues</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentAllOffers.map((offer, index) => (
                        <TableRow key={offer.id || index} sx={{ 
                          '&:hover': { 
                            backgroundColor: isDarkMode ? '#404B60' : '#f5f5f5' 
                          } 
                        }}>
                          <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>{indexOfFirstAllOffer + index + 1}</TableCell>
                          <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000', fontWeight: 'bold' }}>{offer.titre}</TableCell>
                          <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>{offer.societe}</TableCell>
                          <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>{offer.ville}</TableCell>
                          <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>{offer.salaire}</TableCell>
                          <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>{offer.typeContrat}</TableCell>
                          <TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>{offer.experience}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {offer.competences && offer.competences.map((comp, idx) => (
                                <Paper key={idx} sx={{ px: 1, py: 0.2, bgcolor: '#e3f2fd', fontSize: 12, m: 0 }}>{comp.trim()}</Paper>
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {offer.langues && offer.langues.map((lang, idx) => (
                                <Paper key={idx} sx={{ px: 1, py: 0.2, bgcolor: '#ffe0b2', fontSize: 12, m: 0 }}>{lang}</Paper>
                              ))}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Pagination pour toutes les offres */}
                {totalAllOffersPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination
                      count={totalAllOffersPages}
                      page={currentAllOffersPage}
                      onChange={handleAllOffersPageChange}
                      color="primary"
                      size="small"
                      sx={{
                        '& .MuiPaginationItem-root': {
                          color: isDarkMode ? '#F0F0F0' : '#333',
                          backgroundColor: isDarkMode ? '#2A354D' : '#fff',
                          '&:hover': {
                            backgroundColor: isDarkMode ? '#404B60' : '#f5f5f5'
                          },
                          '&.Mui-selected': {
                            backgroundColor: isDarkMode ? '#1976d2' : '#1976d2',
                            color: '#fff'
                          }
                        }
                      }}
                    />
                  </Box>
                )}
                
                {/* Informations de pagination pour toutes les offres */}
                <Box sx={{ mt: 1, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: isDarkMode ? '#F0F0F0' : '#333' }}>
                    Affichage {indexOfFirstAllOffer + 1}-{Math.min(indexOfLastAllOffer, allOffers.length)} sur {allOffers.length} offres
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        )}
      </main>
    </div>
  );
};

export default CvAnalyse; 