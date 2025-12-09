import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  MapPin,
  Star,
  ShoppingBag,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

const products = [
  {
    id: 1,
    name: "Mil de qualité",
    seller: "Ferme Diallo",
    location: "Thiès",
    price: "250 FCFA/kg",
    quantity: "500 kg",
    rating: 4.8,
    image: "🌾",
    verified: true,
  },
  {
    id: 2,
    name: "Arachides fraîches",
    seller: "Coopérative Kaolack",
    location: "Kaolack",
    price: "400 FCFA/kg",
    quantity: "1 tonne",
    rating: 4.5,
    image: "🥜",
    verified: true,
  },
  {
    id: 3,
    name: "Tomates biologiques",
    seller: "Jardin Vert",
    location: "Dakar",
    price: "500 FCFA/kg",
    quantity: "200 kg",
    rating: 4.9,
    image: "🍅",
    verified: false,
  },
  {
    id: 4,
    name: "Oignons locaux",
    seller: "Ferme Ndiaye",
    location: "Saint-Louis",
    price: "300 FCFA/kg",
    quantity: "800 kg",
    rating: 4.2,
    image: "🧅",
    verified: true,
  },
  {
    id: 5,
    name: "Maïs séché",
    seller: "Agri Plus",
    location: "Ziguinchor",
    price: "200 FCFA/kg",
    quantity: "2 tonnes",
    rating: 4.6,
    image: "🌽",
    verified: true,
  },
];

const categories = [
  { name: "Tous", active: true },
  { name: "Céréales", active: false },
  { name: "Légumes", active: false },
  { name: "Fruits", active: false },
  { name: "Bétail", active: false },
];

export default function Marketplace() {
  return (
    <AppLayout>
      <PageHeader
        title="Marketplace"
        subtitle="Achetez et vendez localement"
        action={
          <Button variant="accent" size="icon">
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher des produits..."
            className="pl-11 pr-12 h-12"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {categories.map((cat) => (
            <button
              key={cat.name}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                cat.active
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
      <div className="px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {products.map((product, index) => (
            <Card
              key={product.id}
              variant="interactive"
              className={cn("animate-fade-in overflow-hidden", `stagger-${(index % 5) + 1}`)}
              style={{ opacity: 0 }}
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
                    <span className="text-xs text-muted-foreground">
                      {product.quantity}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed right-4 bottom-24 z-40">
        <Button variant="accent" size="lg" className="rounded-full shadow-elevated">
          <ShoppingBag className="w-5 h-5 mr-2" />
          Vendre
        </Button>
      </div>
    </AppLayout>
  );
}
