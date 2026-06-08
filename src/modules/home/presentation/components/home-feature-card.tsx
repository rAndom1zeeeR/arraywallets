import Link from "next/link";
import type { HomeFeature } from "@/modules/home/presentation/constants/home.constants";
import { cn } from "@/shared/lib/utils";

interface HomeFeatureCardProps {
  feature: HomeFeature;
}

/**
 * Feature highlight card for the landing page.
 */
export const HomeFeatureCard = ({ feature }: HomeFeatureCardProps) => {
  const Icon = feature.icon;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        {feature.tag ? (
          <span className="rounded-full border border-border bg-explorer-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {feature.tag}
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{feature.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
      {feature.href ? (
        <span className="mt-4 inline-flex text-sm font-medium text-primary">Learn more →</span>
      ) : null}
    </>
  );

  const className = cn(
    "group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors",
    feature.href && "hover:border-primary/30 hover:bg-explorer-surface-2/30",
  );

  if (feature.href) {
    return (
      <Link href={feature.href} className={className}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
};
