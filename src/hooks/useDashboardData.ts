import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DashboardStats {
  totalFields: number;
  totalArea: number;
  activeCrops: number;
  totalLivestock: number;
  totalHarvested: number;
  healthAlerts: number;
  upcomingAppointments: number;
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
  type: "warning" | "error" | "info";
  title: string;
  message: string;
  date: Date;
}

export function useDashboardData() {
  const { user } = useAuth();

  const statsQuery = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.id) throw new Error("Not authenticated");

      const [fieldsRes, cropsRes, livestockRes, harvestsRes, vetRes] = await Promise.all([
        supabase.from("fields").select("id, area_hectares").eq("user_id", user.id),
        supabase.from("crops").select("id, status").eq("user_id", user.id),
        supabase.from("livestock").select("id, health_status").eq("user_id", user.id),
        supabase.from("harvest_records").select("quantity_kg").eq("user_id", user.id),
        supabase.from("veterinary_records")
          .select("next_appointment")
          .eq("user_id", user.id)
          .gte("next_appointment", new Date().toISOString().split("T")[0]),
      ]);

      const fields = fieldsRes.data || [];
      const crops = cropsRes.data || [];
      const livestock = livestockRes.data || [];
      const harvests = harvestsRes.data || [];
      const vetRecords = vetRes.data || [];

      return {
        totalFields: fields.length,
        totalArea: fields.reduce((sum, f) => sum + Number(f.area_hectares || 0), 0),
        activeCrops: crops.filter((c) => c.status !== "recolte").length,
        totalLivestock: livestock.length,
        totalHarvested: harvests.reduce((sum, h) => sum + Number(h.quantity_kg || 0), 0),
        healthAlerts: livestock.filter((l) => l.health_status !== "sain").length,
        upcomingAppointments: vetRecords.length,
      };
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
    enabled: !!user?.id,
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

      let runningTotal = 0;
      const sortedKeys = Object.keys(monthlyData).sort();

      (data || []).forEach((animal) => {
        const date = new Date(animal.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        
        sortedKeys.forEach((k) => {
          if (k >= key) {
            monthlyData[k]++;
          }
        });
      });

      // Calculate cumulative
      let cumulative = 0;
      const livestockBeforeRange = (data || []).filter((a) => {
        const key = `${new Date(a.created_at).getFullYear()}-${String(new Date(a.created_at).getMonth() + 1).padStart(2, "0")}`;
        return key < sortedKeys[0];
      }).length;

      return sortedKeys.map((key) => {
        cumulative = livestockBeforeRange + (data || []).filter((a) => {
          const k = `${new Date(a.created_at).getFullYear()}-${String(new Date(a.created_at).getMonth() + 1).padStart(2, "0")}`;
          return k <= key;
        }).length;

        return {
          month: months[parseInt(key.split("-")[1]) - 1],
          count: cumulative,
        };
      });
    },
    enabled: !!user?.id,
  });

  const alertsQuery = useQuery({
    queryKey: ["dashboard-alerts", user?.id],
    queryFn: async (): Promise<Alert[]> => {
      if (!user?.id) throw new Error("Not authenticated");

      const alerts: Alert[] = [];

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

      return alerts.slice(0, 5);
    },
    enabled: !!user?.id,
  });

  return {
    stats: statsQuery.data,
    harvestTrend: harvestTrendQuery.data,
    livestockEvolution: livestockEvolutionQuery.data,
    alerts: alertsQuery.data,
    isLoading: statsQuery.isLoading || harvestTrendQuery.isLoading || livestockEvolutionQuery.isLoading,
    refetch: () => {
      statsQuery.refetch();
      harvestTrendQuery.refetch();
      livestockEvolutionQuery.refetch();
      alertsQuery.refetch();
    },
  };
}
