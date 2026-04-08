import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Mail, Lock, ArrowRight, Eye, EyeOff, User, Loader2 } from "lucide-react";
import planteraIcon from "@/assets/plantera-icon.png";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { RoleSelector } from "@/components/auth/RoleSelector";
import { useLanguage } from "@/i18n/LanguageContext";

type AuthMode = "login" | "register";
type AppRole = 'agriculteur' | 'veterinaire' | 'acheteur' | 'investisseur' | 'admin';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { t } = useLanguage();
  
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "", password: "", name: "", role: "agriculteur" as AppRole,
  });

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
          toast.error(error.message.includes("Invalid login credentials") ? t("auth.wrongCredentials") : error.message);
          return;
        }
        toast.success(t("auth.loginSuccess"));
      } else {
        if (!formData.name.trim()) { toast.error(t("auth.enterName")); return; }
        if (formData.password.length < 6) { toast.error(t("auth.passwordTooShort")); return; }
        const { error } = await signUp(formData.email, formData.password, { full_name: formData.name, role: formData.role });
        if (error) {
          toast.error(error.message.includes("already registered") ? t("auth.emailAlreadyUsed") : error.message);
          return;
        }
        toast.success(t("auth.accountCreated"));
      }
    } catch (error: any) {
      toast.error(error.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (authLoading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>);
  }

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col">
      <div className="flex flex-col items-center pt-16 pb-6 px-6 safe-top">
        <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mb-4 shadow-glow">
          <Sprout className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Plantéra</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
        </p>
      </div>

      <div className="px-6 mb-4">
        <div className="flex bg-muted/60 rounded-xl p-1">
          <button onClick={() => setMode("login")} className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200", mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t("auth.loginTab")}
          </button>
          <button onClick={() => setMode("register")} className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200", mode === "register" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t("auth.registerTab")}
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 overflow-y-auto pb-8">
        <Card className="border-0 shadow-soft bg-card/80 backdrop-blur-sm">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">{t("auth.fullName")}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="name" name="name" placeholder="Amadou Diallo" value={formData.name} onChange={handleInputChange} className="h-12 pl-10 bg-muted/30 border-0 focus:bg-background transition-colors" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("auth.iAm")}</Label>
                    <RoleSelector value={formData.role} onChange={(role) => setFormData(prev => ({ ...prev, role }))} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" name="email" type="email" placeholder="amadou@email.com" value={formData.email} onChange={handleInputChange} className="h-12 pl-10 bg-muted/30 border-0 focus:bg-background transition-colors" required />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">{t("auth.password")}</Label>
                  {mode === "login" && (<button type="button" className="text-xs text-primary font-medium hover:underline">{t("auth.forgotPassword")}</button>)}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={handleInputChange} className="h-12 pl-10 pr-10 bg-muted/30 border-0 focus:bg-background transition-colors" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === "register" && (<p className="text-xs text-muted-foreground">{t("auth.minChars")}</p>)}
              </div>
              <Button type="submit" className="w-full h-12 mt-4 gradient-hero text-primary-foreground font-medium shadow-sm hover:shadow-glow transition-all" disabled={loading}>
                {loading ? (<Loader2 className="w-5 h-5 animate-spin" />) : (<>{mode === "login" ? t("auth.login") : t("auth.createMyAccount")}<ArrowRight className="w-4 h-4 ml-2" /></>)}
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="mt-6 text-center">
          <button type="button" onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← {t("auth.backToHome")}</button>
        </div>
      </div>

      <div className="px-6 py-4 text-center safe-bottom">
        <p className="text-xs text-muted-foreground">
          {t("auth.termsIntro")}{" "}
          <button className="text-primary hover:underline">{t("auth.terms")}</button>
          {" "}{t("auth.and")}{" "}
          <button className="text-primary hover:underline">{t("auth.privacy")}</button>
        </p>
      </div>
    </div>
  );
}