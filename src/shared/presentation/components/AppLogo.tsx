import Image from "next/image";

import { cn } from "@/shared/lib/utils";

interface AppLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

/**
 * Theme-aware site logo: light variant for light mode, dark variant for dark mode.
 */
export const AppLogo = ({ className, size = 32, alt = "ArrayWallets" }: AppLogoProps) => {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Image
        src="/logo-light.svg"
        alt={alt}
        width={size}
        height={size}
        className="dark:hidden"
        priority
      />
      <Image
        src="/logo-dark.svg"
        alt={alt}
        width={size}
        height={size}
        className="hidden dark:block"
        priority
      />
    </span>
  );
};
