import { redirect } from "next/navigation";
import { currentRitual } from "@/lib/ritual/current";
import { isCoolingOver, routeForRitual } from "@/lib/ritual/steps";
import { ReleaseScreen } from "@/components/ritual/ReleaseScreen";

const METHOD_VERB = { discard: "버리고", donate: "기부하고", give: "나눠주고" } as const;

export default async function ReleasePage() {
  const ritual = await currentRitual();
  if (!ritual) redirect("/");
  // in_progress 이면서 method 단계를 마쳤거나, cooling 기간이 끝난 경우에만
  const ready =
    (ritual.status === "in_progress" && ritual.step === "release" && ritual.method) ||
    (ritual.status === "cooling" && isCoolingOver(ritual));
  if (!ready) redirect(routeForRitual(ritual));

  return (
    <ReleaseScreen
      itemName={ritual.item_name ?? ""}
      methodVerb={METHOD_VERB[ritual.method!]}
      backHref={ritual.status === "cooling" ? "/ritual/cooling" : "/ritual/method"}
    />
  );
}
