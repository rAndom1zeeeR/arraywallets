import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for conflict resolution
 *
 * @param inputs - Class values (strings, objects, arrays, or undefined)
 * @returns Merged class string with resolved Tailwind conflicts
 * @example
 * ```typescript
 * cn("px-2 py-1", "px-4") // Returns "py-1 px-4" (px-2 is overridden by px-4)
 * cn("bg-red-500", { "bg-blue-500": isActive }) // Conditional classes
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
