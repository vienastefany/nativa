import Sidebar from "./Sidebar";
import Header from "./Header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Menú lateral */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="ml-64">
        <Header />

        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}