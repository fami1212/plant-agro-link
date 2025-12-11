import { Toaster } from "@/components/ui/toaster";
import Investisseur from "./pages/Investisseur";
import Settings from "./pages/Settings";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Parcelles from "./pages/Parcelles";
import Cultures from "./pages/Cultures";
import Betail from "./pages/Betail";
import Marketplace from "./pages/Marketplace";
import IoT from "./pages/IoT";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="plantera-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              {/* Agriculteur Routes */}
              <Route
                path="/parcelles"
                element={
                  <ProtectedRoute allowedRoles={['agriculteur', 'admin']}>
                    <Parcelles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cultures"
                element={
                  <ProtectedRoute allowedRoles={['agriculteur', 'admin']}>
                    <Cultures />
                  </ProtectedRoute>
                }
              />
              {/* Shared: Agriculteur & Veterinaire */}
              <Route
                path="/betail"
                element={
                  <ProtectedRoute allowedRoles={['agriculteur', 'veterinaire', 'admin']}>
                    <Betail />
                  </ProtectedRoute>
                }
              />
              {/* All authenticated users */}
              <Route
                path="/marketplace"
                element={
                  <ProtectedRoute>
                    <Marketplace />
                  </ProtectedRoute>
                }
              />
              {/* Agriculteur IoT */}
              <Route
                path="/iot"
                element={
                  <ProtectedRoute allowedRoles={['agriculteur', 'admin']}>
                    <IoT />
                  </ProtectedRoute>
                }
              />
              {/* Investisseur */}
              <Route
                path="/investisseur"
                element={
                  <ProtectedRoute allowedRoles={['investisseur', 'admin']}>
                    <Investisseur />
                  </ProtectedRoute>
                }
              />
              {/* Settings */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
