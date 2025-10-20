import supabase from '../config/db.js';

// Middleware ou vérif simple du partenaire
const checkPartner = (apiToken) => {
  // Ici tu peux vérifier dans une table "partenaires"
  // pour l'instant juste test simple
  return apiToken && apiToken.startsWith('uuid');
};

// ---------------- Certifie une facture ----------------
export const verifCaisse = async (req, res) => {
  try {
    const { uuid } = req.params;
    const apiToken = req.headers['api-token'];

    if (!checkPartner(apiToken)) {
      return res.status(401).json({ message: 'API-TOKEN invalide' });
    }

    // Exemple de certification
    const { data: existing, error: selectError } = await supabase
      .from('paiement')
      .select('*')
      .eq('reference', uuid)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    let paiement;
    if (!existing) {
      // Création du paiement
      const { data, error: insertError } = await supabase
        .from('paiement')
        .insert([{
          reference: uuid,
          statut: 'certifie',
          user_id: apiToken,  // on garde le token comme référence partenaire
          date_creation: new Date()
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      paiement = data;
    } else {
      // Mise à jour si existant
      const { data, error: updateError } = await supabase
        .from('paiement')
        .update({ statut: 'certifie', date_creation: new Date() })
        .eq('reference', uuid)
        .select()
        .single();

      if (updateError) throw updateError;
      paiement = data;
    }

    res.json({ message: 'Paiement certifié', paiement });

  } catch (err) {
    console.error('Erreur verifCaisse:', err);
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

// ---------------- Récupère les infos d'une facture ----------------
export const infoCaisse = async (req, res) => {
  try {
    const { uuid } = req.params;
    const apiToken = req.headers['api-token'];

    if (!checkPartner(apiToken)) {
      return res.status(401).json({ message: 'API-TOKEN invalide' });
    }

    const { data, error } = await supabase
      .from('paiement')
      .select('*')
      .eq('reference', uuid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Paiement non trouvé' });
      }
      throw error;
    }

    res.json({ message: 'Infos paiement', paiement: data });

  } catch (err) {
    console.error('Erreur infoCaisse:', err);
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};



