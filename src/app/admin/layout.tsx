export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-slate-900 text-white p-4">
        <h1 className="text-xl font-bold">Admin Portal</h1>
      </header>
      <main className="flex-1 p-6 bg-slate-50">
        {children}
      </main>
    </div>
  )
}
