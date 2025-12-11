import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sprout, Phone, Mail, Lock, ArrowRight, Eye, EyeOff, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { RoleSelector } from "@/components/auth/RoleSelector";

type AuthMode = "login" | "register";
type AppRole = 'agriculteur' | 'veterinaire' | 'acheteur' | 'investisseur' | 'admin';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signIn, signUp, signInWithPhone, verifyOtp } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const [formData, setFormData] = useState({
    phone: "",
    email: "",
    password: "",
    name: "",
    role: "agriculteur" as AppRole,
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou mot de passe incorrect");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Connexion réussie!");
      } else {
        if (!formData.name.trim()) {
          toast.error("Veuillez entrer votre nom");
          return;
        }
        if (formData.password.length < 6) {
          toast.error("Le mot de passe doit contenir au moins 6 caractères");
          return;
        }
        
        const { error } = await signUp(formData.email, formData.password, {
          full_name: formData.name,
          phone: formData.phone,
          role: formData.role,
        });
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Cet email est déjà utilisé");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Compte créé avec succès!");
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    if (!formData.phone) {
      toast.error("Veuillez entrer votre numéro de téléphone");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await signInWithPhone(formData.phone);
      if (error) {
        toast.error(error.message);
        return;
      }
      setOtpSent(true);
      toast.success("Code OTP envoyé par SMS");
    } catch (error: any) {
      toast.error(error.message || "Erreur d'envoi SMS");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast.error("Veuillez entrer le code OTP complet");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await verifyOtp(formData.phone, otpCode);
      if (error) {
        toast.error("Code OTP invalide");
        return;
      }
      toast.success("Connexion réussie!");
    } catch (error: any) {
      toast.error(error.message || "Erreur de vérification");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-earth flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center pt-12 pb-6 px-6 safe-top">
        <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mb-4 shadow-glow">
          <Sprout className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Plantéra</h1>
        <p className="text-muted-foreground mt-1">
          Votre exploitation, simplifiée
        </p>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-4">
        <div className="flex bg-muted rounded-xl p-1">
          <button
            onClick={() => { setMode("login"); setOtpSent(false); }}
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
            onClick={() => { setMode("register"); setOtpSent(false); }}
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
      <div className="flex-1 px-6 overflow-y-auto">
        <Card variant="elevated" className="animate-fade-in">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="name"
                        name="name"
                        placeholder="Amadou Diallo"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="h-12 pl-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Je suis *</Label>
                    <RoleSelector
                      value={formData.role}
                      onChange={(role) => setFormData(prev => ({ ...prev, role }))}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
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
                    required
                  />
                </div>
              </div>

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone (optionnel)</Label>
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
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
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
                    minLength={6}
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
                {mode === "register" && (
                  <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                )}
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
                className="w-full mt-4"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Se connecter" : "Créer mon compte"}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* SMS/OTP Section */}
        <div className="mt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {!otpSent ? (
            <Card variant="elevated">
              <CardContent className="p-4">
                <Label className="text-sm mb-2 block">Connexion par SMS</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="+221 77 123 45 67"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePhoneAuth}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card variant="elevated">
              <CardContent className="p-4">
                <Label className="text-sm mb-2 block">Entrez le code OTP</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="flex-1 text-center text-lg tracking-widest"
                  />
                  <Button
                    type="button"
                    variant="hero"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vérifier"}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-xs text-primary mt-2 hover:underline"
                >
                  Changer de numéro
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center safe-bottom">
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
