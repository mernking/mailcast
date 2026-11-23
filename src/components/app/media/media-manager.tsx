"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";

import { useFetch, apiFetch, fmtDateTime } from "../use-api";
import { SectionHeading } from "../section-heading";
import { EmptyState } from "../empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MediaImage {
  path: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaManager() {
  const { data, loading, refetch } = useFetch<{ images: MediaImage[] }>("/api/media");
  const images = data?.images ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<MediaImage | null>(null);
  const [busy, setBusy] = useState(false);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
        await apiFetch("/api/media", {
          method: "POST",
          body: JSON.stringify({ dataUri }),
        });
      }
      toast.success("Images uploaded");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied");
    } catch {
      toast.error("Could not copy URL");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const name = deleting.path.split("/").pop();
      await apiFetch(`/api/media/${encodeURIComponent(name!)}`, { method: "DELETE" });
      toast.success("Image deleted");
      setDeleting(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Media library"
        description="Images stored in Supabase Storage. Use their URLs in campaigns — emails stay small and render reliably."
      />

      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void uploadFiles(e.target.files)}
        />
        <Button
          className="rounded-full"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {uploading ? "Uploading…" : "Upload images"}
        </Button>
        <span className="text-xs text-muted-foreground">
          PNG, JPG, GIF, WebP or SVG · up to 5 MB each
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No images yet"
          description="Upload an image to get a permanent public URL for your emails."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <div
              key={image.path}
              className="group overflow-hidden rounded-xl border bg-card"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={image.url}
                  alt={image.path.split("/").pop() ?? "image"}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col gap-2 p-3">
                <p className="truncate text-xs font-medium" title={image.path}>
                  {image.path.split("/").pop()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(image.size)} · {fmtDateTime(image.createdAt)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => void copyUrl(image.url)}
                  >
                    <Copy className="size-3.5" /> Copy URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleting(image)}
                    aria-label="Delete image"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              Any email still using this URL will show a broken image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
