import { z } from "zod";

/**
 * Schémas de validation réutilisables pour toute l'application.
 * Toujours utiliser .safeParse() côté client et afficher les erreurs via toast.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email requis")
  .max(255, "Email trop long")
  .email("Email invalide");

export const passwordSchema = z
  .string()
  .min(8, "Mot de passe : 8 caractères minimum")
  .max(72, "Mot de passe trop long")
  .regex(/[A-Za-z]/, "Doit contenir au moins une lettre")
  .regex(/[0-9]/, "Doit contenir au moins un chiffre");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Nom trop court")
  .max(100, "Nom trop long")
  .regex(/^[\p{L}\p{M}\s'’\-.]+$/u, "Caractères non autorisés dans le nom");

export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Téléphone invalide")
  .max(20, "Téléphone trop long")
  .regex(/^[+0-9\s()\-]+$/, "Format de téléphone invalide");

export const postContentSchema = z
  .string()
  .trim()
  .min(1, "Contenu requis")
  .max(2000, "Contenu trop long (max 2000 caractères)");

export const commentSchema = z
  .string()
  .trim()
  .min(1, "Commentaire vide")
  .max(1000, "Commentaire trop long (max 1000 caractères)");

export const titleSchema = z
  .string()
  .trim()
  .min(2, "Titre trop court")
  .max(150, "Titre trop long");

export const descriptionSchema = z
  .string()
  .trim()
  .max(2000, "Description trop longue")
  .optional()
  .or(z.literal(""));

export const priceSchema = z
  .number({ invalid_type_error: "Prix invalide" })
  .finite("Prix invalide")
  .min(0, "Prix négatif interdit")
  .max(100_000_000, "Prix trop élevé");

export const quantitySchema = z
  .number({ invalid_type_error: "Quantité invalide" })
  .finite("Quantité invalide")
  .min(0, "Quantité négative interdite")
  .max(10_000_000, "Quantité trop élevée");

export const urlSchema = z
  .string()
  .trim()
  .url("URL invalide")
  .startsWith("https://", "L'URL doit commencer par https://");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis").max(72),
});

/**
 * Helper : retourne le premier message d'erreur d'un ZodError formaté pour toast.
 */
export function firstError(error: z.ZodError): string {
  return error.errors[0]?.message ?? "Données invalides";
}