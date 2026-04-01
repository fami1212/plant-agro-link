

# Plan : Modules Communauté, E-Learning et Logistique

## Vue d'ensemble

Ajout de 3 nouveaux modules majeurs à Plantéra, accessibles depuis la navigation et le dashboard, avec tables de données, pages dédiées et intégration IA.

---

## 1. Module Communauté (`/communaute`)

**Tables à créer (migration) :**
- `community_posts` : id, user_id, content, images[], post_type (actualite/question/conseil/annonce), likes_count, comments_count, group_id (nullable), created_at
- `community_comments` : id, post_id, user_id, content, created_at
- `community_likes` : id, post_id, user_id, created_at (unique user_id+post_id)
- `community_groups` : id, name, description, type (cooperative/region/culture), image_url, created_by, member_count, is_public, created_at
- `community_members` : id, group_id, user_id, role (admin/membre), joined_at
- `community_group_messages` : id, group_id, sender_id, content, attachments[], created_at

RLS : les posts publics sont visibles par tous les authentifiés ; les posts de groupe uniquement par les membres ; messagerie de groupe réservée aux membres. Realtime activé sur `community_group_messages`.

**Pages et composants :**
- `src/pages/Communaute.tsx` : page principale avec 3 onglets (Fil d'actualité, Groupes, Mes Groupes)
- `src/components/community/PostCard.tsx` : carte de post avec like, commentaire, partage
- `src/components/community/PostForm.tsx` : formulaire de création (texte + images)
- `src/components/community/GroupCard.tsx` : carte de groupe avec rejoindre/quitter
- `src/components/community/GroupChat.tsx` : messagerie de groupe temps réel
- `src/components/community/GroupDetail.tsx` : détail du groupe avec fil + membres + chat

**Accès :** Tous les rôles authentifiés.

---

## 2. Module E-Learning (`/elearning`)

**Tables à créer (migration) :**
- `elearning_courses` : id, title, description, category (culture/elevage/business/tech), difficulty (debutant/intermediaire/avance), duration_minutes, thumbnail_url, video_url, instructor_name, language, created_at
- `elearning_modules` : id, course_id, title, order_index, content_type (video/texte/quiz), video_url, text_content, duration_minutes
- `elearning_progress` : id, user_id, course_id, module_id, completed, score, completed_at, created_at
- `elearning_quiz_questions` : id, module_id, question, options (jsonb), correct_answer, explanation

RLS : cours visibles par tous les authentifiés ; progression liée au user_id.

**Pages et composants :**
- `src/pages/ELearning.tsx` : catalogue avec filtres par catégorie/difficulté
- `src/components/elearning/CourseCard.tsx` : carte de cours avec progression
- `src/components/elearning/CourseDetail.tsx` : vue détaillée avec liste de modules
- `src/components/elearning/VideoPlayer.tsx` : lecteur vidéo intégré (YouTube embed)
- `src/components/elearning/QuizModule.tsx` : quiz interactif avec correction IA via edge function `ai-assistant`
- `src/components/elearning/ProgressTracker.tsx` : barre de progression par parcours

**Données initiales :** Insertion de 6-8 cours de démarrage avec vidéos YouTube agricoles francophones, couvrant les catégories principales.

**Accès :** Tous les rôles (priorité agriculteur).

---

## 3. Module Logistique (`/logistique`)

**Tables à créer (migration) :**
- `logistics_shipments` : id, seller_id, buyer_id, listing_id, offer_id, origin, destination, distance_km, weight_kg, status (en_preparation/en_transit/livre/annule), pickup_date, delivery_date, estimated_delivery, tracking_notes (jsonb), created_at, updated_at
- `logistics_transporters` : id, user_id, company_name, vehicle_type (camion/camionnette/moto/triporteur), capacity_kg, service_areas[], phone, whatsapp, rating, is_available, price_per_km, created_at
- `logistics_stock` : id, user_id, product_name, quantity, unit, location, min_threshold, created_at, updated_at

RLS : vendeurs/acheteurs voient leurs expéditions ; transporteurs voient les demandes de leur zone ; stock lié au user_id. Realtime sur `logistics_shipments`.

**Pages et composants :**
- `src/pages/Logistique.tsx` : page avec 3 onglets (Expéditions, Transporteurs, Stock)
- `src/components/logistics/ShipmentCard.tsx` : carte d'expédition avec statut visuel (stepper)
- `src/components/logistics/ShipmentForm.tsx` : créer une expédition depuis une commande
- `src/components/logistics/TransporterCard.tsx` : carte transporteur avec notation
- `src/components/logistics/TransporterForm.tsx` : inscription transporteur
- `src/components/logistics/StockManager.tsx` : gestion des stocks avec alertes seuil bas
- `src/components/logistics/ShipmentTracker.tsx` : suivi pas-à-pas avec timeline

**Accès :** Agriculteurs, acheteurs et admin.

---

## 4. Intégration Navigation et Routing

**Fichiers modifiés :**
- `src/App.tsx` : ajout des 3 routes protégées `/communaute`, `/elearning`, `/logistique`
- `src/components/layout/BottomNav.tsx` : ajout des items dans `allMenuItems` (icônes Users, GraduationCap, Truck)
- `src/hooks/useRoleAccess.tsx` : ajout des routes aux `allowedRoutes` de chaque rôle
- `src/i18n/translations/fr.ts`, `en.ts`, `wo.ts` : ajout des traductions pour les 3 modules
- `src/pages/Dashboard.tsx` : ajout de QuickActionCards pour les nouveaux modules

---

## 5. Ordre d'exécution

1. Migration DB : créer toutes les tables + RLS + realtime en une seule migration
2. Créer les pages et composants Communauté
3. Créer les pages et composants E-Learning + données de démarrage
4. Créer les pages et composants Logistique
5. Intégrer navigation, routing et traductions

