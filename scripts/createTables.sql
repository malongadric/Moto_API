-- ==============================
-- 1️⃣ Table departements
-- ==============================
CREATE TABLE IF NOT EXISTS departements (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    code INT UNIQUE NOT NULL,
    dd_id INT -- Directeur Départemental actuel
);

-- ==============================
-- 2️ Table utilisateurs
-- ==============================
CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    profil VARCHAR(50) CHECK (profil = ANY (ARRAY[
        'directeur departemental','agent','agent_saisie','admin','SD','super_directeur'
    ])),
    departement_id INT REFERENCES departements(id) ON DELETE SET NULL,
    actif BOOLEAN DEFAULT TRUE,
    cree_le TIMESTAMP DEFAULT NOW()
);

-- ==============================
-- 3️⃣ Table structures
-- ==============================
CREATE TABLE IF NOT EXISTS structures (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    adresse VARCHAR(255),
    telephone VARCHAR(50),
    email VARCHAR(100),
    departement_id INT REFERENCES departements(id) ON DELETE CASCADE
);

-- ==============================
-- 4️⃣ Table proprietaires
-- ==============================
CREATE TABLE IF NOT EXISTS proprietaires (
    id SERIAL PRIMARY KEY,
    acteur_type VARCHAR(20) NOT NULL DEFAULT 'proprietaire',
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100),
    telephone VARCHAR(50) UNIQUE,
    profession VARCHAR(100),
    email VARCHAR(100),
    nationalite VARCHAR(50),
    ville VARCHAR(100),
    adresse VARCHAR(255),
    cni VARCHAR(50) UNIQUE,
    date_naissance DATE,
    departement_id INT REFERENCES departements(id) ON DELETE SET NULL,
    cree_par INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    moto_id INT REFERENCES motos(id) ON DELETE SET NULL,
    date_saisie TIMESTAMP DEFAULT NOW(),
    date_maj TIMESTAMP
);

-- ==============================
-- 5️⃣ Table motos
-- ==============================
CREATE TABLE IF NOT EXISTS motos (
    id SERIAL PRIMARY KEY,
    numero_chassis VARCHAR(17) UNIQUE NOT NULL,
    marque VARCHAR(100),
    modele VARCHAR(100),
    type VARCHAR(100),
    reference_moteur VARCHAR(100),
    etat VARCHAR(50),
    poids_vide FLOAT,
    couleur VARCHAR(50),
    nombre_places INT,
    cylindree VARCHAR(50),
    puissance_moteur VARCHAR(50),
    charge_utile VARCHAR(50),
    date_fabrication DATE,
    premiere_mise_circulation DATE,
    usage VARCHAR(50),
    carrosserie VARCHAR(50),
    type_moteur VARCHAR(50),
    puissance_admin VARCHAR(50),
    poids_charge_autorisee VARCHAR(50),
    energie VARCHAR(50),
    boite_vitesse VARCHAR(50),
    serie_immatriculation VARCHAR(50),
    proprietaire_id INT REFERENCES proprietaires(id) ON DELETE SET NULL,
    mandataire_id INT REFERENCES proprietaires(id) ON DELETE SET NULL,
    departement_id INT REFERENCES departements(id) ON DELETE SET NULL,
    structure_id INT REFERENCES structures(id) ON DELETE SET NULL,
    cree_par INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    notification_admin BOOLEAN DEFAULT FALSE,
    notification_dd BOOLEAN DEFAULT FALSE,
    notification_sd BOOLEAN DEFAULT FALSE,
    date_saisie TIMESTAMP DEFAULT NOW(),
    date_maj TIMESTAMP
);

-- ==============================
-- 6️⃣ Table mandataires
-- ==============================
CREATE TABLE IF NOT EXISTS mandataires (
    id SERIAL PRIMARY KEY,
    acteur_type VARCHAR(20) NOT NULL DEFAULT 'mandataire',
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100),
    telephone VARCHAR(50),
    email VARCHAR(100),
    profession VARCHAR(100),
    nationalite VARCHAR(50),
    ville VARCHAR(100),
    adresse VARCHAR(255),
    cni VARCHAR(50),
    date_naissance DATE,
    lien_proprietaire VARCHAR(50),
    moto_id INT REFERENCES motos(id) ON DELETE CASCADE,
    proprietaire_id INT REFERENCES proprietaires(id) ON DELETE SET NULL,
    date_enregistrement TIMESTAMP DEFAULT NOW()
);

-- ==============================
-- 7️⃣ Table immatriculations
-- ==============================
CREATE TABLE IF NOT EXISTS immatriculations (
    id SERIAL PRIMARY KEY,
    moto_id INT UNIQUE REFERENCES motos(id) ON DELETE CASCADE,
    numero_immatriculation VARCHAR(50) UNIQUE NOT NULL,
    numero_immatriculation_def VARCHAR(50),
    date_immatriculation TIMESTAMP DEFAULT NOW(),
    attribue_par INT REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- ==============================
-- 8️⃣ Table operations
-- ==============================
CREATE TABLE IF NOT EXISTS historique_journalier (
    id SERIAL PRIMARY KEY,
    moto_id INT REFERENCES motos(id) ON DELETE CASCADE,
    type_operation VARCHAR(50) CHECK (type_operation IN ('saisie','immatriculation','mutation','maj')),
    description TEXT,
    utilisateur_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    date_operation TIMESTAMP DEFAULT NOW()
);

-- ==============================
-- 9️⃣ Table mutations
-- ==============================
CREATE TABLE IF NOT EXISTS mutations (
    id SERIAL PRIMARY KEY,
    moto_id INT REFERENCES motos(id) ON DELETE CASCADE,
    ancien_departement_id INT REFERENCES departements(id) ON DELETE SET NULL,
    nouveau_departement_id INT REFERENCES departements(id) ON DELETE SET NULL,
    ancien_proprietaire_id INT REFERENCES proprietaires(id) ON DELETE SET NULL,
    nouveau_proprietaire_id INT REFERENCES proprietaires(id) ON DELETE SET NULL,
    ancien_dd_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    nouveau_dd_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    ancien_agent_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    nouveau_agent_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    date_mutation TIMESTAMP DEFAULT NOW(),
    effectue_par INT REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- ==============================
-- 🔟 Table dossier
-- ==============================
CREATE TABLE IF NOT EXISTS dossier (
    dossier_id SERIAL PRIMARY KEY,
    moto_id INT NOT NULL REFERENCES motos(id) ON DELETE CASCADE,
    acteur_id INT,
    acteur_type VARCHAR(20) CHECK (acteur_type IN ('proprietaire','mandataire')) NOT NULL,
    immatriculation_prov VARCHAR(20),
    immatriculation_def VARCHAR(20),
    statut VARCHAR(20) CHECK (statut IN ('en_attente_paiement','en_attente_admin','provisoire','final','en_erreur')) DEFAULT 'en_attente_paiement',
    date_soumission TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_attribution TIMESTAMP,
    date_validation_dd TIMESTAMP,
    attribue_par INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    agent_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- ==============================
-- 1️⃣1️⃣ Table paiement
-- ==============================
CREATE TABLE IF NOT EXISTS paiement (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(100) NOT NULL UNIQUE,
    dossier_id INT REFERENCES dossier(dossier_id) ON DELETE CASCADE,
    statut VARCHAR(20) CHECK(statut IN ('en_attente','payé','annulé')) DEFAULT 'en_attente',
    user_id UUID,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sequences_immatriculations (
    departement_id VARCHAR PRIMARY KEY,
    type_vehicule VARCHAR NOT NULL,
    last_sequence INT NOT NULL DEFAULT 0,
    last_serie CHAR(1) NOT NULL DEFAULT 'A'
);

-- ==============================
-- Indexes pour performance
-- ==============================
CREATE INDEX idx_motos_chassis ON motos(numero_chassis);
CREATE INDEX idx_dossier_statut ON dossier(statut);
CREATE INDEX idx_dossier_moto_id ON dossier(moto_id);
CREATE INDEX idx_immatriculations_moto ON immatriculations(moto_id);
CREATE INDEX idx_operations_moto ON operations(moto_id);
CREATE INDEX idx_mutations_moto ON mutations(moto_id);
CREATE INDEX idx_mandataires_moto ON mandataires(moto_id);
CREATE INDEX idx_paiement_dossier ON paiement(dossier_id);
CREATE INDEX idx_paiement_dossier ON proprietaire(dossier_id);
















-- git add .
-- git commit -m "mise à jour du backend"
-- git push
