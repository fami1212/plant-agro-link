import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, Loader2, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { titleSchema, descriptionSchema, priceSchema, firstError } from "@/lib/validation";

interface ListingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledData?: {
    harvestRecordId?: string;
    cropId?: string;
    fieldId?: string;
    title?: string;
    quantity?: string;
    category?: string;
  };
}

const categories = [
  "Céréales", "Légumes", "Fruits", "Légumineuses",
  "Bétail", "Volaille", "Lait", "Oeufs", "Autre"
];

const regions = [
  "Dakar", "Thiès", "Saint-Louis", "Kaolack", "Ziguinchor",
  "Tambacounda", "Louga", "Fatick", "Kolda", "Matam",
  "Kaffrine", "Kédougou", "Sédhiou", "Diourbel"
];

export function ListingForm({ open, onOpenChange, onSuccess, prefilledData }: ListingFormProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    price_negotiable: true,
    quantity: "",
    location: "",
    delivery_available: false,
    delivery_regions: [] as string[],
  });

  useEffect(() => {
    if (prefilledData) {
      setFormData(prev => ({
        ...prev,
        title: prefilledData.title || "",
        quantity: prefilledData.quantity || "",
        category: prefilledData.category || "",
      }));
    }
  }, [prefilledData]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    if (imageUrls.length + files.length > 5) {
      toast.error(t("listing.maxImages"));
      return;
    }

    setUploadingImages(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Max 5 MB par image");
          continue;
        }
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
        const { data, error } = await supabase.storage
          .from("listing-images")
          .upload(fileName, file, { contentType: file.type });
        
        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from("listing-images")
            .getPublicUrl(data.path);
          newUrls.push(urlData.publicUrl);
        }
      }
      setImageUrls(prev => [...prev, ...newUrls]);
      if (newUrls.length > 0) toast.success(`${newUrls.length} photo(s) ajoutée(s)`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erreur lors de l'envoi des images");
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("Vous devez être connecté"); return; }

    const titleCheck = titleSchema.safeParse(formData.title);
    if (!titleCheck.success) { toast.error(firstError(titleCheck.error)); return; }

    const descCheck = descriptionSchema.safeParse(formData.description);
    if (!descCheck.success) { toast.error(firstError(descCheck.error)); return; }

    const priceNum = parseFloat(formData.price);
    const priceCheck = priceSchema.safeParse(priceNum);
    if (!priceCheck.success) { toast.error(firstError(priceCheck.error)); return; }

    if (formData.quantity && formData.quantity.length > 50) {
      toast.error("Quantité trop longue"); return;
    }
    if (formData.location && formData.location.length > 100) {
      toast.error("Localisation trop longue"); return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("marketplace_listings").insert({
        user_id: user.id,
        listing_type: "produit",
        title: titleCheck.data,
        description: descCheck.data || null,
        category: formData.category || null,
        price: priceCheck.data,
        price_negotiable: formData.price_negotiable,
        quantity: formData.quantity || null,
        location: formData.location || null,
        delivery_available: formData.delivery_available,
        delivery_regions: formData.delivery_regions.length > 0 ? formData.delivery_regions : null,
        harvest_record_id: prefilledData?.harvestRecordId || null,
        crop_id: prefilledData?.cropId || null,
        field_id: prefilledData?.fieldId || null,
        status: "publie",
        images: imageUrls.length > 0 ? imageUrls : null,
        traceability_qr: prefilledData?.harvestRecordId ? `PLT-${Date.now()}` : null,
      });

      if (error) throw error;
      toast.success("Produit publié sur le marketplace !");
      onSuccess();
      onOpenChange(false);
      setFormData({ title: "", description: "", category: "", price: "", price_negotiable: true, quantity: "", location: "", delivery_available: false, delivery_regions: [] });
      setImageUrls([]);
    } catch (error: any) {
      console.error("Error creating listing:", error);
      toast.error("Erreur lors de la publication");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publier un produit</DialogTitle>
          <DialogDescription>Mettez en vente vos produits agricoles sur le marketplace</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label>{t("listing.uploadImages")}</Label>
            <div className="flex gap-2 flex-wrap">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl-lg p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {imageUrls.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImages}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors"
                >
                  {uploadingImages ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("listing.maxImages")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Nom du produit *</Label>
            <Input id="title" placeholder="Ex: Mil de qualité supérieure" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Prix (FCFA) *</Label>
              <Input id="price" type="number" placeholder="25000" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input id="quantity" placeholder="500 kg" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="negotiable">Prix négociable</Label>
            <Switch id="negotiable" checked={formData.price_negotiable} onCheckedChange={(checked) => setFormData({ ...formData, price_negotiable: checked })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localisation</Label>
            <Select value={formData.location} onValueChange={(value) => setFormData({ ...formData, location: value })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une région" /></SelectTrigger>
              <SelectContent>
                {regions.map((region) => (<SelectItem key={region} value={region}>{region}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="delivery">Livraison disponible</Label>
            <Switch id="delivery" checked={formData.delivery_available} onCheckedChange={(checked) => setFormData({ ...formData, delivery_available: checked })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Décrivez votre produit..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
          </div>

          {prefilledData?.harvestRecordId && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary font-medium">✓ Ce produit sera lié à une récolte traçable</p>
              <p className="text-xs text-muted-foreground mt-1">Un QR code de traçabilité sera généré automatiquement</p>
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? (<Loader2 className="w-4 h-4 mr-2 animate-spin" />) : (<Package className="w-4 h-4 mr-2" />)}
            Publier le produit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}