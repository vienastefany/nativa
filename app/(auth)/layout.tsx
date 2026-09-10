export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Decoración sutil */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-primary-100/60 to-primary-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-sky-100/70 to-primary-100/20 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}