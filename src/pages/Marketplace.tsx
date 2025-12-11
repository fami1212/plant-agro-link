import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  MapPin,
  Star,
  ShoppingBag,
  Filter,
  Phone,
  MessageCircle,
  X,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  seller: string;
  location: string;
  price: string;
  priceValue: number;
  quantity: string;
  rating: number;
  image: string;
  verified: boolean;
  category: string;
  phone?: string;
  description?: string;
}

const initialProducts: Product[] = [
  {
    id: 1,
    name: "Mil de qualité",
    seller: "Ferme Diallo",
    location: "Thiès",
    price: "250 FCFA/kg",
    priceValue: 250,
    quantity: "500 kg",
    rating: 4.8,
    image: "🌾",
    verified: true,
    category: "Céréales",
    phone: "+221 77 123 4567",
    description: "Mil de haute qualité, récolté cette saison. Idéal pour le couscous et la bouillie.",
  },
  {
    id: 2,
    name: "Arachides fraîches",
    seller: "Coopérative Kaolack",
    location: "Kaolack",
    price: "400 FCFA/kg",
    priceValue: 400,
    quantity: "1 tonne",
    rating: 4.5,
    image: "🥜",
    verified: true,
    category: "Légumineuses",
    phone: "+221 77 234 5678",
    description: "Arachides fraîchement récoltées, parfaites pour l'huile ou la consommation directe.",
  },
  {
    id: 3,
    name: "Tomates biologiques",
    seller: "Jardin Vert",
    location: "Dakar",
    price: "500 FCFA/kg",
    priceValue: 500,
    quantity: "200 kg",
    rating: 4.9,
    image: "🍅",
    verified: false,
    category: "Légumes",
    phone: "+221 77 345 6789",
    description: "Tomates bio cultivées sans pesticides. Goût authentique garanti.",
  },
  {
    id: 4,
    name: "Oignons locaux",
    seller: "Ferme Ndiaye",
    location: "Saint-Louis",
    price: "300 FCFA/kg",
    priceValue: 300,
    quantity: "800 kg",
    rating: 4.2,
    image: "🧅",
    verified: true,
    category: "Légumes",
    phone: "+221 77 456 7890",
    description: "Oignons de Saint-Louis, connus pour leur saveur unique.",
  },
  {
    id: 5,
    name: "Maïs séché",
    seller: "Agri Plus",
    location: "Ziguinchor",
    price: "200 FCFA/kg",
    priceValue: 200,
    quantity: "2 tonnes",
    rating: 4.6,
    image: "🌽",
    verified: true,
    category: "Céréales",
    phone: "+221 77 567 8901",
    description: "Maïs séché de qualité supérieure, idéal pour l'alimentation animale ou humaine.",
  },
  {
    id: 6,
    name: "Mangues Kent",
    seller: "Verger Sénégal",
    location: "Casamance",
    price: "350 FCFA/kg",
    priceValue: 350,
    quantity: "500 kg",
    rating: 4.7,
    image: "🥭",
    verified: true,
    category: "Fruits",
    phone: "+221 77 678 9012",
    description: "Mangues Kent sucrées et juteuses, exportation qualité.",
  },
];

const categories = [
  { name: "Tous", value: "all" },
  { name: "Céréales", value: "Céréales" },
  { name: "Légumes", value: "Légumes" },
  { name: "Fruits", value: "Fruits" },
  { name: "Légumineuses", value: "Légumineuses" },
  { name: "Bétail", value: "Bétail" },
];

export default function Marketplace() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
    description: "",
    location: "",
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.quantity) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const product: Product = {
      id: Date.now(),
      name: newProduct.name,
      seller: "Mon exploitation",
      location: newProduct.location || "Non spécifié",
      price: `${newProduct.price} FCFA/kg`,
      priceValue: parseInt(newProduct.price),
      quantity: newProduct.quantity,
      rating: 5.0,
      image: getCategoryEmoji(newProduct.category),
      verified: true,
      category: newProduct.category || "Autres",
      description: newProduct.description,
      phone: "+221 77 000 0000",
    };

    setProducts([product, ...products]);
    setShowAddDialog(false);
    setNewProduct({ name: "", category: "", price: "", quantity: "", description: "", location: "" });
    toast.success("Produit ajouté au marketplace !");
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case "Céréales":
        return "🌾";
      case "Légumes":
        return "🥬";
      case "Fruits":
        return "🍎";
      case "Légumineuses":
        return "🫘";
      case "Bétail":
        return "🐄";
      default:
        return "📦";
    }
  };

  const handleContact = (type: "call" | "message", phone: string) => {
    if (type === "call") {
      window.open(`tel:${phone}`, "_self");
    } else {
      window.open(`https://wa.me/${phone.replace(/\s/g, "")}`, "_blank");
    }
    toast.success(type === "call" ? "Appel en cours..." : "Ouverture WhatsApp...");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Marketplace"
        subtitle="Achetez et vendez localement"
        action={
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="accent" size="icon">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un produit</DialogTitle>
                <DialogDescription>
                  Mettez en vente vos produits agricoles
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du produit *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Mil de qualité"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={newProduct.category}
                    onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.slice(1).map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix (FCFA/kg) *</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="250"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantité *</Label>
                    <Input
                      id="quantity"
                      placeholder="500 kg"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Localisation</Label>
                  <Input
                    id="location"
                    placeholder="Ex: Thiès"
                    value={newProduct.location}
                    onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez votre produit..."
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>
                <Button className="w-full" onClick={handleAddProduct}>
                  <Package className="w-4 h-4 mr-2" />
                  Publier le produit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher des produits..."
            className="pl-11 pr-12 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                selectedCategory === cat.value
                  ? "gradient-hero text-primary-foreground shadow-soft"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-4 pb-24">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product, index) => (
              <Card
                key={product.id}
                variant="interactive"
                className={cn("animate-fade-in overflow-hidden", `stagger-${(index % 5) + 1}`)}
                style={{ opacity: 0 }}
                onClick={() => setSelectedProduct(product)}
              >
                <CardContent className="p-0">
                  <div className="aspect-square bg-muted flex items-center justify-center text-5xl">
                    {product.image}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                        {product.name}
                      </h3>
                      {product.verified && (
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <svg
                            className="w-2.5 h-2.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {product.seller}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3" />
                      <span>{product.location}</span>
                      <span className="mx-1">•</span>
                      <Star className="w-3 h-3 text-warning fill-warning" />
                      <span>{product.rating}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary text-sm">
                        {product.price}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {product.quantity}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md">
          {selectedProduct && (
            <>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-7xl mb-4">
                {selectedProduct.image}
              </div>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedProduct.name}</DialogTitle>
                  {selectedProduct.verified && (
                    <Badge variant="default" className="bg-primary">
                      Vérifié
                    </Badge>
                  )}
                </div>
                <DialogDescription>
                  Par {selectedProduct.seller} • {selectedProduct.location}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Prix</p>
                    <p className="text-xl font-bold text-primary">{selectedProduct.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Disponible</p>
                    <p className="font-semibold">{selectedProduct.quantity}</p>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Description</p>
                    <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 text-warning fill-warning" />
                  <span>{selectedProduct.rating} / 5</span>
                  <span className="mx-2">•</span>
                  <Badge variant="outline">{selectedProduct.category}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleContact("call", selectedProduct.phone || "")}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Appeler
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => handleContact("message", selectedProduct.phone || "")}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Action Button */}
      <div className="fixed right-4 bottom-24 z-40">
        <Button
          variant="accent"
          size="lg"
          className="rounded-full shadow-elevated"
          onClick={() => setShowAddDialog(true)}
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          Vendre
        </Button>
      </div>
    </AppLayout>
  );
}
