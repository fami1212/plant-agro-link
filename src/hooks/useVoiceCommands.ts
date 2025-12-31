import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface VoiceCommand {
  patterns: RegExp[];
  action: () => void | Promise<void>;
  response: string;
}

export function useVoiceCommands() {
  const navigate = useNavigate();

  const commands: VoiceCommand[] = [
    // Navigation commands - French
    {
      patterns: [
        /accueil|dashboard|tableau de bord|page d'accueil/i,
      ],
      action: () => navigate("/dashboard"),
      response: "Je vous amène au tableau de bord",
    },
    {
      patterns: [
        /parcelle|champ|terrain|mes parcelles/i,
      ],
      action: () => navigate("/parcelles"),
      response: "Voici vos parcelles",
    },
    {
      patterns: [
        /culture|plantation|mes cultures/i,
      ],
      action: () => navigate("/cultures"),
      response: "Voici vos cultures",
    },
    {
      patterns: [
        /récolte|recolte|mes récoltes/i,
      ],
      action: () => navigate("/cultures"),
      response: "Voici la gestion des récoltes",
    },
    {
      patterns: [
        /bétail|betail|animal|animaux|vache|mouton|chèvre/i,
      ],
      action: () => navigate("/betail"),
      response: "Voici votre bétail",
    },
    {
      patterns: [
        /marché|marketplace|vendre|acheter|boutique/i,
      ],
      action: () => navigate("/marketplace"),
      response: "Voici le marketplace",
    },
    {
      patterns: [
        /capteur|iot|sensor|capteurs|objets connectés/i,
      ],
      action: () => navigate("/iot"),
      response: "Voici vos capteurs IoT",
    },
    {
      patterns: [
        /paramètre|réglage|setting|configuration/i,
      ],
      action: () => navigate("/settings"),
      response: "Voici les paramètres",
    },
    {
      patterns: [
        /intelligence|ia|ai|assistant intelligent/i,
      ],
      action: () => navigate("/ia"),
      response: "Voici les outils d'intelligence artificielle",
    },
    {
      patterns: [
        /investissement|investir|financement/i,
      ],
      action: () => navigate("/investisseur"),
      response: "Voici les investissements",
    },
    {
      patterns: [
        /vétérinaire|veterinaire|santé animale/i,
      ],
      action: () => navigate("/veterinaire"),
      response: "Voici l'espace vétérinaire",
    },
    {
      patterns: [
        /traçabilité|tracabilite|trace|qr code/i,
      ],
      action: () => navigate("/trace"),
      response: "Voici la traçabilité des produits",
    },
    // Navigation commands - Wolof
    {
      patterns: [
        /dugub|tool|toolu/i, // parcelle/champ en wolof
      ],
      action: () => navigate("/parcelles"),
      response: "Ngay gis sa tool yi",
    },
    {
      patterns: [
        /mboq|légu|legu/i, // cultures/légumes en wolof
      ],
      action: () => navigate("/cultures"),
      response: "Ngay gis sa mboq yi",
    },
    {
      patterns: [
        /nag|mbeey|xar|bei/i, // vache/mouton en wolof
      ],
      action: () => navigate("/betail"),
      response: "Ngay gis sa mbeey yi",
    },
    {
      patterns: [
        /jaay|jënd/i, // vendre/acheter en wolof
      ],
      action: () => navigate("/marketplace"),
      response: "Ngay gis marketplace bi",
    },
    // Action commands - French
    {
      patterns: [
        /ajouter culture|nouvelle culture|créer culture/i,
      ],
      action: () => {
        navigate("/cultures");
        toast.info("Utilisez la caméra IA pour ajouter une culture");
      },
      response: "Pour ajouter une culture, utilisez la caméra intelligente",
    },
    {
      patterns: [
        /ajouter animal|nouvel animal|enregistrer animal/i,
      ],
      action: () => {
        navigate("/betail");
        toast.info("Utilisez la caméra IA pour identifier un animal");
      },
      response: "Pour ajouter un animal, utilisez la caméra intelligente",
    },
    {
      patterns: [
        /ajouter parcelle|nouvelle parcelle|créer parcelle/i,
      ],
      action: () => {
        navigate("/parcelles");
        toast.info("Utilisez la caméra IA pour analyser un terrain");
      },
      response: "Pour créer une parcelle, utilisez la caméra intelligente",
    },
    {
      patterns: [
        /appeler vétérinaire|alerter vétérinaire|urgence animale/i,
      ],
      action: () => {
        navigate("/betail");
        toast.info("Scannez l'animal avec la caméra pour alerter un vétérinaire");
      },
      response: "Scannez l'animal malade avec la caméra pour alerter un vétérinaire",
    },
    // English commands
    {
      patterns: [
        /go home|home|dashboard/i,
      ],
      action: () => navigate("/dashboard"),
      response: "Taking you to the dashboard",
    },
    {
      patterns: [
        /field|parcel|land/i,
      ],
      action: () => navigate("/parcelles"),
      response: "Here are your fields",
    },
    {
      patterns: [
        /crop|crops|plant/i,
      ],
      action: () => navigate("/cultures"),
      response: "Here are your crops",
    },
    {
      patterns: [
        /livestock|cattle|animal|sheep|goat/i,
      ],
      action: () => navigate("/betail"),
      response: "Here is your livestock",
    },
    {
      patterns: [
        /market|buy|sell/i,
      ],
      action: () => navigate("/marketplace"),
      response: "Here is the marketplace",
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
    { label: "🏠 Tableau de bord", command: "tableau de bord" },
    { label: "🌱 Mes cultures", command: "mes cultures" },
    { label: "🗺️ Mes parcelles", command: "mes parcelles" },
    { label: "🐄 Mon bétail", command: "mon bétail" },
    { label: "🛒 Marketplace", command: "marketplace" },
    { label: "📡 Capteurs IoT", command: "mes capteurs" },
    { label: "💰 Investissements", command: "investissement" },
    { label: "🩺 Vétérinaire", command: "vétérinaire" },
  ], []);

  return {
    processCommand,
    getQuickCommands,
  };
}
