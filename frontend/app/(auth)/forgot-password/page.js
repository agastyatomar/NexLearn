import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = {
  title: { absolute: "Forgot password — NexLearn" },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot password?"
      description="UI preview — enter your email and we'll pretend to send a reset link."
    >
      <form noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="forgot-email">Email</Label>
          <Input id="forgot-email" type="email" autoComplete="email" placeholder="you@example.com" />
        </div>
        <Button variant="primary" className="w-full">
          Send reset link
        </Button>
        <p className="text-center font-body text-[14px] font-medium leading-[1.4] text-steel">
          Remembered it?{" "}
          <Link href="/login" className="font-bold text-electric-cyan hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-cyan">
            Back to log in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
