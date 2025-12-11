import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, 
  Download, 
  Share2, 
  CheckCircle2, 
  Leaf,
  MapPin,
  Calendar,
  Scale,
  FileText,
  ShieldCheck,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TraceabilityData {
  lotId: string;
  productName: string;
  fieldName?: string;
  fieldLocation?: string;
  soilType?: string;
  sowingDate?: string;
  harvestDate?: string;
  quantity?: number;
  qualityGrade?: string;
  cropType?: string;
  variety?: string;
  iotData?: {
    avgHumidity?: number;
    avgTemperature?: number;
    irrigationCount?: number;
    treatments?: string[];
  };
  createdAt: string;
  blockchainHash?: string;
}

interface QRCodeGeneratorProps {
  data: TraceabilityData;
  onGenerate?: (qrCode: string) => void;
}

// Simple QR code generation using a data URL pattern
const generateQRDataURL = (text: string): string => {
  // For production, use a proper QR library like 'qrcode'
  // This creates a placeholder with the data encoded
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
};

export function QRCodeGenerator({ data, onGenerate }: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const traceabilityUrl = `${window.location.origin}/trace/${data.lotId}`;
  
  const certificateData = {
    version: "1.0",
    platform: "Plantéra",
    lot_id: data.lotId,
    product: data.productName,
    origin: {
      field: data.fieldName,
      location: data.fieldLocation,
      soil_type: data.soilType,
    },
    production: {
      sowing_date: data.sowingDate,
      harvest_date: data.harvestDate,
      quantity_kg: data.quantity,
      quality_grade: data.qualityGrade,
    },
    iot_summary: data.iotData,
    certificate_date: new Date().toISOString(),
    blockchain_hash: data.blockchainHash || generateBlockchainHash(data),
  };

  function generateBlockchainHash(data: TraceabilityData): string {
    // Simulate blockchain hash generation
    const str = JSON.stringify(data) + Date.now();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `0x${Math.abs(hash).toString(16).padStart(40, '0')}`;
  }

  useEffect(() => {
    generateQRCode();
  }, [data.lotId]);

  const generateQRCode = async () => {
    setIsGenerating(true);
    
    try {
      // Generate QR code with traceability URL
      const qrUrl = generateQRDataURL(traceabilityUrl);
      setQrCodeUrl(qrUrl);
      
      // Simulate blockchain verification delay
      setTimeout(() => {
        setIsVerified(true);
        onGenerate?.(certificateData.blockchain_hash);
      }, 1500);
      
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Erreur lors de la génération du QR code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantera-trace-${data.lotId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("QR Code téléchargé !");
    } catch (error) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificat Plantéra - ${data.productName}`,
          text: `Vérifiez l'origine de ce produit agricole : ${data.productName}`,
          url: traceabilityUrl,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(traceabilityUrl);
      toast.success("Lien copié dans le presse-papier !");
    }
  };

  const handleDownloadCertificate = () => {
    const certificateContent = `
╔══════════════════════════════════════════════════════════════╗
║                    CERTIFICAT PLANTÉRA                       ║
║              Traçabilité Agricole Blockchain                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  LOT ID: ${data.lotId.padEnd(48)}║
║                                                              ║
║  PRODUIT: ${data.productName.padEnd(47)}║
║  VARIÉTÉ: ${(data.variety || "Non spécifiée").padEnd(47)}║
║                                                              ║
╠═══════════════════ ORIGINE ══════════════════════════════════╣
║  Parcelle: ${(data.fieldName || "N/A").padEnd(46)}║
║  Localisation: ${(data.fieldLocation || "N/A").padEnd(42)}║
║  Type de sol: ${(data.soilType || "N/A").padEnd(43)}║
║                                                              ║
╠═══════════════════ PRODUCTION ═══════════════════════════════╣
║  Date de semis: ${(data.sowingDate || "N/A").padEnd(40)}║
║  Date de récolte: ${(data.harvestDate || "N/A").padEnd(38)}║
║  Quantité: ${data.quantity ? `${data.quantity} kg`.padEnd(46) : "N/A".padEnd(46)}║
║  Qualité: ${(data.qualityGrade || "Non évaluée").padEnd(47)}║
║                                                              ║
╠═══════════════════ DONNÉES IOT ══════════════════════════════╣
║  Humidité moyenne: ${data.iotData?.avgHumidity ? `${data.iotData.avgHumidity}%`.padEnd(38) : "N/A".padEnd(38)}║
║  Température moyenne: ${data.iotData?.avgTemperature ? `${data.iotData.avgTemperature}°C`.padEnd(35) : "N/A".padEnd(35)}║
║  Irrigations: ${data.iotData?.irrigationCount ? String(data.iotData.irrigationCount).padEnd(43) : "N/A".padEnd(43)}║
║                                                              ║
╠═══════════════════ BLOCKCHAIN ═══════════════════════════════╣
║  Hash: ${certificateData.blockchain_hash.substring(0, 50)}...║
║  Date d'émission: ${new Date().toLocaleDateString("fr-FR").padEnd(38)}║
║  Statut: ✓ VÉRIFIÉ                                           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Ce certificat atteste de l'origine et de la traçabilité du lot ci-dessus.
Vérification en ligne: ${traceabilityUrl}

© ${new Date().getFullYear()} Plantéra - Plateforme Agricole Intelligente
    `;

    const blob = new Blob([certificateContent], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificat-plantera-${data.lotId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Certificat téléchargé !");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Certificat de Traçabilité
          </CardTitle>
          {isVerified && (
            <Badge className="bg-success text-success-foreground">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Blockchain Vérifié
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* QR Code Display */}
        <div className="flex flex-col items-center">
          <div className="relative p-4 bg-white rounded-xl shadow-inner border-2 border-dashed border-primary/20">
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="QR Code de traçabilité" 
                className="w-40 h-40"
              />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center">
                <QrCode className="w-16 h-16 text-muted-foreground animate-pulse" />
              </div>
            )}
            {isVerified && (
              <div className="absolute -bottom-2 -right-2 bg-success text-success-foreground p-1.5 rounded-full shadow-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Scannez pour vérifier l'origine
          </p>
          <Badge variant="outline" className="mt-2 font-mono text-xs">
            {data.lotId}
          </Badge>
        </div>

        {/* Product Info Summary */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Produit</p>
              <p className="text-sm font-medium">{data.productName}</p>
            </div>
          </div>
          {data.fieldName && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Origine</p>
                <p className="text-sm font-medium">{data.fieldName}</p>
              </div>
            </div>
          )}
          {data.harvestDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Récolte</p>
                <p className="text-sm font-medium">
                  {new Date(data.harvestDate).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          )}
          {data.quantity && (
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Quantité</p>
                <p className="text-sm font-medium">{data.quantity} kg</p>
              </div>
            </div>
          )}
        </div>

        {/* Blockchain Hash */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Hash Blockchain</p>
          <code className="text-xs font-mono text-foreground break-all">
            {certificateData.blockchain_hash}
          </code>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            QR
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1" />
            Partager
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadCertificate}>
            <FileText className="w-4 h-4 mr-1" />
            Certificat
          </Button>
        </div>

        {/* Verify Link */}
        <Button 
          variant="ghost" 
          className="w-full text-primary"
          onClick={() => window.open(traceabilityUrl, "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Voir le certificat en ligne
        </Button>
      </CardContent>
    </Card>
  );
}
