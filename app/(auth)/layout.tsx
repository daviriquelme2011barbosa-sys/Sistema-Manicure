export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#fdf2f8] px-4 py-12">
      {children}
    </div>
  )
}
