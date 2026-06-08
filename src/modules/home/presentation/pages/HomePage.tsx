import Link from "next/link";
import {
  DEMO_WALLET_ADDRESS,
  HOME_FEATURES,
  HOME_TECH_STACK,
  HOME_WORKFLOW_STEPS,
} from "@/modules/home/presentation/constants/home.constants";
import { HomeFeatureCard } from "@/modules/home/presentation/components/home-feature-card";
import { Button } from "@/shared/components/ui/button";
import { AppLogo } from "@/shared/presentation/components/AppLogo";
import { pageStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { cn } from "@/shared/lib/utils";

const demoWalletPath = getWalletPagePath(DEMO_WALLET_ADDRESS);

/**
 * Marketing landing page: project overview, features, and workflow.
 */
export const HomePage = () => {
  return (
    <main className={cn(pageStyles.main, "max-w-6xl")}>
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -top-24 right-0 size-64 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-start gap-6">
          <div className="flex items-center gap-3">
            <AppLogo size={48} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">TON analytics</p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">ArrayWallets</h1>
            </div>
          </div>

          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Explorer and analytics for TON wallets — sync on-chain events from TonAPI, track jetton portfolios
            with PnL, infer swap activity, and execute cross-chain swaps via STON.fi Omniston.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/wallets">Open wallets</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={demoWalletPath}>View demo wallet</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/omnistone">Try Omnistone</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="features-heading">
        <div className="mb-6">
          <h2 id="features-heading" className={pageStyles.sectionTitle}>
            What you can do
          </h2>
          <p className={pageStyles.sectionSubtitle}>
            Everything implemented in this app — from wallet sync to cross-chain swaps.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_FEATURES.map((feature) => (
            <HomeFeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="workflow-heading">
        <div className="mb-6">
          <h2 id="workflow-heading" className={pageStyles.sectionTitle}>
            How it works
          </h2>
          <p className={pageStyles.sectionSubtitle}>
            Typical flow from sign-in to analytics and swaps.
          </p>
        </div>

        <ol className="relative space-y-0">
          {HOME_WORKFLOW_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === HOME_WORKFLOW_STEPS.length - 1;

            return (
              <li key={step.step} className="relative flex gap-4 pb-8 last:pb-0">
                {!isLast ? (
                  <span
                    className="absolute top-10 left-5 h-[calc(100%-2.5rem)] w-px bg-border"
                    aria-hidden
                  />
                ) : null}

                <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-explorer-surface-2 text-sm font-bold text-primary">
                  {step.step}
                </div>

                <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" aria-hidden />
                    <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="stack-heading">
        <h2 id="stack-heading" className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Built with
        </h2>
        <ul className="flex flex-wrap gap-2">
          {HOME_TECH_STACK.map((item) => (
            <li key={item}>
              <span className={pageStyles.pill}>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 mb-4 rounded-xl border border-primary/20 bg-primary/5 px-6 py-8 text-center sm:px-10">
        <h2 className="text-xl font-semibold text-foreground">Ready to explore?</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Add your TON address or open the pre-synced demo wallet to see events, jetton PnL, and swap analytics.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/wallets">Get started</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
};
