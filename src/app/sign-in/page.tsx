import type { Metadata } from "next";
import { SignInPage } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with TON wallet, GitHub, or Google",
};

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { callbackUrl } = await searchParams;

  return <SignInPage callbackUrl={callbackUrl} />;
}
