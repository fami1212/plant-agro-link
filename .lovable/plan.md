# Plan : KYC + Rebrand PlantErea + Auto-confirm email + Domaine plant-erea.com

## 1. Rebrand "Plantéra" → "PlantErea"
- Remplacer le logo `src/assets/plantera-icon.png` par le nouveau logo uploadé
- Chercher/remplacer toutes les occurrences de "Plantera", "Plantéra", "plantera" → "PlantErea" / "planterea" dans :
  - `index.html` (title, meta, manifest)
  - `public/manifest.json`
  - `capacitor.config.ts` (appName, appId → `com.planterea.app`)
  - `android/app/src/main/res/values/strings.xml`
  - Composants React qui affichent le nom
  - Traductions i18n (fr/en/wo)
  - README

## 2. KYC — Vérification & approbation admin

### Nouvelle table `kyc_verifications`
- `user_id`, `status` (`pending`|`submitted`|`approved`|`rejected`), `role_requested`
- `full_name`, `birth_date`, `id_type` (CNI/passport/permis), `id_number`
- `id_front_url`, `id_back_url`, `selfie_url` (bucket `kyc-documents` privé)
- `address`, `city`, `country`
- Rôle-spécifique : `farm_name`, `farm_location`, `farm_size_ha` (agriculteur) / `license_number`, `specialty` (vétérinaire) / `company_name`, `business_reg_number` (acheteur) / `investor_type`, `capital_range` (investisseur)
- `admin_notes`, `reviewed_by`, `reviewed_at`, `submitted_at`
- Bucket privé `kyc-documents` avec RLS (user upload / admin lecture)

### RLS
- User : select/insert/update ses propres KYC (uniquement si status `pending` ou `rejected`)
- Admin : full via `has_role`

### Hook `useKycStatus()`
Retourne `{ status, isApproved, loading }`.

### Composant `<KycGuard>`
Wrap les actions sensibles :
- Publier annonce, faire offre, payer, réserver vétérinaire, investir, publier projet, ajouter récolte, etc.
- Si non approuvé → dialog "Vérification requise" avec bouton "Compléter ma vérification" → `/kyc`

### Page `/kyc` (formulaire wizard 3 étapes)
1. Infos personnelles + adresse
2. Pièce d'identité (recto/verso) + selfie
3. Infos professionnelles (selon rôle) + soumission

### Bannière globale
Dans `AppLayout` : bandeau jaune si `status !== approved` avec CTA vers `/kyc`.

### Ce qui reste accessible sans KYC (lecture seule)
- Dashboard, profil, paramètres, communauté (lecture), e-learning, catalogue marketplace (browse), KYC page elle-même.

### Ce qui est BLOQUÉ tant que non approuvé
Toutes les actions d'écriture métier : créer annonce, acheter, offrir, investir, publier projet, réserver service, ajouter animal/culture/parcelle, envoyer message direct commercial.

## 3. Admin — gestion KYC
Nouveau composant `<AdminKycPanel />` intégré dans `/admin` :
- Liste des demandes (filtres : pending/submitted/approved/rejected + par rôle)
- Détail : photos pièces + selfie + infos + notes
- Actions : Approuver / Rejeter (avec note) / Demander compléments
- Compteur "en attente" visible

## 4. Auto-confirm email
- `supabase--configure_auth` : `auto_confirm_email: true`

## 5. Domaine plant-erea.com
- `capacitor.config.ts` : supprimer toute URL Lovable si présente, `appId: com.planterea.app`, `appName: PlantErea`, ajouter `server.url: https://plant-erea.com` (optionnel prod) — ou retirer complètement pour builder localement
- `README.md` : URLs → plant-erea.com
- `index.html` : og:url, canonical → plant-erea.com
- `public/manifest.json` : `start_url` = `/`, `scope` = `/`
- Vérifier les edge functions & code : aucune référence hardcodée à lovable.app / lovableproject.com (à part `id-preview` supabase auto-gen qu'on ne touche pas)

## Livraison
Une seule vague — migration + code + config auth + rebrand assets + guard + admin panel.

## Notes techniques
- Storage bucket `kyc-documents` privé (pas listing-images qui est public)
- Signed URLs pour l'admin qui consulte les pièces
- Le trigger `handle_new_user` reste inchangé ; on crée une ligne `kyc_verifications` status `pending` dans le même trigger
- Aucun changement business-logic hors garde d'accès
