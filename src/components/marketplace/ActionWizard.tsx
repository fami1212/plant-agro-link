import { ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  canContinue?: boolean;
}

interface ActionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  steps: WizardStep[];
  onComplete: () => void | Promise<void>;
  completeLabel?: string;
  loading?: boolean;
}

export function ActionWizard({
  open,
  onOpenChange,
  title,
  steps,
  onComplete,
  completeLabel = "Confirmer",
  loading = false,
}: ActionWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = async () => {
    if (isLast) {
      await onComplete();
      setCurrentStep(0);
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  const handleClose = (next: boolean) => {
    if (!next) setCurrentStep(0);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">{title}</span>
            <span>
              Étape {currentStep + 1} / {steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-1" />
          <DialogTitle className="text-lg pt-1">{step.title}</DialogTitle>
          {step.description && (
            <p className="text-sm text-muted-foreground">{step.description}</p>
          )}
        </DialogHeader>

        <div className="px-5 py-3 max-h-[55vh] overflow-y-auto">
          {step.content}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-2 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={isFirst || loading}
            className={cn(isFirst && "invisible")}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          <Button
            size="sm"
            onClick={handleNext}
            disabled={step.canContinue === false || loading}
            className="min-w-[120px]"
          >
            {loading ? (
              "..."
            ) : isLast ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                {completeLabel}
              </>
            ) : (
              <>
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}