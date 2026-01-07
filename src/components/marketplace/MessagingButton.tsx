import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { MessagingSheet } from "./MessagingSheet";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MessagingButtonProps {
  sellerId: string;
  sellerName: string;
  listingId: string;
  listingTitle: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export function MessagingButton({
  sellerId,
  sellerName,
  listingId,
  listingTitle,
  variant = "outline",
  size = "sm",
  className,
}: MessagingButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (!user) {
      toast.error("Connectez-vous pour envoyer un message");
      return;
    }

    if (user.id === sellerId) {
      toast.error("Vous ne pouvez pas vous envoyer un message");
      return;
    }

    setOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
      >
        <MessageCircle className="w-4 h-4 mr-1" />
        Message
      </Button>

      <MessagingSheet
        open={open}
        onOpenChange={setOpen}
        sellerId={sellerId}
        sellerName={sellerName}
        listingId={listingId}
        listingTitle={listingTitle}
      />
    </>
  );
}
