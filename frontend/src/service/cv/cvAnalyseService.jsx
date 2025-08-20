// cvAnalyseService.jsx
// Service pour l'analyse de CV (upload PDF)

import { buildApiUrl, API_ENDPOINTS } from '../../config/api';

/**
 * Analyse un CV PDF en l'envoyant à l'API backend.
 */
export async function analyseCv(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(buildApiUrl(API_ENDPOINTS.ANALYSE_CV), {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error("Erreur lors de l'analyse du CV");
  return await response.json();
}

/**
 * Récupère toutes les offres d'emploi disponibles.
 */
export async function getAllOffers() {
  const response = await fetch(buildApiUrl(API_ENDPOINTS.ALL_OFFERS));
  if (!response.ok) throw new Error("Erreur lors du chargement des offres");
  return await response.json();
}

/**
 * Récupère toutes les langues disponibles.
 */
export async function getAllLanguages() {
  const response = await fetch(buildApiUrl('/analyse/langues/all'));
  if (!response.ok) throw new Error("Erreur lors du chargement des langues");
  return await response.json();
} 