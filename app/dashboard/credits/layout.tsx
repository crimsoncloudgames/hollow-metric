import { redirect } from "next/navigation";

export default function BuyCreditsDisabledLayout({ children }: { children: React.ReactNode }) {
  void children;
  redirect("/dashboard");
}