import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Search,
  Eye,
  UserCog,
  Shield,
  Loader2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  UserPlus,
  UserMinus,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";

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

type AppRole = "agriculteur" | "veterinaire" | "acheteur" | "investisseur" | "admin";

const availableRoles: { value: AppRole; label: string; color: string }[] = [
  { value: "agriculteur", label: "Agriculteur", color: "bg-green-500/10 text-green-600" },
  { value: "veterinaire", label: "Vétérinaire", color: "bg-blue-500/10 text-blue-600" },
  { value: "acheteur", label: "Acheteur", color: "bg-orange-500/10 text-orange-600" },
  { value: "investisseur", label: "Investisseur", color: "bg-purple-500/10 text-purple-600" },
  { value: "admin", label: "Admin", color: "bg-red-500/10 text-red-600" },
];

export function AdminUserModeration() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setEditingRoles([...user.roles]);
  };

  const toggleRole = (role: string) => {
    setEditingRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const saveRoles = async () => {
    if (!selectedUser) return;
    setSaving(true);

    try {
      // Get current roles for this user
      const currentRoles = selectedUser.roles;
      
      // Roles to add
      const rolesToAdd = editingRoles.filter(r => !currentRoles.includes(r));
      
      // Roles to remove
      const rolesToRemove = currentRoles.filter(r => !editingRoles.includes(r));

      // Add new roles
      for (const role of rolesToAdd) {
        const typedRole = role as "agriculteur" | "veterinaire" | "acheteur" | "investisseur" | "admin";
        await supabase.from("user_roles").insert({
          user_id: selectedUser.user_id,
          role: typedRole,
        });
      }

      // Remove old roles
      for (const role of rolesToRemove) {
        const typedRole = role as "agriculteur" | "veterinaire" | "acheteur" | "investisseur" | "admin";
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", selectedUser.user_id)
          .eq("role", typedRole);
      }

      toast.success("Rôles mis à jour");
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error saving roles:", error);
      toast.error("Erreur lors de la mise à jour des rôles");
    } finally {
      setSaving(false);
    }
  };

  const getRoleConfig = (role: string) => {
    return availableRoles.find(r => r.value === role) || { label: role, color: "bg-muted text-muted-foreground" };
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);
    
    const matchesRole = roleFilter === "all" || user.roles.includes(roleFilter);
    
    return matchesSearch && matchesRole;
  });

  // Stats
  const stats = {
    total: users.length,
    agriculteurs: users.filter(u => u.roles.includes("agriculteur")).length,
    veterinaires: users.filter(u => u.roles.includes("veterinaire")).length,
    acheteurs: users.filter(u => u.roles.includes("acheteur")).length,
    investisseurs: users.filter(u => u.roles.includes("investisseur")).length,
    admins: users.filter(u => u.roles.includes("admin")).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <Card className="p-2 text-center cursor-pointer" onClick={() => setRoleFilter("all")}>
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </Card>
        <Card className="p-2 text-center cursor-pointer bg-green-500/5" onClick={() => setRoleFilter("agriculteur")}>
          <p className="text-lg font-bold text-green-600">{stats.agriculteurs}</p>
          <p className="text-[10px] text-muted-foreground">Agriculteurs</p>
        </Card>
        <Card className="p-2 text-center cursor-pointer bg-blue-500/5" onClick={() => setRoleFilter("veterinaire")}>
          <p className="text-lg font-bold text-blue-600">{stats.veterinaires}</p>
          <p className="text-[10px] text-muted-foreground">Vétérinaires</p>
        </Card>
        <Card className="p-2 text-center cursor-pointer bg-orange-500/5" onClick={() => setRoleFilter("acheteur")}>
          <p className="text-lg font-bold text-orange-600">{stats.acheteurs}</p>
          <p className="text-[10px] text-muted-foreground">Acheteurs</p>
        </Card>
        <Card className="p-2 text-center cursor-pointer bg-purple-500/5" onClick={() => setRoleFilter("investisseur")}>
          <p className="text-lg font-bold text-purple-600">{stats.investisseurs}</p>
          <p className="text-[10px] text-muted-foreground">Investisseurs</p>
        </Card>
        <Card className="p-2 text-center cursor-pointer bg-red-500/5" onClick={() => setRoleFilter("admin")}>
          <p className="text-lg font-bold text-red-600">{stats.admins}</p>
          <p className="text-[10px] text-muted-foreground">Admins</p>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            {availableRoles.map(role => (
              <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Users className="w-8 h-8" />}
                title="Aucun utilisateur"
                description="Aucun utilisateur ne correspond à vos critères"
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rôles</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || "Sans nom"}</p>
                        {user.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {user.address}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        {user.email && (
                          <p className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        )}
                        {user.phone && (
                          <p className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            Aucun rôle
                          </Badge>
                        ) : (
                          user.roles.map((role) => {
                            const config = getRoleConfig(role);
                            return (
                              <Badge key={role} className={config.color}>
                                {config.label}
                              </Badge>
                            );
                          })
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), "dd/MM/yy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditUser(user)}
                      >
                        <UserCog className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Modifier les rôles
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-semibold text-lg">{selectedUser.full_name || "Sans nom"}</p>
                <div className="text-sm text-muted-foreground space-y-1 mt-2">
                  {selectedUser.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {selectedUser.email}
                    </p>
                  )}
                  {selectedUser.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedUser.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Rôles assignés</p>
                {availableRoles.map((role) => {
                  const isChecked = editingRoles.includes(role.value);
                  return (
                    <div
                      key={role.value}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                        isChecked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleRole(role.value)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleRole(role.value)}
                        />
                        <Badge className={role.color}>{role.label}</Badge>
                      </div>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                  );
                })}
              </div>

              {/* Warning if admin */}
              {editingRoles.includes("admin") && (
                <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg text-warning">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    Le rôle Admin donne un accès complet à la plateforme. Utilisez avec précaution.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Annuler
            </Button>
            <Button onClick={saveRoles} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
