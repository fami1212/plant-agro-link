import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DashboardStats {
  // Farmer stats
  totalFields: number;
  totalArea: number;
  activeCrops: number;
  totalLivestock: number;
  totalHarvested: number;
  healthAlerts: number;
  upcomingAppointments: number;
  // Investor stats
  totalInvestments: number;
  activeInvestments: number;
  totalInvested: number;
  expectedReturns: number;
  averageReturn: number;
  // Buyer stats
  totalPurchases: number;
  availableProducts: number;
  // Farmer investment stats (investments received)
  investmentsReceived: number;
  totalFunding: number;
}

export interface HarvestTrend {
  month: string;
  quantity: number;
}

export interface LivestockEvolution {
  month: string;
  count: number;
}

export interface Alert {
  id: string;
  type: "warning" | "error" | "info" | "success";
  title: string;
  message: string;
  date: Date;
}

export function useDashboardData() {
  const { user, roles } = useAuth();
  
  const isInvestisseur = roles.includes('investisseur');
  const isAgriculteur = roles.includes('agriculteur');
  const isAcheteur = roles.includes('acheteur');

  const statsQuery = useQuery({
    queryKey: ["dashboard-stats", user?.id, roles],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.id) throw new Error("Not authenticated");

      const stats: DashboardStats = {
        totalFields: 0,
        totalArea: 0,
        activeCrops: 0,
        totalLivestock: 0,
        totalHarvested: 0,
        healthAlerts: 0,
        upcomingAppointments: 0,
        totalInvestments: 0,
        activeInvestments: 0,
        totalInvested: 0,
        expectedReturns: 0,
        averageReturn: 0,
        totalPurchases: 0,
        availableProducts: 0,
        investmentsReceived: 0,
        totalFunding: 0,
      };

      // Farmer stats
      if (isAgriculteur || roles.includes('admin')) {
        const [fieldsRes, cropsRes, livestockRes, harvestsRes, vetRes, investmentsReceivedRes] = await Promise.all([
          supabase.from("fields").select("id, area_hectares").eq("user_id", user.id),
          supabase.from("crops").select("id, status").eq("user_id", user.id),
          supabase.from("livestock").select("id, health_status").eq("user_id", user.id),
          supabase.from("harvest_records").select("quantity_kg").eq("user_id", user.id),
          supabase.from("veterinary_records")
            .select("next_appointment")
            .eq("user_id", user.id)
            .gte("next_appointment", new Date().toISOString().split("T")[0]),
          supabase.from("investments").select("id, amount_invested").eq("farmer_id", user.id),
        ]);

        const fields = fieldsRes.data || [];
        const crops = cropsRes.data || [];
        const livestock = livestockRes.data || [];
        const harvests = harvestsRes.data || [];
        const vetRecords = vetRes.data || [];
        const investmentsReceived = investmentsReceivedRes.data || [];

        stats.totalFields = fields.length;
        stats.totalArea = fields.reduce((sum, f) => sum + Number(f.area_hectares || 0), 0);
        stats.activeCrops = crops.filter((c) => c.status !== "termine").length;
        stats.totalLivestock = livestock.length;
        stats.totalHarvested = harvests.reduce((sum, h) => sum + Number(h.quantity_kg || 0), 0);
        stats.healthAlerts = livestock.filter((l) => l.health_status !== "sain").length;
        stats.upcomingAppointments = vetRecords.length;
        stats.investmentsReceived = investmentsReceived.length;
        stats.totalFunding = investmentsReceived.reduce((sum, i) => sum + Number(i.amount_invested || 0), 0);
      }

      // Investor stats
      if (isInvestisseur || roles.includes('admin')) {
        const { data: investments } = await supabase
          .from("investments")
          .select("id, amount_invested, expected_return_percent, status")
          .eq("investor_id", user.id);

        const invs = investments || [];
        stats.totalInvestments = invs.length;
        stats.activeInvestments = invs.filter((i) => i.status === "en_cours").length;
        stats.totalInvested = invs.reduce((sum, i) => sum + Number(i.amount_invested || 0), 0);
        stats.expectedReturns = invs.reduce(
          (sum, i) => sum + Number(i.amount_invested || 0) * (1 + Number(i.expected_return_percent || 15) / 100),
          0
        );
        stats.averageReturn = invs.length > 0
          ? invs.reduce((sum, i) => sum + Number(i.expected_return_percent || 15), 0) / invs.length
          : 0;
      }

      // Buyer stats
      if (isAcheteur || roles.includes('admin')) {
        const [offersRes, listingsRes] = await Promise.all([
          supabase.from("marketplace_offers")
            .select("id")
            .eq("buyer_id", user.id)
            .eq("status", "acceptee"),
          supabase.from("marketplace_listings")
            .select("id", { count: 'exact', head: true })
            .in("status", ["publie", "consulte", "negociation"]),
        ]);

        stats.totalPurchases = offersRes.data?.length || 0;
        stats.availableProducts = listingsRes.count || 0;
      }

      return stats;
    },
    enabled: !!user?.id,
  });

  const harvestTrendQuery = useQuery({
    queryKey: ["harvest-trend", user?.id],
    queryFn: async (): Promise<HarvestTrend[]> => {
      if (!user?.id) throw new Error("Not authenticated");

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data } = await supabase
        .from("harvest_records")
        .select("harvest_date, quantity_kg")
        .eq("user_id", user.id)
        .gte("harvest_date", sixMonthsAgo.toISOString().split("T")[0])
        .order("harvest_date", { ascending: true });

      const monthlyData: Record<string, number> = {};
      const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyData[key] = 0;
      }

      (data || []).forEach((record) => {
        const date = new Date(record.harvest_date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyData[key] !== undefined) {
          monthlyData[key] += Number(record.quantity_kg || 0);
        }
      });

      return Object.entries(monthlyData).map(([key, quantity]) => ({
        month: months[parseInt(key.split("-")[1]) - 1],
        quantity: Math.round(quantity),
      }));
    },
    enabled: !!user?.id && (isAgriculteur || roles.includes('admin')),
  });

  const livestockEvolutionQuery = useQuery({
    queryKey: ["livestock-evolution", user?.id],
    queryFn: async (): Promise<LivestockEvolution[]> => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data } = await supabase
        .from("livestock")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
      const monthlyData: Record<string, number> = {};

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyData[key] = 0;
      }

      const sortedKeys = Object.keys(monthlyData).sort();
      const livestockBeforeRange = (data || []).filter((a) => {
        const key = `${new Date(a.created_at).getFullYear()}-${String(new Date(a.created_at).getMonth() + 1).padStart(2, "0")}`;
        return key < sortedKeys[0];
      }).length;

      return sortedKeys.map((key) => {
        const cumulative = livestockBeforeRange + (data || []).filter((a) => {
          const k = `${new Date(a.created_at).getFullYear()}-${String(new Date(a.created_at).getMonth() + 1).padStart(2, "0")}`;
          return k <= key;
        }).length;

        return {
          month: months[parseInt(key.split("-")[1]) - 1],
          count: cumulative,
        };
      });
    },
    enabled: !!user?.id && (isAgriculteur || roles.includes('admin')),
  });

  const alertsQuery = useQuery({
    queryKey: ["dashboard-alerts", user?.id, roles],
    queryFn: async (): Promise<Alert[]> => {
      if (!user?.id) throw new Error("Not authenticated");

      const alerts: Alert[] = [];

      // Farmer alerts
      if (isAgriculteur || roles.includes('admin')) {
        // Check for livestock health issues
        const { data: sickAnimals } = await supabase
          .from("livestock")
          .select("identifier, health_status")
          .eq("user_id", user.id)
          .neq("health_status", "sain");

        (sickAnimals || []).forEach((animal) => {
          alerts.push({
            id: `health-${animal.identifier}`,
            type: animal.health_status === "malade" ? "error" : "warning",
            title: "Alerte santé",
            message: `${animal.identifier} est en état ${animal.health_status}`,
            date: new Date(),
          });
        });

        // Check for upcoming vet appointments
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const { data: appointments } = await supabase
          .from("veterinary_records")
          .select("next_appointment, livestock_id")
          .eq("user_id", user.id)
          .gte("next_appointment", new Date().toISOString().split("T")[0])
          .lte("next_appointment", tomorrow.toISOString().split("T")[0]);

        (appointments || []).forEach((apt) => {
          alerts.push({
            id: `vet-${apt.livestock_id}-${apt.next_appointment}`,
            type: "info",
            title: "RDV vétérinaire",
            message: `Rendez-vous prévu le ${new Date(apt.next_appointment!).toLocaleDateString("fr-FR")}`,
            date: new Date(apt.next_appointment!),
          });
        });

        // Check for crops ready to harvest
        const { data: readyCrops } = await supabase
          .from("crops")
          .select("name, expected_harvest_date")
          .eq("user_id", user.id)
          .eq("status", "maturation")
          .lte("expected_harvest_date", new Date().toISOString().split("T")[0]);

        (readyCrops || []).forEach((crop) => {
          alerts.push({
            id: `harvest-${crop.name}`,
            type: "warning",
            title: "Récolte prête",
            message: `${crop.name} est prêt à être récolté`,
            date: new Date(),
          });
        });

        // Check for new investments received
        const { data: newInvestments } = await supabase
          .from("investments")
          .select("id, amount_invested, title, created_at")
          .eq("farmer_id", user.id)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        (newInvestments || []).forEach((inv) => {
          alerts.push({
            id: `investment-${inv.id}`,
            type: "success",
            title: "Nouvel investissement",
            message: `${(inv.amount_invested / 1000).toFixed(0)}k FCFA reçu pour ${inv.title}`,
            date: new Date(inv.created_at),
          });
        });
      }

      // Investor alerts
      if (isInvestisseur) {
        // Check for investment opportunities
        const { data: opportunities } = await supabase
          .from("investment_opportunities")
          .select("id, title, created_at")
          .eq("status", "ouverte")
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(3);

        (opportunities || []).forEach((opp) => {
          alerts.push({
            id: `opp-${opp.id}`,
            type: "info",
            title: "Nouvelle opportunité",
            message: opp.title,
            date: new Date(opp.created_at),
          });
        });
      }

      return alerts.slice(0, 5);
    },
    enabled: !!user?.id,
  });

  return {
    stats: statsQuery.data,
    harvestTrend: harvestTrendQuery.data,
    livestockEvolution: livestockEvolutionQuery.data,
    alerts: alertsQuery.data,
    isLoading: statsQuery.isLoading,
    refetch: () => {
      statsQuery.refetch();
      harvestTrendQuery.refetch();
      livestockEvolutionQuery.refetch();
      alertsQuery.refetch();
    },
  };
}
