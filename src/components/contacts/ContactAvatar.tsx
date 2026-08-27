import type { CSSProperties } from "react";
import { avatarHue, initials } from "@/lib/contacts/format";
import type { Contact } from "@/lib/contacts/types";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/** The contact's photo when they have one, otherwise an initials bubble tinted
 *  with a hue derived from their email. Both render as the same circle. */
export default function ContactAvatar({
  contact,
  size = "md",
}: {
  contact: Pick<Contact, "first_name" | "last_name" | "email" | "photo">;
  size?: keyof typeof SIZES;
}) {
  const shape = `inline-flex shrink-0 select-none items-center justify-center rounded-full ${SIZES[size]}`;

  if (contact.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a base64 data URL, nothing for next/image to optimise
      <img
        src={contact.photo}
        alt=""
        aria-hidden="true"
        className={`${shape} aspect-square border border-hairline object-cover`}
      />
    );
  }

  const style = {
    "--avatar-hue": avatarHue(contact.email),
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`contact-avatar font-display font-semibold ${shape}`}
    >
      {initials(contact)}
    </span>
  );
}
