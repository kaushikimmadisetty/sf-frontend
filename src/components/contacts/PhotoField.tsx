"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  MAX_PHOTO_BYTES,
  PHOTO_ERROR,
  PHOTO_MEDIA_TYPES,
} from "@/lib/contacts/schema";

/**
 * Longest edge of the stored avatar. The UI never renders it larger than 80px,
 * and storing the original would be wasteful — a full-resolution photo also
 * exceeds the 1 MB Server Action body limit once base64 inflates it by a third.
 */
const MAX_EDGE = 512;
const JPEG_QUALITY = 0.85;

/** Ceiling on the file a user may pick, before it is downscaled. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

function isAllowedType(type: string): boolean {
  return (PHOTO_MEDIA_TYPES as readonly string[]).includes(type);
}

/** Downscale to `MAX_EDGE` on the longest side and re-encode as a JPEG data URL. */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("2d canvas context unavailable");

    // JPEG carries no alpha channel, so flatten transparency onto white
    // instead of letting it default to black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}

/**
 * Photo picker. The chosen file is downscaled in the browser and held as a
 * base64 data URL in a hidden input, so the form still submits as a plain POST
 * — and an edit that never touches the photo resends the existing one instead
 * of clearing it, which matters because the save is a full PUT replace.
 */
export default function PhotoField({
  defaultValue,
  error,
}: {
  defaultValue: string;
  error?: string;
}) {
  const [photo, setPhoto] = useState(defaultValue);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // so picking the same file again still fires
    if (!file) return;

    if (!isAllowedType(file.type)) {
      setLocalError(`${PHOTO_ERROR}.`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalError(`That image is over ${MAX_UPLOAD_MB} MB. Pick a smaller one.`);
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await toAvatarDataUrl(file);
      if (dataUrl.length > MAX_PHOTO_BYTES) {
        setLocalError("That image could not be reduced enough. Try another one.");
        return;
      }
      setLocalError(null);
      setPhoto(dataUrl);
    } catch {
      setLocalError("That image could not be read.");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setPhoto("");
    setLocalError(null);
  }

  const message = localError ?? error;

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="photo" value={photo} />

      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- a base64 data URL, nothing for next/image to optimise
        <img
          src={photo}
          alt="Selected contact photo"
          className="h-20 w-20 shrink-0 rounded-full border border-hairline object-cover aspect-square"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
          ) : (
            <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            {photo ? "Change photo" : "Add photo"}
          </Button>
          {photo ? (
            <Button variant="ghost" size="sm" disabled={busy} onClick={clear}>
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>

        <p
          className={`text-[13px] ${message ? "text-destructive" : "text-muted-foreground"}`}
          role={message ? "alert" : undefined}
        >
          {message ??
            `PNG, JPEG, WEBP, or GIF, up to ${MAX_UPLOAD_MB} MB. Resized to ${MAX_EDGE}px.`}
        </p>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={PHOTO_MEDIA_TYPES.join(",")}
        onChange={handleChange}
        className="sr-only"
        aria-label="Contact photo"
      />
    </div>
  );
}
