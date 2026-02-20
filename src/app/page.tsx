import { redirect } from "next/navigation";

export default function LandingPage() {
  redirect("/auth/sign-in");
}
