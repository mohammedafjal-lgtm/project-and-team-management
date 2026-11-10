import { randomBytes } from "crypto";

/**
 * Unguessable token that grants read access to a single invoice.
 * 192 bits of entropy; expires only when invoice is deleted or regenerated.
 */
export function generatePublicToken(): string {
  return randomBytes(24).toString("base64url");
}