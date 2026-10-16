import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import GradientASCII from "./components/reactbits/GradientASCII";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-sky-500 selection:text-white">
      {/* 100vh Viewport Section: Navbar + Hero with GradientASCII Background */}
      <section className="relative min-h-screen w-full overflow-hidden flex flex-col">
        {/* Background Gradient ASCII (Strictly for this 100vh Navbar + Hero viewport) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <GradientASCII
            colors={["#0284c7", "#0ea5e9", "#059669", "#10b981", "#38bdf8"]}
            shape="rise"
            cellSize={14}
            density={0.75}
            glow={0.45}
            gradientOpacity={0.85}
            mouseInteraction={true}
            flicker={0.2}
            speed={0.85}
            className="h-full w-full"
          />
          {/* Subtle edge vignette that lets the glowing ASCII shine through */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none" />
        </div>

        {/* Content layer (Navbar + Hero) */}
        <div className="relative z-10 flex flex-col flex-1">
          <Navbar />
          <Hero />
        </div>
      </section>

      {/* Any subsequent sections or footer placed here will NOT have Gradient ASCII */}
      <Footer />
    </main>
  );
}
