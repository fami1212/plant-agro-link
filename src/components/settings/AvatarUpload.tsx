import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AvatarUpload() {
  const { user, profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | null>(profile?.avatar_url || null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { data: signed } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    const publicUrl = signed?.signedUrl || null;
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);
    setUrl(publicUrl);
    setUploading(false);
    toast.success("Photo de profil mise à jour");
  };

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <Avatar className="w-16 h-16">
        {url && <AvatarImage src={url} alt="avatar" />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div>
        <label>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
          <Button asChild size="sm" variant="outline" disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-1" />
              )}
              {uploading ? "Envoi..." : "Changer la photo"}
            </span>
          </Button>
        </label>
        <p className="text-xs text-muted-foreground mt-1">JPG/PNG • max 5 Mo</p>
      </div>
    </div>
  );
}