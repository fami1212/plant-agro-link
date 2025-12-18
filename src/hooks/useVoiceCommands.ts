import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface VoiceCommand {
  patterns: RegExp[];
  action: () => void | Promise<void>;
  response: string;
}

export function useVoiceCommands() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const commands: VoiceCommand[] = [
    // Navigation commands
    {
      patterns: [
        /accueil|dashboard|tableau de bord/i,
        /go home|home/i,
      ],
      action: () => navigate("/dashboard"),
      response: "Je vous amène au tableau de bord",
    },
    {
      patterns: [
        /parcelle|champ|terrain/i,
        /field|parcel/i,
      ],
      action: () => navigate("/parcelles"),
      response: "Voici vos parcelles",
    },
    {
      patterns: [
        /culture|plantation|récolte/i,
        /crop|harvest/i,
      ],
      action: () => navigate("/cultures"),
      response: "Voici vos cultures",
    },
    {
      patterns: [
        /bétail|animal|vache|mouton|chèvre/i,
        /livestock|cattle|sheep|goat/i,
      ],
      action: () => navigate("/betail"),
      response: "Voici votre bétail",
    },
    {
      patterns: [
        /marché|marketplace|vendre|acheter/i,
        /market|buy|sell/i,
      ],
      action: () => navigate("/marketplace"),
      response: "Voici le marketplace",
    },
    {
      patterns: [
        /capteur|iot|sensor/i,
      ],
      action: () => navigate("/iot"),
      response: "Voici vos capteurs IoT",
    },
    {
      patterns: [
        /paramètre|réglage|setting/i,
      ],
      action: () => navigate("/settings"),
      response: "Voici les paramètres",
    },
    {
      patterns: [
        /intelligence|ia|ai|assistant/i,
      ],
      action: () => navigate("/ia"),
      response: "Voici les outils d'intelligence artificielle",
    },
    {
      patterns: [
        /vocal|voix|parler/i,
        /voice/i,
      ],
      action: () => navigate("/voice"),
      response: "Mode vocal activé",
    },
  ];

  const processCommand = useCallback((transcript: string): { matched: boolean; response?: string } => {
    const lowerTranscript = transcript.toLowerCase();
    
    for (const command of commands) {
      for (const pattern of command.patterns) {
        if (pattern.test(lowerTranscript)) {
          command.action();
          return { matched: true, response: command.response };
        }
      }
    }
    
    return { matched: false };
  }, [navigate]);

  const getQuickCommands = useCallback(() => [
    { label: "Tableau de bord", command: "tableau de bord" },
    { label: "Mes parcelles", command: "mes parcelles" },
    { label: "Mes cultures", command: "mes cultures" },
    { label: "Mon bétail", command: "mon bétail" },
    { label: "Marketplace", command: "marketplace" },
    { label: "Capteurs IoT", command: "mes capteurs" },
  ], []);

  return {
    processCommand,
    getQuickCommands,
  };
}
