import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: { absolute: "Log in — NexLearn" },
  description: "Log in to NexLearn and keep your streak going.",
};

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" description="Log in to continue your streak.">
      <LoginForm />
    </AuthCard>
  );
}
