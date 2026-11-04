import { notFound, redirect } from "next/navigation";
import { Monogram } from "@/components/Monogram";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { adminLang } from "@/lib/admin-lang";
import { messages } from "@/messages";
import { loginAction } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!adminEnabled()) notFound();
  if (await isAdmin()) redirect("/admin");
  const t = messages[await adminLang()].admin.login;
  const { error } = await searchParams;
  return (
    <main className="wrap grid min-h-svh place-items-center py-10">
      <form action={loginAction} className="grid w-full max-w-sm gap-5">
        <Monogram className="h-20 w-auto justify-self-start" />
        <h1 className="t-section">{t.title}</h1>
        <div className="field">
          <label htmlFor="password">{t.password}</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
          {error === "wrong" && <p className="error" data-testid="login-error">{t.wrong}</p>}
          {error === "throttled" && <p className="error" data-testid="login-error">{t.throttled}</p>}
        </div>
        <button type="submit" className="btn btn-primary">{t.submit}</button>
      </form>
    </main>
  );
}
