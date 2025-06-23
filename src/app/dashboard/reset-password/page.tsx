import { redirect } from "next/navigation";

export default function ResetPassword() {
  // Redirect to dashboard since we only use Google OAuth now
  redirect("/dashboard");
}
