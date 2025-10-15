import supabase from '../config/db.js';

/**
 * Génère automatiquement le prochain numéro d'immatriculation
 * @param {string} departementId - Code du département (ex: '4')
 * @param {string} typeVehicule - Type du véhicule (ex: 'TAXI')
 * @returns {Promise<string>} immatriculation générée
 */
export const generateNextImmatriculation = async (departementId, typeVehicule = 'TAXI') => {
  if (!departementId) throw new Error('Le code du département est obligatoire');

  // 1️⃣ Récupère la séquence existante pour ce département et type
  let { data: sequence, error: seqError } = await supabase
    .from('sequences_immatriculations')
    .select('*')
    .eq('departement_id', departementId)
    .eq('type_vehicule', typeVehicule)
    .single();

  if (seqError && seqError.code !== 'PGRST116') throw seqError; // PGRST116 = pas trouvé

  let nextSequence = 1;
  let nextSerie = 'A';

  if (sequence) {
    nextSequence = sequence.last_sequence + 1;
    nextSerie = sequence.last_serie;

    // Si on dépasse 999, réinitialise séquence et passe à la lettre suivante
    if (nextSequence > 999) {
      nextSequence = 1;
      nextSerie = String.fromCharCode(sequence.last_serie.charCodeAt(0) + 1);
      if (nextSerie > 'Z') nextSerie = 'A'; // reboucle après Z
    }

    // Met à jour la table avec la nouvelle séquence
    const { error: updateError } = await supabase
      .from('sequences_immatriculations')
      .update({ last_sequence: nextSequence, last_serie: nextSerie })
      .eq('departement_id', departementId)
      .eq('type_vehicule', typeVehicule);

    if (updateError) throw updateError;

  } else {
    // Si pas de séquence existante, on la crée
    const { error: insertError } = await supabase
      .from('sequences_immatriculations')
      .insert([{ departement_id: departementId, type_vehicule: typeVehicule, last_sequence: 1, last_serie: 'A' }]);

    if (insertError) throw insertError;
  }

  // Formate le numéro : TAXI 001 A4
  const seqFormatted = String(nextSequence).padStart(3, '0');
  return `${typeVehicule} ${seqFormatted} ${nextSerie}${departementId}`;
};
