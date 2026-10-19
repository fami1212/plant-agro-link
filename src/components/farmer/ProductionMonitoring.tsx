import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Wheat, Wallet, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { budgetTotals, yieldPerHectare } from '@/lib/production';
import type { Tables } from '@/integrations/supabase/types';

type Budget = Tables<'production_budgets'>;
const money = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
const emptyBudget = { field_id: '', label: '', category: 'semences', planned_amount: '', actual_amount: '', budget_date: new Date().toISOString().slice(0, 10) };

export function ProductionMonitoring({ view }: { view: 'yield' | 'budget' | 'alerts' }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['production-monitoring', user?.id];
  const [form, setForm] = useState(emptyBudget);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [metric, setMetric] = useState('soil_moisture');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('Connexion requise');
      const results = await Promise.all([
        supabase.from('fields').select('id,name,area_hectares').eq('user_id', user.id),
        supabase.from('crops').select('id,field_id,expected_yield_kg').eq('user_id', user.id),
        supabase.from('harvest_records').select('crop_id,quantity_kg').eq('user_id', user.id),
        supabase.from('production_budgets').select('*').eq('user_id', user.id).order('budget_date', { ascending: false }),
        supabase.from('iot_devices').select('id,name,field_id,last_seen_at,is_active').eq('owner_id', user.id),
        supabase.from('device_data').select('device_id,metric,value,unit,recorded_at').order('recorded_at', { ascending: false }).limit(500),
        supabase.from('iot_alert_configs').select('*').eq('user_id', user.id),
        supabase.from('iot_alerts').select('*').eq('user_id', user.id).eq('is_resolved', false).order('created_at', { ascending: false }),
      ]);
      for (const result of results) if (result.error) throw result.error;
      const [fields, crops, harvests, budgets, devices, readings, configs, alerts] = results;
      return { fields: fields.data ?? [], crops: crops.data ?? [], harvests: harvests.data ?? [], budgets: budgets.data ?? [], devices: devices.data ?? [], readings: readings.data ?? [], configs: configs.data ?? [], alerts: alerts.data ?? [] };
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`production-${user.id}`);
    for (const table of ['fields', 'crops', 'harvest_records', 'production_budgets', 'iot_devices', 'device_data', 'iot_alert_configs', 'iot_alerts']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => { queryClient.invalidateQueries({ queryKey: ['production-monitoring', user.id] }); });
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  useEffect(() => {
    const config = data?.configs.find(c => c.device_id === selectedDevice && c.metric === metric);
    setMin(config?.min_value?.toString() ?? '');
    setMax(config?.max_value?.toString() ?? '');
  }, [selectedDevice, metric, data?.configs]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const saveBudget = async () => {
    if (!user || busy) return;
    if (!form.field_id || !form.label.trim() || !form.planned_amount || !form.actual_amount || !form.budget_date) return toast.error('Complétez les informations du budget');
    const planned = Number(form.planned_amount), actual = Number(form.actual_amount);
    if (!Number.isFinite(planned) || !Number.isFinite(actual) || planned < 0 || actual < 0) return toast.error('Les montants doivent être positifs ou nuls');
    setBusy(true);
    try {
      const payload = { ...form, user_id: user.id, label: form.label.trim(), planned_amount: planned, actual_amount: actual };
      const result = editing ? await supabase.from('production_budgets').update(payload).eq('id', editing.id).eq('user_id', user.id) : await supabase.from('production_budgets').insert(payload);
      if (result.error) throw result.error;
      await refresh(); setDialog(false); toast.success('Budget enregistré');
    } catch { toast.error('Impossible d’enregistrer le budget'); } finally { setBusy(false); }
  };
  const saveThreshold = async () => {
    if (!user || busy) return;
    const minimum = min.trim() ? Number(min) : null, maximum = max.trim() ? Number(max) : null;
    if (!selectedDevice || (minimum === null && maximum === null)) return toast.error('Choisissez un capteur et au moins un seuil');
    if ((minimum !== null && !Number.isFinite(minimum)) || (maximum !== null && !Number.isFinite(maximum)) || (minimum !== null && maximum !== null && minimum > maximum)) return toast.error('Seuils invalides : minimum ≤ maximum');
    setBusy(true);
    try {
      const existing = data?.configs.find(c => c.device_id === selectedDevice && c.metric === metric);
      const payload = { user_id: user.id, device_id: selectedDevice, metric, min_value: minimum, max_value: maximum, is_enabled: true };
      const result = existing ? await supabase.from('iot_alert_configs').update(payload).eq('id', existing.id) : await supabase.from('iot_alert_configs').insert(payload);
      if (result.error) throw result.error;
      await refresh(); toast.success('Seuils enregistrés');
    } catch { toast.error('Impossible d’enregistrer les seuils'); } finally { setBusy(false); }
  };

  if (isLoading) return <p className="text-muted-foreground py-8">Chargement…</p>;
  if (error || !data) return <div role="alert" className="space-y-3"><p className="text-destructive">Chargement des données impossible</p><Button variant="outline" onClick={refresh}>Réessayer</Button></div>;
  const totals = budgetTotals(data.budgets);

  return <section className="space-y-5">
    {view === 'yield' && <>
      <h2 className="text-lg font-semibold flex items-center gap-2"><Wheat className="w-5 h-5 text-primary" /> Rendement par parcelle</h2>
      {data.fields.length === 0 && <p className="text-muted-foreground">Aucune parcelle enregistrée</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {data.fields.map(field => {
          const crops = data.crops.filter(c => c.field_id === field.id);
          const ids = new Set(crops.map(c => c.id));
          const kg = data.harvests.filter(h => ids.has(h.crop_id)).reduce((sum, h) => sum + Number(h.quantity_kg), 0);
          const expected = crops.reduce((sum, c) => sum + Number(c.expected_yield_kg ?? 0), 0);
          const yieldKg = yieldPerHectare(kg, Number(field.area_hectares));
          const deviceIds = new Set(data.devices.filter(d => d.field_id === field.id).map(d => d.id));
          const latest = new Map<string, typeof data.readings[number]>();
          data.readings.filter(r => deviceIds.has(r.device_id)).forEach(r => { if (!latest.has(`${r.device_id}:${r.metric}`)) latest.set(`${r.device_id}:${r.metric}`, r); });
          return <Card key={field.id} className="p-4 space-y-3 rounded-lg">
            <div className="flex justify-between gap-2"><h3 className="font-semibold">{field.name}</h3><Badge variant="secondary">{field.area_hectares} ha</Badge></div>
            <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Récolté · cumul</dt><dd className="text-xl font-semibold">{kg.toLocaleString('fr-FR')} kg</dd></div><div><dt className="text-muted-foreground">Rendement · cumul</dt><dd className="text-xl font-semibold">{yieldKg === null ? '—' : yieldKg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg/ha</dd></div><div><dt className="text-muted-foreground">Prévision des cultures</dt><dd>{expected.toLocaleString('fr-FR')} kg</dd></div></dl>
            <div className="border-t pt-3 text-sm space-y-1">
              {latest.size === 0 && <p className="text-muted-foreground">Aucun relevé de capteur associé</p>}
              {Array.from(latest.values()).map(r => <div key={`${r.device_id}:${r.metric}`} className="flex justify-between flex-wrap gap-1"><span>{r.metric} · {r.value} {r.unit}</span><time className="text-xs text-muted-foreground">{new Date(r.recorded_at).toLocaleString('fr-FR')}</time></div>)}
            </div>
          </Card>;
        })}
      </div>
    </>}
    {view === 'budget' && <>
      <div className="flex justify-between items-center gap-2"><h2 className="text-lg font-semibold flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Budget de production</h2><Button size="icon" aria-label="Ajouter un budget" onClick={() => { setEditing(null); setForm(emptyBudget); setDialog(true); }}><Plus className="w-4 h-4" /></Button></div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y py-4"><div><dt className="text-muted-foreground text-sm">Prévu</dt><dd className="font-semibold">{money(totals.planned)}</dd></div><div><dt className="text-muted-foreground text-sm">Dépensé</dt><dd className="font-semibold">{money(totals.actual)}</dd></div><div><dt className="text-muted-foreground text-sm">Solde du budget</dt><dd className={totals.remaining < 0 ? 'text-destructive font-semibold' : 'text-primary font-semibold'}>{money(totals.remaining)}</dd></div></dl>
      {data.budgets.length === 0 && <p className="text-muted-foreground">Aucune dépense de production enregistrée</p>}
      {data.budgets.map(b => <div key={b.id} className="flex justify-between items-center gap-3 border-b pb-3"><div className="min-w-0"><p className="font-medium break-words">{b.label}</p><p className="text-xs text-muted-foreground">{data.fields.find(f => f.id === b.field_id)?.name} · {b.category} · {b.budget_date}</p><p className="text-sm">Prévu {money(b.planned_amount)} · Dépensé {money(b.actual_amount)}</p></div><div className="flex shrink-0"><Button size="icon" variant="ghost" aria-label={`Modifier ${b.label}`} onClick={() => { setEditing(b); setForm({ field_id: b.field_id, label: b.label, category: b.category, planned_amount: String(b.planned_amount), actual_amount: String(b.actual_amount), budget_date: b.budget_date }); setDialog(true); }}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" aria-label={`Supprimer ${b.label}`} onClick={async () => { if (!confirm('Supprimer cette dépense ?')) return; const result = await supabase.from('production_budgets').delete().eq('id', b.id); if (result.error) toast.error('Suppression impossible'); else await refresh(); }}><Trash2 className="w-4 h-4 text-destructive" /></Button></div></div>)}
      <Dialog open={dialog} onOpenChange={setDialog}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Modifier la dépense' : 'Nouvelle dépense de production'}</DialogTitle></DialogHeader><div className="space-y-3">
        <Label>Parcelle</Label><Select value={form.field_id} onValueChange={value => setForm({ ...form, field_id: value })}><SelectTrigger aria-label="Parcelle du budget"><SelectValue placeholder="Choisir une parcelle" /></SelectTrigger><SelectContent>{data.fields.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select>
        <Label htmlFor="budget-label">Dépense</Label><Input id="budget-label" value={form.label} maxLength={200} onChange={e => setForm({ ...form, label: e.target.value })} />
        <Label>Catégorie</Label><Select value={form.category} onValueChange={value => setForm({ ...form, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['semences', 'engrais', 'irrigation', 'main_oeuvre', 'materiel', 'transport', 'autre'].map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
        <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="budget-planned">Prévu (FCFA)</Label><Input id="budget-planned" type="number" min="0" value={form.planned_amount} onChange={e => setForm({ ...form, planned_amount: e.target.value })} /></div><div><Label htmlFor="budget-actual">Dépensé (FCFA)</Label><Input id="budget-actual" type="number" min="0" value={form.actual_amount} onChange={e => setForm({ ...form, actual_amount: e.target.value })} /></div></div>
        <Label htmlFor="budget-date">Date</Label><Input id="budget-date" type="date" value={form.budget_date} onChange={e => setForm({ ...form, budget_date: e.target.value })} />
        <Button onClick={saveBudget} disabled={busy || data.fields.length === 0}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </div></DialogContent></Dialog>
    </>}
    {view === 'alerts' && <>
      <h2 className="text-lg font-semibold flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Alertes de seuil</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Capteur</Label><Select value={selectedDevice} onValueChange={setSelectedDevice}><SelectTrigger aria-label="Capteur des seuils"><SelectValue placeholder="Choisir un capteur" /></SelectTrigger><SelectContent>{data.devices.map(d => <SelectItem key={d.id} value={d.id}>{d.name ?? 'Capteur'}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Mesure</Label><Select value={metric} onValueChange={setMetric}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['soil_moisture', 'humidity', 'temperature', 'ph', 'light', 'wind_speed', 'rainfall'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="threshold-min">Minimum</Label><Input id="threshold-min" type="number" step="any" value={min} onChange={e => setMin(e.target.value)} /></div><div><Label htmlFor="threshold-max">Maximum</Label><Input id="threshold-max" type="number" step="any" value={max} onChange={e => setMax(e.target.value)} /></div>
      </div><Button onClick={saveThreshold} disabled={busy || !selectedDevice}>{busy ? 'Enregistrement…' : 'Enregistrer les seuils'}</Button>
      {data.configs.map(c => <div key={c.id} className="flex justify-between items-center border-b py-2 gap-2 text-sm"><div>{data.devices.find(d => d.id === c.device_id)?.name ?? 'Tous les capteurs'} · {c.metric}<p className="text-muted-foreground">{c.min_value ?? '—'} à {c.max_value ?? '—'}</p></div><Button variant="outline" size="sm" onClick={async () => { const r = await supabase.from('iot_alert_configs').update({ is_enabled: !c.is_enabled }).eq('id', c.id); if (r.error) toast.error('Modification impossible'); else await refresh(); }}>{c.is_enabled ? 'Désactiver' : 'Activer'}</Button></div>)}
      <h3 className="font-semibold">Alertes ouvertes · {data.alerts.length}</h3>
      {data.alerts.length === 0 && <p className="text-muted-foreground">Aucune alerte ouverte</p>}
      {data.alerts.map(a => <Card key={a.id} className="p-3 rounded-lg border-destructive/30 space-y-2"><p className="font-medium">{data.devices.find(d => d.id === a.device_id)?.name ?? 'Capteur'}</p><p className="text-sm text-destructive">{a.message}</p><p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString('fr-FR')}</p><Button variant="outline" size="sm" onClick={async () => { const r = await supabase.from('iot_alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', a.id); if (r.error) toast.error('Modification impossible'); else await refresh(); }}>Clôturer l’alerte</Button></Card>)}
    </>}
  </section>;
}