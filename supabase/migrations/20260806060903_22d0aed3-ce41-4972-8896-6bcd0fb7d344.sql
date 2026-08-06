-- 1) Diagnostic RLS (admin uniquement)
CREATE OR REPLACE FUNCTION public.get_rls_diagnostic(_table text)
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policy_name text,
  command text,
  roles text,
  using_expression text,
  check_expression text,
  grants text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs';
  END IF;

  RETURN QUERY
  SELECT
    _table::text,
    COALESCE((SELECT c.relrowsecurity FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public' AND c.relname = _table), false),
    p.policyname::text,
    p.cmd::text,
    array_to_string(p.roles, ', ')::text,
    COALESCE(p.qual, '—')::text,
    COALESCE(p.with_check, '—')::text,
    COALESCE((SELECT string_agg(DISTINCT g.grantee || ':' || g.privilege_type, ', ')
              FROM information_schema.role_table_grants g
              WHERE g.table_schema = 'public' AND g.table_name = _table), 'aucun')::text
  FROM pg_policies p
  WHERE p.schemaname = 'public' AND p.tablename = _table;
END;
$$;

REVOKE ALL ON FUNCTION public.get_rls_diagnostic(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rls_diagnostic(text) TO authenticated;

-- 2) Diagnostic « pourquoi 0 agriculteur ? » (admin uniquement)
CREATE OR REPLACE FUNCTION public.diagnose_farmer_visibility()
RETURNS TABLE(
  check_name text,
  value integer,
  detail text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs';
  END IF;

  RETURN QUERY
  SELECT 'Comptes avec rôle agriculteur'::text,
         (SELECT count(*)::int FROM public.user_roles WHERE role = 'agriculteur'),
         'Table user_roles'::text
  UNION ALL
  SELECT 'Agriculteurs avec profil'::text,
         (SELECT count(*)::int FROM public.profiles p
          WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'agriculteur')),
         'Jointure profiles × user_roles'::text
  UNION ALL
  SELECT 'Agriculteurs KYC approuvés'::text,
         (SELECT count(*)::int FROM public.kyc_verifications k
          WHERE k.status = 'approved'
            AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = k.user_id AND ur.role = 'agriculteur')),
         'Badge vérifié dans l''annuaire'::text
  UNION ALL
  SELECT 'Lignes renvoyées par get_farmer_directory'::text,
         (SELECT count(*)::int FROM public.get_farmer_directory()),
         'Fonction SECURITY DEFINER utilisée par le réseau investisseur'::text
  UNION ALL
  SELECT 'Politiques SELECT sur user_roles'::text,
         (SELECT count(*)::int FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND cmd IN ('SELECT','ALL')),
         'Un accès direct sans SECURITY DEFINER renverrait 0 ligne'::text
  UNION ALL
  SELECT 'Politiques SELECT sur profiles'::text,
         (SELECT count(*)::int FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND cmd IN ('SELECT','ALL')),
         'Restriction de lecture des profils'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.diagnose_farmer_visibility() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.diagnose_farmer_visibility() TO authenticated;

-- 3) Calcul unifié quantité / prix d'une offre (source unique acheteur + agriculteur)
CREATE OR REPLACE FUNCTION public.get_offer_pricing(_offer_id uuid)
RETURNS TABLE(
  offer_id uuid,
  quantity numeric,
  unit text,
  unit_price numeric,
  total numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o RECORD;
  l RECORD;
  q numeric;
  u text;
  t numeric;
BEGIN
  SELECT * INTO o FROM public.marketplace_offers WHERE id = _offer_id;
  IF o IS NULL THEN RETURN; END IF;

  IF NOT (auth.uid() = o.buyer_id OR auth.uid() = o.seller_id OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Accès non autorisé à cette offre';
  END IF;

  SELECT * INTO l FROM public.marketplace_listings WHERE id = o.listing_id;

  t := COALESCE(o.counter_offer_price, o.proposed_price, l.price, 0);

  q := NULLIF(regexp_replace(replace(COALESCE(o.proposed_quantity, ''), ',', '.'), '[^0-9.].*$', ''), '')::numeric;
  IF q IS NULL OR q <= 0 THEN
    q := l.quantity_kg;
  END IF;

  u := NULLIF(btrim(regexp_replace(replace(COALESCE(o.proposed_quantity, ''), ',', '.'), '^[0-9.\s]+', '')), '');
  u := COALESCE(u, l.unit, 'kg');

  RETURN QUERY SELECT
    o.id,
    q,
    u,
    CASE WHEN q IS NOT NULL AND q > 0 THEN round(t / q, 2) ELSE l.price END,
    t;
END;
$$;

REVOKE ALL ON FUNCTION public.get_offer_pricing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_offer_pricing(uuid) TO authenticated;