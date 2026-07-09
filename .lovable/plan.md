## Objectif

Corriger le flux investisseur (contrat + escrow), supprimer les pages marketplace investisseur↔agriculteur et vétérinaire↔agriculteur pour les reconstruire proprement autour du moteur `transactions` existant, puis enrichir le suivi acheteur/vendeur.

## 1. Fix contrat investisseur (bug signature)

- `InvestmentContract.tsx` : au montage, charger la dernière signature depuis `contract_signatures` pour `signatureTarget` et pré-passer en état "signé" si trouvée. Plus de re-demande.
- Ajouter un champ `counterparty_signature` : si `signatureTarget.type = 'transaction'` et que la contrepartie (agriculteur) a signé, l'afficher côté investisseur (et inversement). Statut passe à `SIGNED` seulement quand les 2 signatures existent.
- Exposer un helper `hasSignedBy(userId, targetId)` dans `src/lib/signature.ts`.

## 2. Refonte investisseur → agriculteur (via admin)

Le flux "Investir maintenant" actuel appelle `MobileMoneyPayment` et crée directement une `investments` : c'est ce qui casse (pas de contrat, pas d'escrow admin-médiatisé).

- **Supprimer UI** : `src/components/investor/RequestInvestmentDialog.tsx` (garder + réécrire), `src/components/investment/InvestmentOpportunityForm.tsx` (garder tel quel côté agriculteur).
- `MarketplaceInvestor.tsx` : remplacer bouton "Investir maintenant" par "Demander à investir via PlantErea" → ouvre `RequestInvestmentDialog` (crée `investment_requests`, pas de paiement direct).
- `AdminInvestmentRequests.tsx` : à l'approbation, créer la `transaction` (INVESTMENT) + seed milestones, PUIS créer un `investment_requests.contract_ready = true` pour déclencher signature.
- Nouvelle page `ContractSignaturePage` accessible par un lien dans `FarmerRequests` et le portfolio investisseur : rendu commun de `InvestmentContract` en mode bilatéral.

## 3. Refonte vétérinaire → agriculteur

- **Supprimer UI** : `src/pages/marketplace/MarketplaceVet.tsx`, `src/components/marketplace/VetServiceCard.tsx` côté marketplace agriculteur.
- Consolider dans `/veterinaire` : nouvel onglet "Cabinet → Bétail à consulter" avec la même liste (livestock malade). Réservation crée un `service_bookings` → trigger existant crée la `transaction` VET_SERVICE avec milestones.
- Retirer `/marketplace/vet` de `useRoleAccess`, `App.tsx`, `BottomNav`.

## 4. Marketplace agriculteur/acheteur — escrow complet

Le trigger DB `tx_from_accepted_offer` + `seed_default_milestones` crée déjà les étapes {accord prix, acompte, livraison, validation, paiement libéré}. À câbler côté UI :

- `MarketplaceFarmer.tsx` : chaque offre acceptée affiche un mini `TransactionTimeline` compact avec badge % débloqué. Filtres : "En négociation / En cours / Terminé / Litige".
- `BuyerOrderTracking.tsx` : remplacer le suivi actuel par le vrai `TransactionTimeline` (rôle = buyer). Sections : progression %, montant en escrow, actions selon rôle, bouton litige.
- Suppression du `MarketplacePaymentDialog` legacy quand une `transaction` existe déjà (l'acompte devient un milestone à valider).

## 5. Litiges depuis suivi commande

- `BuyerOrderTracking` et `MarketplaceFarmer` : bouton "Ouvrir un litige" utilise `DisputeDialog` existant (upload preuves bucket `dispute-evidence`, statut `DISPUTED`).
- `TransactionTimeline` : bannière rouge quand statut = `DISPUTED`, montre la décision admin quand `resolved_*`, avec impact (montant remboursé, libéré, split).
- Realtime : abonner `transaction_disputes` sur ID de tx.

## 6. Sync temps réel offres ↔ transactions

- Hook interne dans `MarketplaceFarmer` et `BuyerOrderTracking` : channels Supabase sur `marketplace_offers`, `transactions`, `transaction_milestones` filtrés par user.
- Filtres partagés dans un petit composant `TxStatusFilter` (En attente / Acompte / Livraison / Validation / Payé / Litige / Terminé).

## Fichiers touchés

**Créés**
- `src/components/transactions/OfferTimelineCard.tsx` (mini timeline pour listes)
- `src/components/transactions/TxStatusFilter.tsx`
- `src/pages/ContractSign.tsx` (route `/contract/:transactionId`)

**Édités**
- `src/components/investor/InvestmentContract.tsx` (charge signature existante, mode bilatéral)
- `src/lib/signature.ts` (helpers `getSignatures`, `hasSignedBy`)
- `src/pages/marketplace/MarketplaceInvestor.tsx` (bouton request via admin)
- `src/components/investor/RequestInvestmentDialog.tsx` (reste, léger polish)
- `src/components/admin/AdminInvestmentRequests.tsx` (marquer `contract_ready`)
- `src/pages/FarmerRequests.tsx` (bouton "Voir & signer le contrat" pour investissements approuvés)
- `src/pages/marketplace/MarketplaceFarmer.tsx` (timeline compacte + filtres)
- `src/components/buyer/BuyerOrderTracking.tsx` (timeline complète + litige)
- `src/components/transactions/TransactionTimeline.tsx` (bannière dispute + décision admin)
- `src/pages/Veterinaire.tsx` (onglet bétail à consulter intégré)
- `src/hooks/useRoleAccess.tsx` + `src/App.tsx` + `src/components/layout/BottomNav.tsx` (retrait `/marketplace/vet`)

**Supprimés** (UI seulement, DB intacte)
- `src/pages/marketplace/MarketplaceVet.tsx`
- `src/components/marketplace/VetServiceCard.tsx` (si non utilisé ailleurs après retrait)

## Notes

- Aucune migration SQL : tables `transactions`, `transaction_milestones`, `transaction_disputes`, `contract_signatures`, triggers `tx_from_*` déjà en place.
- Signature bilatérale = 2 lignes dans `contract_signatures` (rôles `investor` et `farmer`). La transaction passe à `SIGNED` via update explicite quand les 2 existent.
- Tout est temps réel via canaux Supabase (déjà pattern utilisé partout).
