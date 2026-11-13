import { LoginForm } from "./login-form";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/hoy" } = await searchParams;
  return <LoginForm next={next} />;
}
