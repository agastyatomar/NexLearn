import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/* Auth group — centered card on Paper White, no landing Navbar.
   Logged-in users are sent straight to the app. */
export default async function AuthLayout({ children }) {
  const user = await getCurrentUser();
  if (user) redirect("/app");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-start bg-night px-4 py-12 sm:justify-center sm:py-16">
      {children}
    </main>
  );
}
