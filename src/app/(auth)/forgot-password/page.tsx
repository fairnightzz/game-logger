import { redirect } from "next/navigation";

export default function ForgotPassword() {
  // Redirect to sign-in since we only use Google OAuth now
  redirect("/sign-in");
}
