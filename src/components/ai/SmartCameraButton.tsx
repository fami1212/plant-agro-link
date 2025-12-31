import { useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartCamera } from "./SmartCamera";
import { cn } from "@/lib/utils";

interface SmartCameraButtonProps {
  context?: "cultures" | "parcelles" | "betail" | "recoltes" | "general";
  variant?: "default" | "fab" | "icon" | "outline";
  onActionComplete?: (result: any) => void;
  className?: string;
}

export function SmartCameraButton({ 
  context = "general", 
  variant = "default",
  onActionComplete,
  className 
}: SmartCameraButtonProps) {
  const [open, setOpen] = useState(false);

  const getLabel = () => {
    switch (context) {
      case "cultures": return "Scanner une culture";
      case "parcelles": return "Scanner le terrain";
      case "betail": return "Scanner un animal";
      case "recoltes": return "Évaluer maturité";
      default: return "Scanner avec IA";
    }
  };

  if (variant === "fab") {
    return (
      <>
        <Button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full shadow-lg",
            "bg-gradient-to-r from-primary to-primary/80",
            className
          )}
          size="icon"
        >
          <div className="relative">
            <Camera className="w-6 h-6" />
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300" />
          </div>
        </Button>
        <SmartCamera 
          open={open} 
          onOpenChange={setOpen} 
          context={context}
          onActionComplete={onActionComplete}
        />
      </>
    );
  }

  if (variant === "icon") {
    return (
      <>
        <Button
          onClick={() => setOpen(true)}
          variant="ghost"
          size="icon"
          className={className}
        >
          <Camera className="w-5 h-5" />
        </Button>
        <SmartCamera 
          open={open} 
          onOpenChange={setOpen} 
          context={context}
          onActionComplete={onActionComplete}
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={variant === "outline" ? "outline" : "default"}
        className={cn("gap-2", className)}
      >
        <Camera className="w-4 h-4" />
        <Sparkles className="w-3 h-3" />
        {getLabel()}
      </Button>
      <SmartCamera 
        open={open} 
        onOpenChange={setOpen} 
        context={context}
        onActionComplete={onActionComplete}
      />
    </>
  );
}
