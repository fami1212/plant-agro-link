import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sprout, Phone, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type AuthMode = "login" | "register";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    phone: "",
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate auth
    setTimeout(() => {
      setLoading(false);
      toast.success(
        mode === "login" ? "Connexion réussie!" : "Compte créé avec succès!"
      );
      navigate("/dashboard");
    }, 1500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen gradient-earth flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center pt-12 pb-8 px-6 safe-top">
        <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mb-4 shadow-glow">
          <Sprout className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Plantéra</h1>
        <p className="text-muted-foreground mt-1">
          Votre exploitation, simplifiée
        </p>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-6">
        <div className="flex bg-muted rounded-xl p-1">
          <button
            onClick={() => setMode("login")}
            className={cn(
              "flex-1 py-3 rounded-lg text-sm font-semibold transition-all",
              mode === "login"
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground"
            )}
          >
            Connexion
          </button>
          <button
            onClick={() => setMode("register")}
            className={cn(
              "flex-1 py-3 rounded-lg text-sm font-semibold transition-all",
              mode === "register"
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground"
            )}
          >
            Inscription
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6">
        <Card variant="elevated" className="animate-fade-in">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Amadou Diallo"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="h-12"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+221 77 123 45 67"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="h-12 pl-11"
                    required
                  />
                </div>
              </div>

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optionnel)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="amadou@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="h-12 pl-11"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="h-12 pl-11 pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {mode === "login" && (
                <button
                  type="button"
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Mot de passe oublié?
                </button>
              )}

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-pulse-soft">Chargement...</span>
                ) : (
                  <>
                    {mode === "login" ? "Se connecter" : "Créer un compte"}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* SMS/USSD option */}
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => toast.info("Envoi du code SMS...")}
        >
          <Phone className="w-5 h-5" />
          Continuer avec SMS/USSD
        </Button>
      </div>

      {/* Footer */}
      <div className="px-6 py-6 text-center safe-bottom">
        <p className="text-xs text-muted-foreground">
          En continuant, vous acceptez nos{" "}
          <button className="text-primary hover:underline">
            Conditions d'utilisation
          </button>{" "}
          et notre{" "}
          <button className="text-primary hover:underline">
            Politique de confidentialité
          </button>
        </p>
      </div>
    </div>
  );
}
