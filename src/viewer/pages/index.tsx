import Head from "next/head";
import { useEffect, useState } from "react";
import App from "../components/App";
import { loadPlanData } from "../stores/plan";
import type { TrainingPlan } from "../../schema/training-plan";

const PLACEHOLDER_PLAN = JSON.stringify({ meta: { id: "placeholder" } });

export default function Home() {
  // Plan data is embedded in the page as a <script id="plan-data"> tag by
  // `npx runnify-assistant render` (which swaps the placeholder JSON below for the
  // real plan). It can only be read client-side - the page is statically
  // exported, so there is no `document` during the Next.js build - hence the
  // effect instead of reading it at module scope.
  const [plan, setPlan] = useState<TrainingPlan | null>(null);

  useEffect(() => {
    setPlan(loadPlanData());
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Training Plan</title>
      </Head>
      <div id="app">{plan ? <App plan={plan} /> : null}</div>
      {/* Plan Data (will be replaced by CLI) */}
      <script
        type="application/json"
        id="plan-data"
        dangerouslySetInnerHTML={{ __html: PLACEHOLDER_PLAN }}
      />
    </>
  );
}
