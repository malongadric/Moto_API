// controllers/immatriculationController.js
import supabase from '../config/db.js';

/**
 * Attribue un numéro d'immatriculation à une moto
 * et met à jour le dossier correspondant
 */
export const attribuerNumero = async (req, res) => {
  try {
    const { motoId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.profil;
    const departementId = req.user.departement_id;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Vous n’avez pas le droit d’attribuer un numéro.' });
    }

    // 1️⃣ Vérifie si la moto existe
    const { data: moto, error: motoError } = await supabase
      .from('motos')
      .select('*, dossier_id')
      .eq('id', motoId)
      .single();

    if (motoError || !moto) {
      return res.status(404).json({ message: 'Moto introuvable.' });
    }

    // 2️⃣ Vérifie si la moto a déjà un numéro
    const { data: existing } = await supabase
      .from('immatriculations')
      .select('id')
      .eq('moto_id', motoId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'Cette moto a déjà un numéro d’immatriculation.' });
    }

    const typeVehicule = 'TAXI';

    // Récupère la séquence pour ce département et type
    let { data: sequenceData, error: seqError } = await supabase
      .from('sequences_immatriculations')
      .select('*')
      .eq('departement_id', departementId)
      .eq('type_vehicule', typeVehicule)
      .single();

    if (seqError && seqError.code === 'PGRST116') {
      const { data: newSeq, error: newSeqError } = await supabase
        .from('sequences_immatriculations')
        .insert([{ departement_id: departementId, type_vehicule: typeVehicule, last_sequence: 0, last_serie: 'A' }])
        .select()
        .single();
      if (newSeqError) throw newSeqError;
      sequenceData = newSeq;
    } else if (seqError) throw seqError;

    //  Génère la prochaine immatriculation
    let nextSequence = sequenceData.last_sequence + 1;
    let nextSerie = sequenceData.last_serie;

    if (nextSequence > 999) {
      nextSequence = 1;
      nextSerie = String.fromCharCode(nextSerie.charCodeAt(0) + 1);
      if (nextSerie > 'Z') nextSerie = 'A';
    }

    const seqFormatted = String(nextSequence).padStart(3, '0');
    const numeroImmatriculation = `${typeVehicule} ${seqFormatted} ${nextSerie}${departementId}`;

    // 5️⃣ Met à jour la séquence
    const { error: updateSeqError } = await supabase
      .from('sequences_immatriculations')
      .update({ last_sequence: nextSequence, last_serie: nextSerie })
      .eq('departement_id', departementId)
      .eq('type_vehicule', typeVehicule);

    if (updateSeqError) throw updateSeqError;

    // 6️⃣ Insère dans la table immatriculations
    const { data: immatriculationData, error: insertError } = await supabase
      .from('immatriculations')
      .insert([{
        moto_id: motoId,
        numero_immatriculation: numeroImmatriculation,
        attribue_par: userId
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // 7️⃣ Met à jour le dossier lié à cette moto
    if (moto.dossier_id) {
      const { error: dossierError } = await supabase
        .from('dossiers')
        .update({ immatriculation_provisoire: numeroImmatriculation })
        .eq('id', moto.dossier_id);

      if (dossierError) console.error('Erreur mise à jour dossier:', dossierError);
    }

    // ✅ Résultat final
    res.status(201).json({
      message: 'Numéro attribué avec succès',
      numeroImmatriculation,
      immatriculation: immatriculationData
    });

  } catch (err) {
    console.error('Erreur attribuerNumero:', err);
    res.status(500).json({
      message: 'Erreur lors de l’attribution du numéro',
      erreur: err.message
    });
  }
};
