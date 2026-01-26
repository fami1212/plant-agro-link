import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  CheckCircle2,
  X,
  Phone,
  MessageCircle,
  MapPin,
  User,
  AlertCircle,
  CalendarClock,
  Loader2,
} from "lucide-react";
import { format, isToday, isTomorrow, isPast, isFuture, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/EmptyState";

interface Booking {
  id: string;
  client_id: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  description: string | null;
  client_name?: string;
  client_phone?: string;
  notes?: string | null;
}

interface VetAppointmentsListProps {
  bookings: Booking[];
  onUpdateStatus: (id: string, status: string, notes?: string) => Promise<void>;
  onContactClient?: (phone: string, method: "call" | "whatsapp") => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  en_attente: { label: "En attente", color: "bg-warning/10 text-warning border-warning/30", icon: <Clock className="w-3 h-3" /> },
  confirme: { label: "Confirmé", color: "bg-primary/10 text-primary border-primary/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  termine: { label: "Terminé", color: "bg-success/10 text-success border-success/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  annule: { label: "Annulé", color: "bg-muted text-muted-foreground border-muted", icon: <X className="w-3 h-3" /> },
};

const serviceTypes: Record<string, { label: string; color: string }> = {
  consultation: { label: "Consultation", color: "bg-blue-500/10 text-blue-600" },
  vaccination: { label: "Vaccination", color: "bg-green-500/10 text-green-600" },
  urgence: { label: "Urgence", color: "bg-destructive/10 text-destructive" },
  suivi: { label: "Suivi", color: "bg-purple-500/10 text-purple-600" },
  chirurgie: { label: "Chirurgie", color: "bg-amber-500/10 text-amber-600" },
};

export function VetAppointmentsList({ bookings, onUpdateStatus, onContactClient }: VetAppointmentsListProps) {
  const [activeTab, setActiveTab] = useState("pending");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const pendingBookings = bookings.filter((b) => b.status === "en_attente");
  const confirmedBookings = bookings.filter((b) => b.status === "confirme");
  const completedBookings = bookings.filter((b) => b.status === "termine" || b.status === "annule");

  const todayBookings = bookings.filter(
    (b) => isToday(parseISO(b.scheduled_date)) && b.status !== "annule"
  );

  const handleConfirm = async (id: string) => {
    setLoading(id);
    try {
      await onUpdateStatus(id, "confirme");
    } finally {
      setLoading(null);
    }
  };

  const handleComplete = async (id: string) => {
    setLoading(id);
    try {
      await onUpdateStatus(id, "termine");
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    setLoading(selectedBooking.id);
    try {
      await onUpdateStatus(selectedBooking.id, "annule", cancelReason);
      setCancelDialogOpen(false);
      setCancelReason("");
      setSelectedBooking(null);
    } finally {
      setLoading(null);
    }
  };

  const openCancelDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return "Demain";
    if (isPast(date)) return "Passé";
    return format(date, "EEEE d MMMM", { locale: fr });
  };

  const renderBookingCard = (booking: Booking, index: number) => {
    const status = statusConfig[booking.status] || statusConfig.en_attente;
    const serviceType = serviceTypes[booking.service_type] || { label: booking.service_type, color: "bg-muted" };
    const isUrgent = booking.service_type === "urgence";
    const dateLabel = getDateLabel(booking.scheduled_date);

    return (
      <Card
        key={booking.id}
        className={cn(
          "animate-fade-in transition-all",
          `stagger-${(index % 5) + 1}`,
          isUrgent && "border-destructive/50 bg-destructive/5"
        )}
        style={{ opacity: 0 }}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{booking.client_name || "Client"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge className={serviceType.color}>{serviceType.label}</Badge>
              <Badge className={status.color}>
                {status.icon}
                <span className="ml-1">{status.label}</span>
              </Badge>
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span className={cn(isToday(parseISO(booking.scheduled_date)) && "text-primary font-medium")}>
                {dateLabel}
              </span>
            </div>
            {booking.scheduled_time && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{booking.scheduled_time}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {booking.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {booking.description}
            </p>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {booking.status === "en_attente" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleConfirm(booking.id)}
                  disabled={loading === booking.id}
                >
                  {loading === booking.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  )}
                  Confirmer
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => openCancelDialog(booking)}
                  disabled={loading === booking.id}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {booking.status === "confirme" && (
              <Button
                size="sm"
                className="w-full"
                variant="outline"
                onClick={() => handleComplete(booking.id)}
                disabled={loading === booking.id}
              >
                {loading === booking.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                )}
                Marquer comme terminé
              </Button>
            )}

            {/* Contact Buttons */}
            {booking.client_phone && booking.status !== "annule" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => window.open(`tel:${booking.client_phone}`)}
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Appeler
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => window.open(`https://wa.me/${booking.client_phone?.replace(/\s/g, "")}`)}
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  WhatsApp
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Today Summary */}
      {todayBookings.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <CalendarClock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-primary">
                {todayBookings.length} RDV aujourd'hui
              </p>
              <p className="text-sm text-muted-foreground">
                {todayBookings.filter((b) => b.status === "en_attente").length} en attente de confirmation
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-11">
          <TabsTrigger value="pending" className="relative text-xs">
            En attente
            {pendingBookings.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-warning text-warning-foreground text-[10px] flex items-center justify-center">
                {pendingBookings.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs">
            Confirmés ({confirmedBookings.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingBookings.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-8 h-8" />}
              title="Aucune demande en attente"
              description="Les nouvelles demandes de RDV apparaîtront ici"
            />
          ) : (
            pendingBookings.map((b, i) => renderBookingCard(b, i))
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-3 mt-4">
          {confirmedBookings.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-8 h-8" />}
              title="Aucun RDV confirmé"
              description="Les RDV confirmés apparaîtront ici"
            />
          ) : (
            confirmedBookings.map((b, i) => renderBookingCard(b, i))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          {completedBookings.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="Aucun historique"
              description="Les RDV passés apparaîtront ici"
            />
          ) : (
            completedBookings.map((b, i) => renderBookingCard(b, i))
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Annuler le RDV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Êtes-vous sûr de vouloir annuler ce rendez-vous avec{" "}
              <strong>{selectedBooking?.client_name}</strong> ?
            </p>
            <div className="space-y-2">
              <Label>Raison de l'annulation (optionnel)</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Indiquez la raison..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Retour
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loading === selectedBooking?.id}
            >
              {loading === selectedBooking?.id && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
