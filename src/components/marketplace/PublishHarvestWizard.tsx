import { useEffect, useRef, useState } from "react";
import { ActionWizard, type WizardStep } from "./ActionWizard";
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
import { ImagePlus, Loader2, X, Sprout, Tag, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { offlineService, useOnlineStatus } from "@/services/offlineService";
import {
  titleSchema,
  descriptionSchema,
  priceSchema,
  firstError,
} from "@/lib/validation";

interface PublishHarvestWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const categories = [
  "Céréales", "Légumes", "Fruits", "Légumineuses",
  "Bétail", "Volaille", "Lait", "Oeufs", "Autre",
];

const regions = [
  "Dakar", "Thiès", "Saint-Louis", "Kaolack", "Ziguinchor",
  "Tambacounda", "Louga", "Fatick", "Kolda", "Matam",
  "Kaffrine", "Kédougou", "Sédhiou", "Diourbel",
];

// Bloque téléphones / emails / liens externes pour forcer les échanges in-app
const CONTACT_REGEX = /(\+?\d[\d\s().-]{6,}|\b[\w.+-]+@[\w-]+\.[\w.-]+\b|https?:\/\/|wa\.me|t\.me|whatsapp)/i;

export function PublishHarvestWizard({ open, onOpenChange, onSuccess }: PublishHarvestWizardProps) {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [data, setData] = useState({
    title: "",
    category: "",
    quantity: "",
    price: "",
    location: "",
    delivery_available: false,
    description: "",
  });

  useEffect(() => {
    if (!open) {
      setData({ title: "", category: "", quantity: "", price: "", location: "", delivery_available: false, description: "" });
      setImageUrls([]);
    }
  }, [open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    if (!isOnline) {
      toast.error("Photos indisponibles hors ligne. Publiez maintenant et ajoutez les photos une fois reconnecté.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (imageUrls.length + files.length > 5) {
      toast.error("Maximum 5 photos");
      return;
    }
    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Max 5 Mo par photo");
          continue;
        }
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop()}`;
        const { data: up, error } = await supabase.storage
          .from("listing-images")
          .upload(fileName, file, { contentType: file.type });
        if (!error && up) {
          const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(up.path);
          newUrls.push(urlData.publicUrl);
        }
      }
      setImageUrls((prev) => [...prev, ...newUrls]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (i: number) => setImageUrls((prev) => prev.filter((_, idx) => idx !== i));

  const handleComplete = async () => {
    if (!user) {
      toast.error("Connectez-vous d'abord");
      return;
    }
    const titleCheck = titleSchema.safeParse(data.title);
    if (!titleCheck.success) { toast.error(firstError(titleCheck.error)); return; }

    const priceNum = parseFloat(data.price);
    const priceCheck = priceSchema.safeParse(priceNum);
    if (!priceCheck.success) { toast.error(firstError(priceCheck.error)); return; }

    const descCheck = descriptionSchema.safeParse(data.description);
    if (!descCheck.success) { toast.error(firstError(descCheck.error)); return; }

    if (CONTACT_REGEX.test(data.title) || CONTACT_REGEX.test(data.description)) {
      toast.error("Les coordonnées (téléphone, email, liens) sont interdites. Toutes les discussions doivent passer par l'application.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        user_id: user.id,
        listing_type: "produit",
        title: titleCheck.data,
        description: descCheck.data || null,
        category: data.category || null,
        price: priceCheck.data,
        price_negotiable: true,
        quantity: data.quantity || null,
        location: data.location || null,
        delivery_available: data.delivery_available,
        status: "publie",
        images: imageUrls.length > 0 ? imageUrls : null,
      };

      if (!isOnline) {
        await offlineService.saveOfflineOperation("marketplace_listings", "insert", payload);
        toast.success("📦 Sauvegardé hors ligne — sera publié dès le retour de la connexion.");
        onSuccess();
        onOpenChange(false);
        return;
      }

      const { error } = await supabase.from("marketplace_listings").insert(payload);
      if (error) {
        // Fallback : on file pour resync ultérieur si l'insertion en ligne échoue
        await offlineService.saveOfflineOperation("marketplace_listings", "insert", payload);
        toast.success("Connexion instable — votre annonce sera publiée automatiquement.");
      } else {
        toast.success("🎉 Votre récolte est en ligne !");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      try {
        await offlineService.saveOfflineOperation("marketplace_listings", "insert", {
          user_id: user.id,
          listing_type: "produit",
          title: data.title,
          description: data.description || null,
          category: data.category || null,
          price: parseFloat(data.price),
          price_negotiable: true,
          quantity: data.quantity || null,
          location: data.location || null,
          delivery_available: data.delivery_available,
          status: "publie",
          images: imageUrls.length > 0 ? imageUrls : null,
        });
        toast.success("Sauvegardé localement — publication automatique prévue.");
        onSuccess();
        onOpenChange(false);
      } catch {
        toast.error("Erreur lors de la publication");
      }
    } finally {
      setLoading(false);
    }
  };

  const step1Valid = data.title.trim().length >= 2 && data.category.length > 0 && data.quantity.trim().length > 0;
  const step2Valid = parseFloat(data.price) > 0 && data.location.length > 0;

  const steps: WizardStep[] = [
    {
      id: "what",
      title: "Que vendez-vous ?",
      description: "Décrivez votre récolte en quelques mots.",
      canContinue: step1Valid,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto">
            <Sprout className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-title">Nom du produit *</Label>
            <Input
              id="w-title"
              placeholder="Ex: Mil de qualité supérieure"
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Catégorie *</Label>
            <Select value={data.category} onValueChange={(v) => setData({ ...data, category: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-qty">Quantité *</Label>
            <Input
              id="w-qty"
              placeholder="Ex: 500 kg, 20 sacs..."
              value={data.quantity}
              onChange={(e) => setData({ ...data, quantity: e.target.value })}
            />
          </div>
        </div>
      ),
    },
    {
      id: "price",
      title: "Prix et localisation",
      description: "Indiquez votre prix et où se trouve la marchandise.",
      canContinue: step2Valid,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/30 text-accent-foreground mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-price">Prix (FCFA) *</Label>
            <Input
              id="w-price"
              type="number"
              inputMode="numeric"
              placeholder="25000"
              value={data.price}
              onChange={(e) => setData({ ...data, price: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Le prix sera négociable par défaut.</p>
          </div>
          <div className="space-y-2">
            <Label>Région *</Label>
            <Select value={data.location} onValueChange={(v) => setData({ ...data, location: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une région" /></SelectTrigger>
              <SelectContent>
                {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="w-deliv" className="text-sm">Livraison possible</Label>
              <p className="text-xs text-muted-foreground">Vous pouvez livrer l'acheteur</p>
            </div>
            <Switch
              id="w-deliv"
              checked={data.delivery_available}
              onCheckedChange={(c) => setData({ ...data, delivery_available: c })}
            />
          </div>
        </div>
      ),
    },
    {
      id: "media",
      title: "Photos et détails",
      description: "Ajoutez des photos pour rassurer les acheteurs.",
      canContinue: true,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto">
            <Camera className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <Label>Photos (jusqu'à 5)</Label>
            <div className="flex flex-wrap gap-2">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl-lg p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {imageUrls.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
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
            <Label htmlFor="w-desc">Description (optionnel)</Label>
            <Textarea
              id="w-desc"
              placeholder="Qualité, méthode de culture, période de disponibilité..."
              rows={3}
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              ⚠️ N'inscrivez pas votre numéro ou email — toutes les discussions et paiements doivent rester dans l'application.
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
            <p className="font-medium">Récapitulatif</p>
            <p className="text-muted-foreground">
              {data.title || "—"} · {data.quantity || "—"} · {data.price ? `${parseFloat(data.price).toLocaleString()} FCFA` : "—"}
            </p>
            <p className="text-muted-foreground">{data.location || "—"}</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <ActionWizard
      open={open}
      onOpenChange={onOpenChange}
      title="Vendre ma récolte"
      steps={steps}
      onComplete={handleComplete}
      completeLabel="Publier"
      loading={loading}
    />
  );
}