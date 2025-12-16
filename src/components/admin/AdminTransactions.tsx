import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Download,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  fee: number;
  status: string;
  payment_provider: string | null;
  created_at: string;
  user_name?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  processing: "bg-blue-500/10 text-blue-500",
  completed: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-purple-500/10 text-purple-500",
};

const typeLabels: Record<string, string> = {
  payment: "Paiement",
  refund: "Remboursement",
  investment: "Investissement",
  service_booking: "Réservation service",
  marketplace_purchase: "Achat marketplace",
};

export function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({
    totalVolume: 0,
    totalFees: 0,
    completedCount: 0,
    pendingCount: 0,
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Fetch from marketplace_offers as proxy for transactions
      const { data: offers, error } = await supabase
        .from("marketplace_offers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set((offers || []).flatMap(o => [o.buyer_id, o.seller_id]))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Map offers to transaction-like format
      const txns: Transaction[] = (offers || []).map(o => ({
        id: o.id,
        user_id: o.buyer_id,
        type: "marketplace_purchase",
        amount: o.proposed_price,
        fee: Math.round(o.proposed_price * 0.02),
        status: o.payment_status || (o.status === "acceptee" ? "completed" : "pending"),
        payment_provider: o.payment_method || null,
        created_at: o.created_at,
        user_name: profileMap.get(o.buyer_id) || "Utilisateur",
      }));

      setTransactions(txns);

      // Calculate stats
      const completed = txns.filter(t => t.status === "completed" || t.status === "paid");
      const pending = txns.filter(t => t.status === "pending");
      setStats({
        totalVolume: completed.reduce((sum, t) => sum + t.amount, 0),
        totalFees: completed.reduce((sum, t) => sum + t.fee, 0),
        completedCount: completed.length,
        pendingCount: pending.length,
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ["ID", "Date", "Type", "Montant", "Frais", "Statut", "Utilisateur"];
    const rows = filteredTransactions.map(t => [
      t.id,
      format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
      typeLabels[t.type] || t.type,
      t.amount,
      t.fee,
      t.status,
      t.user_name,
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Volume total</p>
              <p className="text-lg font-bold">{(stats.totalVolume / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-success/10">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Frais perçus</p>
              <p className="text-lg font-bold">{(stats.totalFees / 1000).toFixed(0)}k</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Complétées</p>
              <p className="text-lg font-bold">{stats.completedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <ArrowDownRight className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-lg font-bold">{stats.pendingCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Transactions</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-1" />
                Exporter
              </Button>
              <Button variant="outline" size="icon" onClick={fetchTransactions}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="completed">Complétées</SelectItem>
                <SelectItem value="paid">Payées</SelectItem>
                <SelectItem value="failed">Échouées</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucune transaction
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="text-sm">
                          {format(new Date(txn.created_at), "dd/MM/yy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell className="font-medium">{txn.user_name}</TableCell>
                        <TableCell>
                          <span className="text-sm">{typeLabels[txn.type] || txn.type}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {txn.amount.toLocaleString()} F
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[txn.status] || statusColors.pending}>
                            {txn.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}