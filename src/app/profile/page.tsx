import type { Metadata } from "next";
import { ProfilePage } from "@/modules/auth/presentation/pages/profile-page";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your TON Wallet account profile",
};

export default function Page() {
  return <ProfilePage />;
}
