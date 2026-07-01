# 🌱 PlantErea - Plateforme Agricole Intelligente

> Plateforme intégrée pour l'agriculture en Afrique de l'Ouest : IoT, IA, Marketplace, Blockchain & Traçabilité.

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite)                 │
│  TypeScript · Tailwind CSS · shadcn/ui · PWA            │
├─────────────────────────────────────────────────────────┤
│                  Supabase Backend                        │
│  PostgreSQL · Auth · Storage · Edge Functions · Realtime │
├─────────────────────────────────────────────────────────┤
│              Services & Intégrations                     │
│  IA (Gemini/GPT) · Blockchain · Mobile Money · IoT      │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Installation locale

```bash
# Cloner le dépôt
git clone <REPO_URL>
cd plantera

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY

# Lancer le serveur de développement
npm run dev
```

## 🔑 Variables d'environnement

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique (anon) Supabase |
| `VITE_SUPABASE_PROJECT_ID` | ID du projet |

### Secrets Edge Functions (côté serveur)

| Secret | Usage |
|---|---|
| `LOVABLE_API_KEY` | Clé d'accès à la passerelle IA (Gemini, GPT) |
| `OPENAI_API_KEY` | OpenAI Realtime / fallback |
| `ELEVENLABS_API_KEY` | Text-to-Speech |
| `SUPABASE_SERVICE_ROLE_KEY` | Opérations admin |

## 👥 Rôles utilisateurs

| Rôle | Accès |
|---|---|
| `agriculteur` | Parcelles, Cultures, Bétail, IoT, IA, Marketplace, Investissements |
| `veterinaire` | Patients, Consultations, Dossiers médicaux, Marketplace services |
| `acheteur` | Marketplace (achat), Panier, Suivi commandes |
| `investisseur` | Opportunités, Portfolio, Rendements, IoT monitoring |
| `admin` | Console admin complète, Modération, Analytics |

## 📱 Pages & Routes

| Route | Page | Accès |
|---|---|---|
| `/` | Landing page | Public |
| `/auth` | Authentification | Public |
| `/trace/:lotId` | Certificat traçabilité | Public |
| `/dashboard` | Tableau de bord | Authentifié |
| `/parcelles` | Gestion parcelles | Agriculteur |
| `/cultures` | Gestion cultures | Agriculteur |
| `/betail` | Gestion bétail | Agriculteur, Vétérinaire |
| `/marketplace` | Marketplace | Authentifié |
| `/iot` | Capteurs IoT | Agriculteur |
| `/ia` | Modules IA | Agriculteur |
| `/voice` | Assistant vocal | Agriculteur |
| `/investisseur` | Dashboard investisseur | Investisseur |
| `/veterinaire` | Dashboard vétérinaire | Vétérinaire |
| `/acheteur` | Dashboard acheteur | Acheteur |
| `/admin` | Console admin | Admin |
| `/settings` | Paramètres | Authentifié |

## 🗄 Schéma base de données

### Tables principales
- `profiles` - Profils utilisateurs
- `user_roles` - Rôles (RBAC sécurisé)
- `fields` - Parcelles agricoles (géospatial)
- `crops` - Cultures
- `harvest_records` - Enregistrements de récolte
- `livestock` - Bétail
- `veterinary_records` - Dossiers vétérinaires

### Marketplace
- `marketplace_listings` - Annonces
- `marketplace_offers` - Offres d'achat
- `marketplace_messages` - Messages
- `marketplace_conversations` - Conversations
- `marketplace_reviews` - Avis
- `marketplace_inputs` - Intrants agricoles
- `marketplace_favorites` - Favoris

### Finance & Escrow
- `investments` - Investissements
- `investment_opportunities` - Opportunités
- `escrow_contracts` - Contrats escrow blockchain
- `escrow_events` - Événements escrow
- `escrow_disputes` - Litiges
- `blockchain_transactions` - Transactions blockchain

### IoT
- `iot_devices` - Capteurs connectés
- `device_data` - Données capteurs (timeseries)
- `iot_alerts` - Alertes capteurs
- `iot_alert_configs` - Configuration seuils

### Services
- `service_providers` - Prestataires
- `service_bookings` - Réservations

### Autres
- `farm_tasks` - Tâches agricoles
- `scan_history` - Historique scans IA
- `voice_conversations` - Conversations vocales
- `notifications` - Notifications in-app

## ⚡ Edge Functions

| Fonction | Description |
|---|---|
| `ai-assistant` | Assistant IA contextuel |
| `ai-contextual-tip` | Conseils IA contextuels |
| `ai-farm-sentinel` | Alertes intelligentes |
| `detect-disease` | Détection maladies (caméra IA) |
| `predict-yield` | Prédiction de rendement |
| `irrigation-recommendations` | Recommandations irrigation |
| `smart-planner` | Planification intelligente |
| `market-prices` | Prix du marché |
| `smart-camera-analyze` | Analyse caméra intelligente |
| `voice-to-text` | Transcription vocale |
| `elevenlabs-tts` | Synthèse vocale |
| `weather-data` | Données météo |
| `ussd-sms-gateway` | Passerelle USSD/SMS |

## 🌍 Internationalisation

3 langues supportées :
- 🇫🇷 Français (par défaut)
- 🇬🇧 Anglais
- 🇸🇳 Wolof

## 📦 Stack technique

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **UI**: shadcn/ui, Radix UI, Lucide Icons, Recharts
- **State**: TanStack React Query, React Context
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime)
- **IA**: Google Gemini, OpenAI GPT (via passerelle IA managée)
- **Paiements**: Orange Money, Wave, MTN (simulation)
- **PDF**: jsPDF + jspdf-autotable
- **Routing**: React Router v6

## 📄 Licence

Propriétaire - Tous droits réservés © 2026 PlantErea
