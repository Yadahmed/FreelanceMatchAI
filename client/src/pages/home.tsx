import ChatInterface from "@/components/chat/ChatInterface";
import InfoPanel from "@/components/layout/InfoPanel";

export default function Home() {
  return (
    <div className="container mx-auto pt-6 pb-6 px-4 min-h-screen flex flex-col md:flex-row md:items-start md:space-x-6">
      {/* Info Panel (Left side) */}
      <section className="md:w-1/3 lg:w-2/5 py-8 md:py-12 md:sticky md:top-20">
        <InfoPanel />
      </section>
      
      {/* Chat Interface (Right side) */}
      <section className="md:w-2/3 lg:w-3/5 flex-grow mt-6 md:mt-0">
        <ChatInterface />
      </section>
    </div>
  );
}
