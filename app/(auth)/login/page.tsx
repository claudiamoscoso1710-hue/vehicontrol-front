"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

const DEMO_HINT = "Demo2026!";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  const quickLogins = [
    { label: "Dueño", email: "owner.alpha@demo.saas-camiones.test" },
    { label: "Conductor", email: "driver.alpha@demo.saas-camiones.test" },
    { label: "Super Admin", email: "superadmin@demo.saas-camiones.test" },
  ];

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="hidden flex-1 flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand">
            <Truck className="h-6 w-6 text-brand-foreground" />
          </div>
          <div>
            <p className="text-xl font-bold">SaaS Camiones</p>
            <p className="text-sm text-slate-400">Gestión de flotas de carga</p>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <h2 className="text-3xl font-bold leading-tight">
            Controla la rentabilidad de cada vehículo
          </h2>
          <p className="text-slate-400">
            Viajes, gastos, evidencias y reportes en un solo lugar. Diseñado para
            propietarios, conductores y equipos operativos.
          </p>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            {[
              { n: "1", t: "Reporta gastos con foto" },
              { n: "2", t: "Aprueba desde el panel" },
              { n: "3", t: "Ve el margen por vehículo" },
            ].map((s) => (
              <div key={s.n} className="rounded-xl bg-white/5 p-3">
                <p className="text-lg font-bold text-brand">{s.n}</p>
                <p className="mt-1 text-slate-400">{s.t}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">MVP Fase 1 · Multi-tenant</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-2xl">
          <CardBody className="space-y-6 p-8">
            <div className="lg:hidden">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                  <Truck className="h-5 w-5" />
                </div>
                <p className="text-lg font-bold">SaaS Camiones</p>
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold">Iniciar sesión</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Accede con tu cuenta de la plataforma
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@empresa.com"
                  className={inputClassName()}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClassName()}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={loading}
              >
                {loading ? "Ingresando..." : "Entrar"}
              </Button>
            </form>

            <div className="border-t pt-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Acceso rápido demo · contraseña {DEMO_HINT}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickLogins.map((q) => (
                  <button
                    key={q.email}
                    type="button"
                    onClick={() => {
                      setEmail(q.email);
                      setPassword(DEMO_HINT);
                    }}
                    className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
