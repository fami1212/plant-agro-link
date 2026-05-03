import { useState } from "react";
import { Play } from "lucide-react";
import { isSafeVideoUrl } from "@/lib/sanitize";

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
}

export function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  if (!isSafeVideoUrl(embedUrl)) {
    return (
      <div className="aspect-video rounded-2xl bg-muted flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
        Source vidéo non autorisée.
      </div>
    );
  }

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black group">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform"
            onClick={() => setIsLoaded(true)}>
            <Play className="w-7 h-7 text-primary-foreground fill-primary-foreground ml-1" />
          </div>
          {title && (
            <p className="absolute bottom-4 left-4 right-4 text-sm font-medium text-white bg-black/50 rounded-lg px-3 py-2 backdrop-blur-sm truncate">
              {title}
            </p>
          )}
        </div>
      )}
      {isLoaded && (
        <iframe
          src={`${embedUrl}?autoplay=1&rel=0`}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title={title || "Video"}
        />
      )}
    </div>
  );
}
