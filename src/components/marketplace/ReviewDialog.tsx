import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  targetType: "seller" | "listing";
  targetName: string;
  offerId?: string;
  onSuccess?: () => void;
}

export function ReviewDialog({
  open,
  onOpenChange,
  targetId,
  targetType,
  targetName,
  offerId,
  onSuccess,
}: ReviewDialogProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error("Veuillez donner une note");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("marketplace_reviews").insert({
      user_id: user.id,
      target_type: targetType,
      target_id: targetId,
      rating,
      comment: comment.trim() || null,
      offer_id: offerId || null,
    });

    if (error) {
      console.error("Review error:", error);
      toast.error("Erreur lors de l'envoi de l'avis");
    } else {
      toast.success("Merci pour votre avis !");
      setRating(0);
      setComment("");
      onOpenChange(false);
      onSuccess?.();
    }
    setSubmitting(false);
  };

  const displayRating = hoverRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            Évaluer {targetType === "seller" ? "le vendeur" : "le produit"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-center text-muted-foreground">
            {targetName}
          </p>

          {/* Star Rating */}
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "w-8 h-8 transition-colors",
                    star <= displayRating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-sm font-medium">
            {displayRating === 0 && "Touchez pour noter"}
            {displayRating === 1 && "Très mauvais"}
            {displayRating === 2 && "Mauvais"}
            {displayRating === 3 && "Correct"}
            {displayRating === 4 && "Bien"}
            {displayRating === 5 && "Excellent"}
          </p>

          {/* Comment */}
          <Textarea
            placeholder="Laissez un commentaire (optionnel)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Envoyer l'avis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
