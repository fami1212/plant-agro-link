
-- =============================================
-- MODULE COMMUNAUTÉ
-- =============================================

CREATE TABLE public.community_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  group_type text NOT NULL DEFAULT 'cooperative',
  image_url text,
  created_by uuid NOT NULL,
  member_count integer DEFAULT 0,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.community_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  member_role text NOT NULL DEFAULT 'membre',
  joined_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX community_members_unique ON public.community_members(group_id, user_id);

CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  images text[],
  post_type text NOT NULL DEFAULT 'actualite',
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  group_id uuid REFERENCES public.community_groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.community_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX community_likes_unique ON public.community_likes(post_id, user_id);

CREATE TABLE public.community_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.community_groups(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  attachments text[],
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- MODULE E-LEARNING
-- =============================================

CREATE TABLE public.elearning_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'culture',
  difficulty text NOT NULL DEFAULT 'debutant',
  duration_minutes integer DEFAULT 0,
  thumbnail_url text,
  video_url text,
  instructor_name text,
  language text DEFAULT 'fr',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.elearning_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.elearning_courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  content_type text NOT NULL DEFAULT 'video',
  video_url text,
  text_content text,
  duration_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.elearning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.elearning_courses(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES public.elearning_modules(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  score numeric,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.elearning_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.elearning_modules(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer text NOT NULL,
  explanation text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- MODULE LOGISTIQUE
-- =============================================

CREATE TABLE public.logistics_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  listing_id uuid REFERENCES public.marketplace_listings(id),
  offer_id uuid REFERENCES public.marketplace_offers(id),
  transporter_id uuid,
  origin text NOT NULL,
  destination text NOT NULL,
  distance_km numeric,
  weight_kg numeric,
  status text NOT NULL DEFAULT 'en_preparation',
  pickup_date date,
  delivery_date date,
  estimated_delivery date,
  tracking_notes jsonb DEFAULT '[]',
  price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.logistics_transporters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'camionnette',
  capacity_kg numeric,
  service_areas text[],
  phone text,
  whatsapp text,
  rating numeric DEFAULT 0,
  is_available boolean DEFAULT true,
  price_per_km numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.logistics_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'kg',
  location text,
  min_threshold numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_transporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_stock ENABLE ROW LEVEL SECURITY;

-- Community Groups
CREATE POLICY "Anyone can view public groups" ON public.community_groups FOR SELECT USING (is_public = true);
CREATE POLICY "Members can view their groups" ON public.community_groups FOR SELECT USING (EXISTS (SELECT 1 FROM public.community_members WHERE community_members.group_id = community_groups.id AND community_members.user_id = auth.uid()));
CREATE POLICY "Users can create groups" ON public.community_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators can update" ON public.community_groups FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Group creators can delete" ON public.community_groups FOR DELETE USING (auth.uid() = created_by);

-- Community Members
CREATE POLICY "Members can view group members" ON public.community_members FOR SELECT USING (EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.group_id = community_members.group_id AND cm.user_id = auth.uid()));
CREATE POLICY "Users can join groups" ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.community_members FOR DELETE USING (auth.uid() = user_id);

-- Community Posts
CREATE POLICY "View public posts" ON public.community_posts FOR SELECT USING (group_id IS NULL);
CREATE POLICY "View group posts" ON public.community_posts FOR SELECT USING (EXISTS (SELECT 1 FROM public.community_members WHERE community_members.group_id = community_posts.group_id AND community_members.user_id = auth.uid()));
CREATE POLICY "Users can create posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- Community Comments
CREATE POLICY "View comments on visible posts" ON public.community_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.community_comments FOR DELETE USING (auth.uid() = user_id);

-- Community Likes
CREATE POLICY "View likes" ON public.community_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON public.community_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.community_likes FOR DELETE USING (auth.uid() = user_id);

-- Community Group Messages
CREATE POLICY "Members can view messages" ON public.community_group_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.community_members WHERE community_members.group_id = community_group_messages.group_id AND community_members.user_id = auth.uid()));
CREATE POLICY "Members can send messages" ON public.community_group_messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.community_members WHERE community_members.group_id = community_group_messages.group_id AND community_members.user_id = auth.uid()));

-- E-Learning Courses (public read for authenticated)
CREATE POLICY "Authenticated can view courses" ON public.elearning_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage courses" ON public.elearning_courses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- E-Learning Modules
CREATE POLICY "Authenticated can view modules" ON public.elearning_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage modules" ON public.elearning_modules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- E-Learning Progress
CREATE POLICY "Users manage own progress" ON public.elearning_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- E-Learning Quiz
CREATE POLICY "Authenticated can view quiz" ON public.elearning_quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage quiz" ON public.elearning_quiz_questions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Logistics Shipments
CREATE POLICY "Sellers can view their shipments" ON public.logistics_shipments FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Buyers can view their shipments" ON public.logistics_shipments FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Admins can view all shipments" ON public.logistics_shipments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sellers can create shipments" ON public.logistics_shipments FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Participants can update shipments" ON public.logistics_shipments FOR UPDATE USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- Logistics Transporters
CREATE POLICY "Anyone can view available transporters" ON public.logistics_transporters FOR SELECT USING (is_available = true);
CREATE POLICY "Users can manage own transporter profile" ON public.logistics_transporters FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Logistics Stock
CREATE POLICY "Users manage own stock" ON public.logistics_stock FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logistics_shipments;
