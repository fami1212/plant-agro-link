import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ScrollableTabs,
  ScrollableTabsList,
  ScrollableTabsTrigger,
  ScrollableTabsContent,
} from "@/components/ui/scrollable-tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  ShoppingBag,
  Shield,
  Search,
  UserCheck,
  UserX,
  Eye,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Package,
  Activity,
  BarChart3,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Loader2,
  DollarSign,
  Scale,
  Settings,
  Database,
  Cpu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database as DatabaseTypes } from "@/integrations/supabase/types";
import { AdminTransactions } from "@/components/admin/AdminTransactions";
import { AdminDisputePanel } from "@/components/admin/AdminDisputePanel";

type Profile = DatabaseTypes["public"]["Tables"]["profiles"]["Row"];
type Listing = DatabaseTypes["public"]["Tables"]["marketplace_listings"]["Row"];
type ServiceProvider = DatabaseTypes["public"]["Tables"]["service_providers"]["Row"];

interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  roles: string[];
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalListings: 0,
    pendingListings: 0,
    totalProviders: 0,
    verifiedProviders: 0,
    totalInvestments: 0,
    totalTransactions: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchListings(),
      fetchProviders(),
      fetchStats(),
    ]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => ({
        ...profile,
        roles: roles
          ?.filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role) || [],
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    }
  };

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    }
  };

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error("Error fetching providers:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const [
        { count: usersCount },
        { count: listingsCount },
        { count: pendingCount },
        { count: providersCount },
        { count: verifiedCount },
        { count: investmentsCount },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("marketplace_listings").select("*", { count: "exact", head: true }),
        supabase.from("marketplace_listings").select("*", { count: "exact", head: true }).eq("status", "brouillon"),
        supabase.from("service_providers").select("*", { count: "exact", head: true }),
        supabase.from("service_providers").select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("investments").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        totalUsers: usersCount || 0,
        activeUsers: usersCount || 0,
        totalListings: listingsCount || 0,
        pendingListings: pendingCount || 0,
        totalProviders: providersCount || 0,
        verifiedProviders: verifiedCount || 0,
        totalInvestments: investmentsCount || 0,
        totalTransactions: 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleVerifyListing = async (listingId: string, verify: boolean) => {
    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .update({ 
          is_verified: verify,
          status: verify ? "publie" : "brouillon"
        })
        .eq("id", listingId);

      if (error) throw error;
      toast.success(verify ? "Annonce approuvée" : "Annonce rejetée");
      fetchListings();
    } catch (error) {
      console.error("Error updating listing:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleVerifyProvider = async (providerId: string, verify: boolean) => {
    try {
      const { error } = await supabase
        .from("service_providers")
        .update({ is_verified: verify })
        .eq("id", providerId);

      if (error) throw error;
      toast.success(verify ? "Prestataire vérifié" : "Vérification retirée");
      fetchProviders();
    } catch (error) {
      console.error("Error updating provider:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Supprimer cette annonce ?")) return;
    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .delete()
        .eq("id", listingId);

      if (error) throw error;
      toast.success("Annonce supprimée");
      fetchListings();
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery)
  );

  const filteredListings = listings.filter(
    (listing) =>
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-500/10 text-red-600";
      case "agriculteur": return "bg-green-500/10 text-green-600";
      case "veterinaire": return "bg-blue-500/10 text-blue-600";
      case "investisseur": return "bg-purple-500/10 text-purple-600";
      case "acheteur": return "bg-orange-500/10 text-orange-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "publie": return <Badge className="bg-green-500">Publié</Badge>;
      case "brouillon": return <Badge variant="secondary">Brouillon</Badge>;
      case "reserve": return <Badge className="bg-blue-500">Réservé</Badge>;
      case "vendu": return <Badge className="bg-purple-500">Vendu</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Administration"
        subtitle="Gérer les utilisateurs et modérer le marketplace"
        action={
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      <div className="px-4 pb-24 space-y-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Utilisateurs</p>
                <p className="text-lg font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Package className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Annonces</p>
                <p className="text-lg font-bold">{stats.totalListings}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prestataires</p>
                <p className="text-lg font-bold">{stats.totalProviders}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Investissements</p>
                <p className="text-lg font-bold">{stats.totalInvestments}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Tabs */}
        <ScrollableTabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollableTabsList>
            <ScrollableTabsTrigger value="overview" className="flex items-center gap-2 px-4">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Vue d'ensemble</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="users" className="flex items-center gap-2 px-4">
              <Users className="w-4 h-4" />
              <span className="text-sm">Utilisateurs</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="marketplace" className="flex items-center gap-2 px-4">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-sm">Marketplace</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="disputes" className="flex items-center gap-2 px-4">
              <Scale className="w-4 h-4" />
              <span className="text-sm">Litiges</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="transactions" className="flex items-center gap-2 px-4">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Paiements</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="system" className="flex items-center gap-2 px-4">
              <Settings className="w-4 h-4" />
              <span className="text-sm">Système</span>
            </ScrollableTabsTrigger>
          </ScrollableTabsList>

          {/* Overview Tab */}
          <ScrollableTabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Actions en attente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-orange-500" />
                    <span>Annonces à modérer</span>
                  </div>
                  <Badge variant="secondary">{stats.pendingListings}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span>Prestataires à vérifier</span>
                  </div>
                  <Badge variant="secondary">{stats.totalProviders - stats.verifiedProviders}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activité récente</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listings.slice(0, 5).map((listing) => (
                      <div key={listing.id} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded">
                        <div>
                          <p className="font-medium text-sm">{listing.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(listing.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        {getStatusBadge(listing.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollableTabsContent>

          {/* Users Tab */}
          <ScrollableTabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{user.full_name || "Sans nom"}</p>
                          {user.roles.map((role) => (
                            <span key={role} className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(role)}`}>
                              {role}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {user.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </span>
                          )}
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(user.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollableTabsContent>

          {/* Marketplace Tab */}
          <ScrollableTabsContent value="marketplace" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une annonce..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Listings moderation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Annonces ({filteredListings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredListings.slice(0, 20).map((listing) => (
                      <div key={listing.id} className="p-3 hover:bg-muted/50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{listing.title}</p>
                              {getStatusBadge(listing.status)}
                              {listing.is_verified && (
                                <Badge className="bg-green-500">Vérifié</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {listing.category && (
                                <Badge variant="outline">{listing.category}</Badge>
                              )}
                              {listing.price && (
                                <span>{listing.price.toLocaleString()} FCFA</span>
                              )}
                              {listing.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {listing.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {!listing.is_verified && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:bg-green-500/10"
                                onClick={() => handleVerifyListing(listing.id, true)}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteListing(listing.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Providers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Prestataires ({providers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {providers.map((provider) => (
                    <div key={provider.id} className="p-3 hover:bg-muted/50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{provider.business_name}</p>
                            {provider.is_verified ? (
                              <Badge className="bg-green-500">Vérifié</Badge>
                            ) : (
                              <Badge variant="secondary">En attente</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline">{provider.service_category}</Badge>
                            {provider.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {provider.location}
                              </span>
                            )}
                            {provider.rating && (
                              <span>⭐ {provider.rating}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {!provider.is_verified ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:bg-green-500/10"
                              onClick={() => handleVerifyProvider(provider.id, true)}
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-orange-600 hover:bg-orange-500/10"
                              onClick={() => handleVerifyProvider(provider.id, false)}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </ScrollableTabsContent>

          {/* Disputes Tab */}
          <ScrollableTabsContent value="disputes">
            <AdminDisputePanel />
          </ScrollableTabsContent>

          {/* Transactions Tab */}
          <ScrollableTabsContent value="transactions">
            <AdminTransactions />
          </ScrollableTabsContent>

          {/* System Tab */}
          <ScrollableTabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Base de données
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Cpu className="w-5 h-5 text-green-500" />
                    <span>État du système</span>
                  </div>
                  <Badge className="bg-green-500">Opérationnel</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span>Tables actives</span>
                  <Badge variant="secondary">15</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span>Edge Functions</span>
                  <Badge variant="secondary">5</Badge>
                </div>
              </CardContent>
            </Card>
          </ScrollableTabsContent>
        </ScrollableTabs>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails utilisateur</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-semibold text-lg">{selectedUser.full_name || "Sans nom"}</p>
                <div className="flex gap-2 mt-2">
                  {selectedUser.roles.map((role) => (
                    <span key={role} className={`text-xs px-2 py-1 rounded-full ${getRoleColor(role)}`}>
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {selectedUser.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedUser.email}</span>
                  </div>
                )}
                {selectedUser.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedUser.phone}</span>
                  </div>
                )}
                {selectedUser.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedUser.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Inscrit le {new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
