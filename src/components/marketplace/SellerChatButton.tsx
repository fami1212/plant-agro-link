import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ChatDialog } from "./ChatDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SellerChatButtonProps {
  sellerId: string;
  sellerName: string;
  listingId: string;
  listingTitle: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export function SellerChatButton({
  sellerId,
  sellerName,
  listingId,
  listingTitle,
  variant = "outline",
  size = "sm",
  className,
}: SellerChatButtonProps) {
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenChat = async () => {
    if (!user) {
      toast.error("Connectez-vous pour envoyer un message");
      return;
    }

    if (user.id === sellerId) {
      toast.error("Vous ne pouvez pas vous envoyer un message");
      return;
    }

    setLoading(true);

    // Check if an offer/conversation already exists
    const { data: existingOffer } = await supabase
      .from("marketplace_offers")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (existingOffer) {
      setOfferId(existingOffer.id);
    } else {
      // Create a placeholder offer for messaging
      const { data: newOffer, error } = await supabase
        .from("marketplace_offers")
        .insert({
          listing_id: listingId,
          buyer_id: user.id,
          seller_id: sellerId,
          proposed_price: 0,
          status: "en_attente",
          message: "Demande de renseignements",
        })
        .select("id")
        .single();

      if (error) {
        toast.error("Erreur lors de l'ouverture du chat");
        setLoading(false);
        return;
      }
      setOfferId(newOffer.id);
    }

    setLoading(false);
    setChatOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleOpenChat}
        disabled={loading}
      >
        <MessageCircle className="w-4 h-4 mr-1" />
        Message
      </Button>

      {offerId && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          offerId={offerId}
          recipientId={sellerId}
          recipientName={sellerName}
          productTitle={listingTitle}
        />
      )}
    </>
  );
}
