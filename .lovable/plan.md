# Simplification globale de Plantera

## Constat

L'app expose trop de modules en navigation principale et en menu (Cultures, Bétail, Parcelles, IoT, IA, Communauté, E-Learning, Logistique, Finances, Investissements, Admin, Settings…). Pour un agriculteur ou un vétérinaire au champ, c'est écrasant.

Objectif : **3 onglets en bas, un seul "Plus" sobre, et une page "Ferme" unifiée** qui regroupe tous les modules métier en sous-sections accessibles à la demande — sans rien supprimer.

## Nouvelle architecture de navigation

**Bottom nav réduite à 3 + 1 (au lieu de 5)** pour tous les rôles :

```text
[ Accueil ]   [ Ma Ferme / Mon Espace ]   [ Marché ]   [ ☰ Plus ]
```

- **Accueil** : Dashboard épuré (salutation, 2-3 stats clés, 1 alerte, 1 conseil IA, 3 actions rapides)
- **Ma Ferme** (agriculteur) / **Mon Cabinet** (véto) / **Mon Portefeuille** (investisseur) / **Mes Achats** (acheteur) : page hub unifiée
- **Marché** : SimpleHub déjà en place
- **Plus** : sheet repensée — sections claires, pas une grille de 11 icônes

## Page "Ma Ferme" unifiée (agriculteur)

Remplace le besoin d'aller chercher Cultures / Bétail / Parcelles / IoT / IA / Finances dans le menu. Une seule page avec **onglets scrollables horizontalement** (déjà partiellement en place) :

```text
Vue d'ensemble · Cultures · Bétail · Parcelles · Capteurs · IA · Finances
```

Chaque onglet charge le contenu existant (pas de réécriture des modules). Les pages standalone `/cultures`, `/betail`, `/parcelles`, `/iot`, `/ia` restent accessibles via deep-link mais disparaissent du menu principal.

Mêmes patterns pour :
- **Vétérinaire** → `Rendez-vous · Patients · Dossiers · Diagnostic IA · Facturation` (déjà en place, à épurer)
- **Investisseur** → `Portefeuille · Opportunités · Contrats · Suivi IoT`
- **Acheteur** → `Catalogue · Mes commandes · Suivi`

## Menu "Plus" repensé

Structure en 3 sections courtes au lieu d'une grille 4×3 :

```text
COMMUNAUTÉ
  Communauté · E-Learning

OUTILS
  Logistique · Assistant vocal · Investissements

COMPTE
  Paramètres · Déconnexion
```

L'admin a une section supplémentaire "Administration" visible uniquement si rôle admin.

## Design : sobre, moderne, allégé

- **Headers** : retirer le logo systématique sur sous-pages, le garder seulement sur Accueil et Plus. Réduit le bruit visuel.
- **Cartes** : bordure 1px, fond `bg-card`, ombre minimale (`shadow-sm` au lieu de `shadow-md`). Espacements `space-y-3` au lieu de `space-y-5`.
- **StatCards** : passer de 4 à 2-3 stats max sur l'accueil. Format compact, pas de gradients colorés sauf accent rare.
- **Couleurs** : moins de variantes (primary/accent/success/warning), plus de `bg-muted/30` neutre.
- **Typographie** : titres `text-lg font-semibold` (au lieu de xl), libellés stat `text-xs uppercase tracking-wide text-muted-foreground`.
- **Onglets scrollables** : underline minimal au lieu de pills colorées.
- **AIContextualTip** : version compacte (1 ligne, icône + texte), dépliable au tap.

## Fichiers à modifier

- `src/components/layout/BottomNav.tsx` — réduire à 3 items + Plus, refondre la sheet en sections
- `src/pages/Dashboard.tsx` — épurer : 2-3 stats, 1 alerte, 1 tip, 3 actions
- `src/pages/Agriculteur.tsx` — ajouter onglets `Cultures`, `Bétail`, `Parcelles`, `Capteurs`, `IA` qui réutilisent les composants des pages standalone
- `src/pages/Veterinaire.tsx` — déjà multi-onglets, juste épurer header/cartes
- `src/pages/Investisseur.tsx` & `src/pages/Acheteur.tsx` — adopter le même pattern hub unifié
- `src/components/dashboard/StatCard.tsx` — variante compacte sobre
- `src/components/common/PageHeader.tsx` — `showLogo` désactivé par défaut sur sous-pages
- `src/index.css` — éventuels ajustements de tokens (ombres, rayons)
- Conserver toutes les routes existantes pour compatibilité

## Hors scope

- Aucune suppression de fonctionnalité
- Aucune modification backend / RLS
- Pas de refonte du marketplace (déjà simplifié récemment)

## Résultat attendu

Un agriculteur voit 3 boutons en bas, ouvre "Ma Ferme" et navigue par onglets dans tout son métier. Le menu "Plus" devient une vraie liste lisible. Le design respire, moins d'icônes colorées, plus de blanc.
