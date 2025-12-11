import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Leaf, 
  MapPin, 
  Calendar, 
  Droplets,
  Thermometer,
  ShieldCheck,
  Sprout,
  Package
} from "lucide-react";

interface CertificateProps {
  data: {
    lotId: string;
    productName: string;
    variety?: string;
    fieldName?: string;
    fieldLocation?: string;
    soilType?: string;
    sowingDate?: string;
    harvestDate?: string;
    quantity?: number;
    qualityGrade?: string;
    iotData?: {
      avgHumidity?: number;
      avgTemperature?: number;
      irrigationCount?: number;
    };
    blockchainHash?: string;
  };
}

const qualityColors: Record<string, string> = {
  excellent: "bg-success text-success-foreground",
  bon: "bg-primary text-primary-foreground",
  moyen: "bg-amber-500 text-white",
  faible: "bg-muted text-muted-foreground",
};

export function TraceabilityCertificate({ data }: CertificateProps) {
  return (
    <Card className="overflow-hidden border-2 border-primary/20">
      {/* Header */}
      <div className="gradient-hero p-4 text-primary-foreground">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            <span className="font-bold text-lg">PLANTÉRA</span>
          </div>
          <Badge className="bg-white/20 text-white border-white/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Certifié
          </Badge>
        </div>
        <h2 className="text-xl font-bold">Certificat d'Origine</h2>
        <p className="text-sm opacity-90">Traçabilité Blockchain Vérifiable</p>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Product Info */}
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-14 h-14 rounded-xl bg-accent/15 flex items-center justify-center">
            <Leaf className="w-7 h-7 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">{data.productName}</h3>
            {data.variety && (
              <p className="text-sm text-muted-foreground">Variété: {data.variety}</p>
            )}
            <code className="text-xs text-primary font-mono">{data.lotId}</code>
          </div>
          {data.qualityGrade && (
            <Badge className={qualityColors[data.qualityGrade] || "bg-muted"}>
              {data.qualityGrade}
            </Badge>
          )}
        </div>

        {/* Origin Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Origine
          </h4>
          <div className="grid grid-cols-2 gap-3 pl-6">
            {data.fieldName && (
              <div>
                <p className="text-xs text-muted-foreground">Parcelle</p>
                <p className="text-sm font-medium">{data.fieldName}</p>
              </div>
            )}
            {data.fieldLocation && (
              <div>
                <p className="text-xs text-muted-foreground">Localisation</p>
                <p className="text-sm font-medium">{data.fieldLocation}</p>
              </div>
            )}
            {data.soilType && (
              <div>
                <p className="text-xs text-muted-foreground">Type de sol</p>
                <p className="text-sm font-medium capitalize">{data.soilType}</p>
              </div>
            )}
          </div>
        </div>

        {/* Production Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Production
          </h4>
          <div className="grid grid-cols-2 gap-3 pl-6">
            {data.sowingDate && (
              <div className="flex items-center gap-2">
                <Sprout className="w-4 h-4 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Semis</p>
                  <p className="text-sm font-medium">
                    {new Date(data.sowingDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            )}
            {data.harvestDate && (
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Récolte</p>
                  <p className="text-sm font-medium">
                    {new Date(data.harvestDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            )}
            {data.quantity && (
              <div>
                <p className="text-xs text-muted-foreground">Quantité</p>
                <p className="text-sm font-medium">{data.quantity} kg</p>
              </div>
            )}
          </div>
        </div>

        {/* IoT Data Section */}
        {data.iotData && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              Données Capteurs
            </h4>
            <div className="grid grid-cols-3 gap-2 pl-6">
              {data.iotData.avgHumidity !== undefined && (
                <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <Droplets className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-blue-600">{data.iotData.avgHumidity}%</p>
                  <p className="text-xs text-muted-foreground">Humidité</p>
                </div>
              )}
              {data.iotData.avgTemperature !== undefined && (
                <div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                  <Thermometer className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-orange-600">{data.iotData.avgTemperature}°C</p>
                  <p className="text-xs text-muted-foreground">Température</p>
                </div>
              )}
              {data.iotData.irrigationCount !== undefined && (
                <div className="text-center p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/30">
                  <Droplets className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-cyan-600">{data.iotData.irrigationCount}</p>
                  <p className="text-xs text-muted-foreground">Irrigations</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Blockchain Hash */}
        {data.blockchainHash && (
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span className="text-xs font-medium text-success">Signature Blockchain</span>
            </div>
            <code className="text-xs font-mono text-foreground break-all block">
              {data.blockchainHash}
            </code>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Ce certificat est émis par la plateforme Plantéra et vérifié par blockchain.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © {new Date().getFullYear()} Plantéra - Agriculture Intelligente
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
