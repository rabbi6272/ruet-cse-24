import { z } from "zod";

// Relative (not @/) so the tsx-run scripts in scripts/ can import this file too.
import { seriesFromRoll } from "../series/series.types";

// ─── Types ───────────────────────────────────────────────────

export type Section = "a" | "b" | "c";

export type SectionFilter = "All" | Section;

export interface ProfilePicture {
  publicId: string;
  url: string;
}

/**
 * Public directory profile. Keyed by the Firebase Auth uid, so a profile can
 * never be orphaned from its owner.
 *
 * NOTE: contains no credential material. `mobileNumber` deliberately does NOT
 * live here; it is a separate private contact record.
 */
export interface Profile {
  id: string;
  fullName: string;
  nickname: string;
  email: string;
  roll: string;
  /**
   * Two-digit series id (`"24"`), always derived from `roll` server-side
   * (`modules/series/series.types.ts`). Never accepted from client input.
   */
  series: string;
  sec: Section;
  bloodGroup: string;
  bio: string;
  hobby: string;
  fbProfile: string;
  profilePicture: ProfilePicture;
  published: boolean;
  createdAt: number;
  updatedAt: number;
  claimedAt: number;
}

/** Field owners may edit. `email` and `series` are intentionally not editable. */
export type ProfileDraft = Omit<
  Profile,
  "id" | "email" | "series" | "published" | "createdAt" | "updatedAt" | "claimedAt"
>;

/** Private contact record — server-read only. */
export interface PrivateContact {
  mobileNumber: string;
}

/** A pre-Firebase-Auth profile waiting to be claimed. Readable only server-side. */
export interface LegacyProfile {
  legacyId: string;
  fullName: string;
  nickname: string;
  email: string;
  roll: string;
  sec: Section | "";
  bloodGroup: string;
  bio: string;
  hobby: string;
  fbProfile: string;
  mobileNumber: string;
  profilePicture: ProfilePicture;
  createdAt: number;
}

export const SECTION_LABELS: Record<SectionFilter, string> = {
  All: "All sections",
  a: "Section A",
  b: "Section B",
  c: "Section C",
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

// ─── Schemas ─────────────────────────────────────────────────
// Same rules the server applies, so the user sees field-level messages instead
// of a generic failure. The server revalidates regardless.

const optionalUrl = z
  .union([z.url("Enter a valid URL, including https://"), z.literal("")])
  .transform((value) => value.trim());

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name")
  .max(80, "Name must be 80 characters or fewer");

export const nicknameSchema = z
  .string()
  .trim()
  .max(40, "Nickname must be 40 characters or fewer");

export const emailSchema = z
  .email("Enter a valid email address")
  .max(254)
  .transform((value) => value.trim().toLowerCase());

/** Any registered series pattern (see `modules/series/series.types.ts`). */
export const rollSchema = z
  .string()
  .trim()
  .refine((value) => seriesFromRoll(value) !== null, "Roll must be a valid CSE roll number");

/** All sections any registered series uses. */
export const sectionSchema = z.enum(["a", "b", "c"]);

export const seriesSchema = z
  .string()
  .trim()
  .regex(/^\d{2}$/, "Series must be a two-digit id");

export const bloodGroupSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => value === "" || (BLOOD_GROUPS as readonly string[]).includes(value),
    `Blood group must be one of ${BLOOD_GROUPS.join(", ")}`,
  );

export const bioSchema = z.string().trim().max(500, "Bio must be 500 characters or fewer");

export const hobbySchema = z.string().trim().max(60, "Hobby must be 60 characters or fewer");

export const mobileNumberSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^[+\d][\d\s-]{5,19}$/.test(value),
    "Enter a valid mobile number",
  );

export const profilePictureSchema = z.object({
  publicId: z.string().trim().max(300),
  url: z.string().trim().max(600),
});

export const profileSchema = z.object({
  fullName: fullNameSchema,
  nickname: nicknameSchema,
  email: emailSchema,
  roll: rollSchema,
  series: seriesSchema,
  sec: sectionSchema,
  bloodGroup: bloodGroupSchema,
  bio: bioSchema,
  hobby: hobbySchema,
  fbProfile: optionalUrl,
  profilePicture: profilePictureSchema,
  published: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  claimedAt: z.number().int().nonnegative(),
});

/** Everything a student may edit about their own profile. */
export const profileDraftSchema = profileSchema
  .omit({
    email: true,
    series: true,
    published: true,
    createdAt: true,
    updatedAt: true,
    claimedAt: true,
  })
  .strict();

/**
 * Patch semantics: every field optional, but at least one required.
 * `profilePicture` is deliberately absent: the photo is changed only through
 * the upload/delete routes, which derive the URL server-side.
 */
export const updateProfileSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    nickname: nicknameSchema.optional(),
    roll: rollSchema.optional(),
    sec: sectionSchema.optional(),
    bloodGroup: bloodGroupSchema.optional(),
    bio: bioSchema.optional(),
    hobby: hobbySchema.optional(),
    fbProfile: optionalUrl.optional(),
    published: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "No changes supplied");

export const updateContactSchema = z.object({ mobileNumber: mobileNumberSchema }).strict();

export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileDraftInput = z.infer<typeof profileDraftSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const FIELD_LIMITS = {
  fullName: 80,
  nickname: 40,
  bio: 500,
  hobby: 60,
} as const;
