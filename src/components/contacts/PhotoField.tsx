"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  MAX_PHOTO_BYTES,
  PHOTO_ERROR,
  PHOTO_MEDIA_TYPES,
} from "@/lib/contacts/schema";

const MAX_PHOTO_MB = MAX_PHOTO_BYTES / (1024 * 1024);

function isAllowedType(type: string): boolean {
  return (PHOTO_MEDIA_TYPES as readonly string[]).includes(type);
}

/**
 * Photo picker. The chosen file is read into a base64 data URL and held in a
 * hidden input, so the form still submits as a plain POST — and an edit that
 * never touches the photo resends the existing one instead of clearing it,
 * which matters because the save is a full PUT replace.
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
  const fileInput = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // so picking the same file again still fires
    if (!file) return;

    if (!isAllowedType(file.type)) {
      setLocalError(`${PHOTO_ERROR}.`);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setLocalError(`That image is over ${MAX_PHOTO_MB} MB. Pick a smaller one.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLocalError(null);
      setPhoto(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => setLocalError("That image could not be read.");
    reader.readAsDataURL(file);
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
          <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInput.current?.click()}
          >
            {photo ? "Change photo" : "Add photo"}
          </Button>
          {photo ? (
            <Button variant="ghost" size="sm" onClick={clear}>
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>

        <p
          className={`text-[13px] ${message ? "text-destructive" : "text-muted-foreground"}`}
          role={message ? "alert" : undefined}
        >
          {message ?? `PNG, JPEG, WEBP, or GIF. Up to ${MAX_PHOTO_MB} MB.`}
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
