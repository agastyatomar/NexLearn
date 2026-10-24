export default function OnboardingLayout({ children }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-start bg-night px-4 py-12 sm:justify-center sm:py-16">
      {children}
    </main>
  );
}
