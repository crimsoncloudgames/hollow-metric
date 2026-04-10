import { redirect } from "next/navigation";

export default function SteamTagToolDisabledLayout({ children }: { children: React.ReactNode }) {
  void children;
  redirect("/dashboard");
}