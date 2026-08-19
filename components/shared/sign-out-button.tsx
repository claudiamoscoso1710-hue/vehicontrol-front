"use client";

import { useState } from "react";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  function handleSignOut() {
    setPending(true);
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signout";
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
