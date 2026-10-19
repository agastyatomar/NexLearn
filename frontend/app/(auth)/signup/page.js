import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = {
  title: { absolute: "Sign up — NexLearn" },
  description: "Create your NexLearn account — free, fun, together.",
};

export default function SignupPage() {
  return (
    <AuthCard title="Create account" description="Join NexLearn — learn to code free, fun, together.">
      <SignupForm />
    </AuthCard>
  );
}
