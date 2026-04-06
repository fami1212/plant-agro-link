import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Package, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";

export function StockManager() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stock, setStock] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ product_name: "", quantity: "", unit: "kg", location: "", min_threshold: "10" });

  const fetchStock = async () => {
    if (!user) return;
    const { data } = await supabase.from("logistics_stock").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setStock(data || []);
  };

  useEffect(() => { fetchStock(); }, [user]);

  const resetForm = () => setForm({ product_name: "", quantity: "", unit: "kg", location: "", min_threshold: "10" });

  const handleAdd = async () => {
    if (!user || !form.product_name || !form.quantity) return;
    const { error } = await supabase.from("logistics_stock").insert({
      user_id: user.id,
      product_name: form.product_name,
      quantity: parseFloat(form.quantity),
      unit: form.unit,
      location: form.location || null,
      min_threshold: parseFloat(form.min_threshold) || 0,
    });
    if (error) { toast.error(t("common.error")); return; }
    toast.success(t("logistics.stockAdded"));
    setShowAdd(false);
    resetForm();
    fetchStock();
  };

  const handleEdit = async () => {
    if (!editItem || !form.product_name || !form.quantity) return;
    const { error } = await supabase.from("logistics_stock").update({
      product_name: form.product_name,
      quantity: parseFloat(form.quantity),
      unit: form.unit,
      location: form.location || null,
      min_threshold: parseFloat(form.min_threshold) || 0,
    }).eq("id", editItem.id);
    if (error) { toast.error(t("common.error")); return; }
    toast.success(t("logistics.stockUpdated"));
    setEditItem(null);
    resetForm();
    fetchStock();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("logistics_stock").delete().eq("id", id);
    if (error) { toast.error(t("common.error")); return; }
    toast.success(t("logistics.stockDeleted"));
    fetchStock();
  };

  const openEdit = (item: any) => {
    setForm({
      product_name: item.product_name,
      quantity: String(item.quantity),
      unit: item.unit || "kg",
      location: item.location || "",
      min_threshold: String(item.min_threshold || 0),
    });
    setEditItem(item);
  };

  const StockForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-3">
      <Input placeholder={t("logistics.productName")} value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
      <div className="flex gap-2">
        <Input type="number" placeholder={t("logistics.quantity")} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
        <Input placeholder={t("logistics.unit")} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-20" />
      </div>
      <Input placeholder={t("logistics.location")} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
      <Input type="number" placeholder={t("logistics.minThreshold")} value={form.min_threshold} onChange={e => setForm({ ...form, min_threshold: e.target.value })} />
      <Button className="w-full" onClick={onSubmit}>{submitLabel}</Button>
    </div>
  );

  return (
    <div className="space-y-3">
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="w-full rounded-xl gap-2"><Plus className="w-4 h-4" />{t("logistics.addStock")}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("logistics.addStock")}</DialogTitle></DialogHeader>
          <StockForm onSubmit={handleAdd} submitLabel={t("common.create")} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) { setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("logistics.editStock")}</DialogTitle></DialogHeader>
          <StockForm onSubmit={handleEdit} submitLabel={t("common.save")} />
        </DialogContent>
      </Dialog>

      {stock.length === 0 ? (
        <EmptyState title={t("logistics.noStock")} description={t("logistics.noStockDesc")} />
      ) : (
        stock.map(item => {
          const isLow = item.quantity <= item.min_threshold;
          return (
            <div key={item.id} className={cn("bg-card rounded-2xl border p-4 flex items-center gap-3", isLow ? "border-amber-300 dark:border-amber-700" : "border-border/30")}>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isLow ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10")}>
                {isLow ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <Package className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">{item.location || "—"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={cn("font-bold text-sm", isLow && "text-amber-600")}>{item.quantity} {item.unit}</p>
                {isLow && <p className="text-[10px] text-amber-600">{t("logistics.lowStock")}</p>}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
