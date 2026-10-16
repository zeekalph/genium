import Navbar from "./components/Navbar";
import Hero from "./components/Hero";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-sky-500 selection:text-white">
      <Navbar />
      <Hero />
    </main>
  );
}
