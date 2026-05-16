import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { HowItWorks } from "@/components/how-it-works";
import { Stats } from "@/components/stats";
import { LiveTerminal } from "@/components/live-terminal";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <Hero />
      <Features />
      <HowItWorks />
      <Stats />
      <LiveTerminal />
      <Footer />
    </main>
  );
}
