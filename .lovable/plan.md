## Audit de sécurité réalisé

J'ai analysé l'application et identifié plusieurs vulnérabilités à corriger :

### Vulnérabilités identifiées

1. **XSS critique dans `CourseDetail.tsx`** : utilisation directe de `dangerouslySetInnerHTML={{ __html: activeModule.text_content }}` sans assainissement → un contenu de cours malveillant exécuterait du JS arbitraire chez tous les utilisateurs.
2. **Aucune validation côté client** des entrées utilisateur (formulaires d'auth, posts communauté, listings marketplace, commentaires, profil, etc.) malgré la présence de `zod` dans les dépendances.
3. **Absence d'en-têtes de sécurité HTTP** (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy) dans `index.html`.
4. **Pas de limite de longueur** sur les champs texte → risque de DoS et de payloads volumineux.
5. **Absence de protection contre les mots de passe compromis** (HIBP) côté Supabase Auth.
6. **Pas d'audit RLS récent** ni de scan de sécurité Supabase.
7. **Liens externes** potentiellement sans `rel="noopener noreferrer"`.

---

## Plan d'action

### 1. Corriger la XSS dans le E-Learning
- Installer `dompurify` + `@types/dompurify`.
- Créer un helper `src/lib/sanitize.ts` qui assainit le HTML (whitelist de balises sûres : `p, b, i, ul, ol, li, h1-h4, br, strong, em, a, img` avec attributs filtrés).
- Remplacer `dangerouslySetInnerHTML` dans `CourseDetail.tsx` par `__html: sanitize(text_content)`.

### 2. Validation centralisée avec Zod
- Créer `src/lib/validation.ts` avec des schémas réutilisables :
  - `emailSchema`, `passwordSchema` (min 8, force minimale), `nameSchema` (trim, max 100)
  - `postContentSchema` (max 2000), `commentSchema` (max 1000)
  - `phoneSchema`, `priceSchema`, `quantitySchema`
  - `urlSchema` (https uniquement)
- Appliquer la validation dans :
  - `src/pages/Auth.tsx` (login + signup)
  - `src/components/community/PostForm.tsx` et `CommentDialog.tsx`
  - `src/components/marketplace/ListingForm.tsx`
  - `src/components/crops/CropForm.tsx`, `FieldForm.tsx`, `LivestockForm.tsx`
- Afficher les erreurs via `toast.error` avec messages clairs.
- Limiter `maxLength` sur tous les `<Input>` et `<Textarea>` correspondants.

### 3. En-têtes de sécurité HTTP
Ajouter dans `index.html` (balises `<meta http-equiv>`) :
- `Content-Security-Policy` adaptée (autorise Supabase, Lovable AI, YouTube embed pour les vidéos de cours, self pour scripts/styles).
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (caméra/micro autorisés uniquement pour self).

### 4. Renforcer l'authentification
- Augmenter le minimum de mot de passe à **8 caractères** (au lieu de 6) avec règle de force (chiffre + lettre).
- Activer la **protection HIBP** (Have I Been Pwned) sur Supabase Auth via `configure_auth`.
- Ne plus exposer `error.message` brut dans les toasts (déjà partiellement fait, à généraliser).

### 5. Sécurisation des liens et médias externes
- Audit rapide des `<a target="_blank">` → ajout systématique de `rel="noopener noreferrer"`.
- Le composant `VideoPlayer` accepte une URL arbitraire : valider qu'il s'agit bien d'un domaine YouTube/Vimeo autorisé avant d'embarquer l'iframe.

### 6. Audit Supabase
- Lancer `supabase--linter` pour détecter RLS manquantes / policies trop permissives.
- Lancer `security--run_security_scan` pour un audit complet des tables et policies.
- Corriger les findings critiques découverts (RLS manquantes, policies `true`, colonnes sensibles exposées).

### 7. Documentation
- Mettre à jour `@security-memory` avec la posture de sécurité finale (XSS protégée via DOMPurify, validation zod systématique, CSP active, HIBP activé, etc.).

---

## Fichiers impactés (estimation)

**Nouveaux** : `src/lib/sanitize.ts`, `src/lib/validation.ts`
**Modifiés** : `index.html`, `src/components/elearning/CourseDetail.tsx`, `src/pages/Auth.tsx`, `src/components/community/PostForm.tsx`, `src/components/community/CommentDialog.tsx`, `src/components/marketplace/ListingForm.tsx`, `src/components/elearning/VideoPlayer.tsx`, plus formulaires crops/fields/livestock.
**Backend** : configuration Auth (HIBP), éventuelles migrations RLS selon résultats du scan.

Souhaitez-vous que je procède avec ce plan ?