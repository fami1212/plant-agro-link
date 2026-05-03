DROP POLICY IF EXISTS "Users can create their own reviews" ON public.marketplace_reviews;

CREATE POLICY "Users can create reviews for completed transactions"
ON public.marketplace_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND offer_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.marketplace_offers o
    WHERE o.id = marketplace_reviews.offer_id
      AND o.status = 'acceptee'::offer_status
      AND (
        (auth.uid() = o.buyer_id AND (
           (target_type = 'seller' AND target_id = o.seller_id)
        OR (target_type = 'listing' AND target_id = o.listing_id)
        ))
        OR
        (auth.uid() = o.seller_id AND target_type = 'buyer' AND target_id = o.buyer_id)
      )
  )
);