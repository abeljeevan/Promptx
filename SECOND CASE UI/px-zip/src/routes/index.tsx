import { createFileRoute } from "@tanstack/react-router";
import { SilentWitnessGame } from "../components/SilentWitnessGame";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "PROMPT X — The Silent Witness" },
      { name: "description", content: "Interrogate five suspects, connect the evidence, and solve the murder of Dr. Meena Sen." },
      { property: "og:title", content: "PROMPT X — The Silent Witness" },
      { property: "og:description", content: "Five people. One truth. A cinematic interrogation mystery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <SilentWitnessGame />;
}
