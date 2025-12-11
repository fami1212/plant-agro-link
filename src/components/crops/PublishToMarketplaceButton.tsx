import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Store, ArrowUpRight } from "lucide-react";
import { ListingForm } from "@/components/marketplace/ListingForm";

interface PublishButtonProps {
  harvestRecord: {
    id: string;
    crop_id: string;
    quantity_kg: number;
    quality_grade: string | null;
    harvest_date: string;
  };
  crop: {
    id: string;
    name: string;
    variety: string | null;
    field_id: string;
    crop_type: string;
  };
  onSuccess?: () => void;
}

const cropTypeToCategory: Record<string, string> = {
  cereale: "Céréales",
  legumineuse: "Légumineuses",
  oleagineux: "Autre",
  tubercule: "Légumes",
  maraicher: "Légumes",
  fruitier: "Fruits",
  fourrage: "Autre",
  autre: "Autre",
};

export function PublishToMarketplaceButton({ harvestRecord, crop, onSuccess }: PublishButtonProps) {
  const [showForm, setShowForm] = useState(false);

  const prefilledData = {
    harvestRecordId: harvestRecord.id,
    cropId: crop.id,
    fieldId: crop.field_id,
    title: `${crop.name}${crop.variety ? ` - ${crop.variety}` : ""} (${harvestRecord.quality_grade || "Qualité standard"})`,
    quantity: `${harvestRecord.quantity_kg} kg`,
    category: cropTypeToCategory[crop.crop_type] || "Autre",
  };

  return (
    <>
      <Button 
        variant="accent" 
        size="sm" 
        onClick={() => setShowForm(true)}
        className="gap-1.5"
      >
        <Store className="w-4 h-4" />
        Publier
        <ArrowUpRight className="w-3 h-3" />
      </Button>
      
      <ListingForm
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={() => {
          setShowForm(false);
          onSuccess?.();
        }}
        prefilledData={prefilledData}
      />
    </>
  );
}
