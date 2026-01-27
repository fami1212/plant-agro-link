import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Store,
  MapPin,
  Phone,
  MessageCircle,
  Loader2,
  CreditCard,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";

interface CartItem {
  id: string;
  listing_id: string;
  quantity: number;
  title: string;
  price: number;
  unit: string | null;
  image: string | null;
  seller_id: string;
  seller_name: string;
  seller_phone: string | null;
  location: string | null;
}

interface GroupedCart {
  seller_id: string;
  seller_name: string;
  seller_phone: string | null;
  location: string | null;
  items: CartItem[];
  subtotal: number;
}

interface BuyerCartProps {
  onCheckout?: (sellerId: string, items: CartItem[]) => void;
}

export function BuyerCart({ onCheckout }: BuyerCartProps) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // In a real app, cart would be stored in localStorage or a cart table
  // For now, we'll use favorites + pending offers as cart items
  useEffect(() => {
    if (user) fetchCartItems();
  }, [user]);

  const fetchCartItems = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch favorites as cart items (simplified approach)
      const { data: favorites, error } = await supabase
        .from("marketplace_favorites")
        .select(`
          id,
          listing_id,
          marketplace_listings(
            id, title, price, unit, images, user_id, location
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      // Get seller profiles
      const sellerIds = [...new Set(favorites?.map(f => (f.marketplace_listings as any)?.user_id).filter(Boolean) || [])];
      
      let profiles: any[] = [];
      if (sellerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", sellerIds);
        profiles = profilesData || [];
      }

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      const cartItems: CartItem[] = (favorites || [])
        .filter(f => f.marketplace_listings)
        .map(f => {
          const listing = f.marketplace_listings as any;
          const seller = profileMap.get(listing.user_id);
          return {
            id: f.id,
            listing_id: f.listing_id,
            quantity: 1,
            title: listing.title,
            price: listing.price || 0,
            unit: listing.unit,
            image: listing.images?.[0] || null,
            seller_id: listing.user_id,
            seller_name: seller?.full_name || "Vendeur",
            seller_phone: seller?.phone,
            location: listing.location,
          };
        });

      setCart(cartItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      toast.error("Erreur lors du chargement du panier");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = async (itemId: string) => {
    setProcessingId(itemId);
    try {
      const { error } = await supabase
        .from("marketplace_favorites")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      setCart(prev => prev.filter(item => item.id !== itemId));
      toast.success("Article retiré du panier");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCheckoutSeller = async (group: GroupedCart) => {
    if (!user) return;
    setProcessingId(group.seller_id);

    try {
      // Create offers for each item in the group
      for (const item of group.items) {
        await supabase.from("marketplace_offers").insert({
          listing_id: item.listing_id,
          buyer_id: user.id,
          seller_id: item.seller_id,
          proposed_price: item.price * item.quantity,
          proposed_quantity: `${item.quantity} ${item.unit || "unité(s)"}`,
          status: "en_attente",
        });
      }

      // Remove items from cart (favorites)
      for (const item of group.items) {
        await supabase.from("marketplace_favorites").delete().eq("id", item.id);
      }

      setCart(prev => prev.filter(item => item.seller_id !== group.seller_id));
      toast.success(`Commande envoyée à ${group.seller_name}`);
      
      if (onCheckout) {
        onCheckout(group.seller_id, group.items);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Erreur lors de la commande");
    } finally {
      setProcessingId(null);
    }
  };

  // Group cart by seller
  const groupedCart: GroupedCart[] = cart.reduce((acc: GroupedCart[], item) => {
    const existing = acc.find(g => g.seller_id === item.seller_id);
    if (existing) {
      existing.items.push(item);
      existing.subtotal += item.price * item.quantity;
    } else {
      acc.push({
        seller_id: item.seller_id,
        seller_name: item.seller_name,
        seller_phone: item.seller_phone,
        location: item.location,
        items: [item],
        subtotal: item.price * item.quantity,
      });
    }
    return acc;
  }, []);

  const totalAmount = groupedCart.reduce((sum, g) => sum + g.subtotal, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart className="w-8 h-8" />}
        title="Panier vide"
        description="Ajoutez des produits à vos favoris pour les retrouver ici"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Cart Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{totalItems} article(s)</p>
                <p className="text-sm text-muted-foreground">
                  {groupedCart.length} producteur(s)
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {totalAmount.toLocaleString()} F
              </p>
              <p className="text-xs text-muted-foreground">Total estimé</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped by Seller */}
      {groupedCart.map((group, groupIndex) => (
        <Card 
          key={group.seller_id}
          className={cn("animate-fade-in", `stagger-${(groupIndex % 5) + 1}`)}
          style={{ opacity: 0 }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base">{group.seller_name}</CardTitle>
                  {group.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {group.location}
                    </p>
                  )}
                </div>
              </div>
              {group.seller_phone && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`tel:${group.seller_phone}`}>
                      <Phone className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`https://wa.me/${group.seller_phone.replace(/\D/g, '')}`} target="_blank">
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Items */}
            {group.items.map((item) => (
              <div key={item.id} className="flex gap-3 p-2 bg-muted/30 rounded-lg">
                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-primary font-semibold">
                    {item.price.toLocaleString()} F
                    {item.unit && <span className="text-xs text-muted-foreground">/{item.unit}</span>}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeItem(item.id)}
                      disabled={processingId === item.id}
                    >
                      {processingId === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Separator />

            {/* Subtotal & Checkout */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm text-muted-foreground">Sous-total</p>
                <p className="text-lg font-bold">{group.subtotal.toLocaleString()} FCFA</p>
              </div>
              <Button
                onClick={() => handleCheckoutSeller(group)}
                disabled={processingId === group.seller_id}
                className="gap-2"
              >
                {processingId === group.seller_id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                Commander
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
