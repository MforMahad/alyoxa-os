import ConstellationSection from "./constellation/ConstellationSection";
import EnterSystemSection from "./cta/EnterSystemSection";
import LandingFooter from "./footer/LandingFooter";
import HeroSection from "./hero/HeroSection";
import ModulesSection from "./modules/ModulesSection";
import EditorialNav from "./navigation/EditorialNav";
import OperatingLoopSection from "./operating-loop/OperatingLoopSection";
import PhilosophySection from "./philosophy/PhilosophySection";
import ThesisSection from "./thesis/ThesisSection";

export default function LandingPage() {
  return (
    <main className="bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      <EditorialNav />
      <HeroSection />
      <ThesisSection />
      <OperatingLoopSection />
      <ConstellationSection />
      <ModulesSection />
      <PhilosophySection />
      <EnterSystemSection />
      <LandingFooter />
    </main>
  );
}