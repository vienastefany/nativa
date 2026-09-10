import {
  Calendar,
  Users,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";

const cards = [
  {
    title: "Total Actividades",
    value: "0",
    icon: Calendar,
    tint: "bg-primary-50 text-primary-600",
  },
  {
    title: "Participantes",
    value: "0",
    icon: Users,
    tint: "bg-sky-50 text-sky-600",
  },
  {
    title: "Asistencia Hoy",
    value: "0%",
    icon: CheckCircle2,
    tint: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Próximas Actividades",
    value: "0",
    icon: CalendarClock,
    tint: "bg-violet-50 text-violet-600",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Resumen general de tus actividades formativas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {card.value}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.tint}`}
                >
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}