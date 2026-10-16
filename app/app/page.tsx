import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import MicroSlats from "./components/reactbits/MicroSlats";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-sky-500 selection:text-white">
      {/* 100vh Viewport Section: Navbar + Hero with MicroSlats Fluid Background */}
      <section className="relative min-h-screen w-full overflow-hidden flex flex-col">
        {/* Background MicroSlats (Strictly for this 100vh Navbar + Hero viewport) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <MicroSlats
            preset="swell"
            color="#0284c7"
            glintColor="#38bdf8"
            backgroundColor="#020617"
            slatWidth={9}
            slatHeight={26}
            gap={3}
            roundness={0.8}
            interactive={true}
            cursorStrength={1.2}
            cursorSize={45}
            swirl={0.3}
            trail={1.4}
            lean={0.15}
            intro={true}
            className="h-full w-full"
          />
          {/* Subtle edge vignette that lets the fluid slats shine through */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/75 pointer-events-none" />
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
