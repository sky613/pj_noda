import { redirect } from "next/navigation";
import { currentRitual } from "@/lib/ritual/current";
import { detectSafety } from "@/lib/safety/detect";
import { CrisisFooter } from "@/components/ritual/CrisisFooter";

export const dynamic = "force-dynamic";

export default async function RitualLayout({ children }: { children: React.ReactNode }) {
  const ritual = await currentRitual();
  if (!ritual) redirect("/");

  const safety = detectSafety([ritual.item_name, ritual.feeling_text, ritual.farewell_text]);
  return (
    <main>
      {children}
      {safety.crisis && <CrisisFooter />}
    </main>
  );
}
