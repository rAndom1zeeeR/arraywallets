import { z } from "zod";
import { toRawTonAddress } from "@/shared/lib/ton-address";

/**
 * Accepts any valid TON address (EQ/UQ/0:...) and transforms to canonical raw `workchain:hex`.
 */
export const rawTonAddressSchema = z.string().trim().transform((value, ctx) => {
  try {
    return toRawTonAddress(value);
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Invalid TON address",
    });
    return z.NEVER;
  }
});
