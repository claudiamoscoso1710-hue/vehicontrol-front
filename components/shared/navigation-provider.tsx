"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type NavigationContextValue = {
  isNavigating: boolean;
  startNavigation: () => void;
  endNavigation: () => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("NavLink must be used within NavigationProvider");
  }
  return ctx;
}

/** Control de la barra de progreso global (p. ej. tras server actions en la misma página). */
export function useNavigationControl() {
  const ctx = useContext(NavigationContext);
  return (
    ctx ?? {
      isNavigating: false,
      startNavigation: () => {},
      endNavigation: () => {},
    }
  );
}

function NavigationProgressBar({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 bg-brand/15"
      role="progressbar"
      aria-label="Cargando página"
    >
      <div className="navigation-progress-bar h-full bg-brand" />
    </div>
  );
}

function NavigationOverlay({ active }: { active: boolean }) {
  // Barra superior solamente — el overlay completo hace sentir la app más lenta.
  return null;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Evita barra de progreso infinita si la navegación no completa (error, server action, etc.).
  useEffect(() => {
    if (!isNavigating) return;
    const timeoutId = window.setTimeout(() => setIsNavigating(false), 12_000);
    return () => window.clearTimeout(timeoutId);
  }, [isNavigating]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      setIsNavigating(true);
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        isNavigating,
        startNavigation: () => setIsNavigating(true),
        endNavigation: () => setIsNavigating(false),
      }}
    >
      <NavigationProgressBar active={isNavigating} />
      <NavigationOverlay active={isNavigating} />
      {children}
    </NavigationContext.Provider>
  );
}

type NavLinkProps = ComponentProps<typeof Link> & {
  activeClassName?: string;
  isActive?: boolean;
  showSpinner?: boolean;
};

export function NavLink({
  href,
  className,
  activeClassName,
  isActive = false,
  showSpinner = true,
  onClick,
  children,
  ...props
}: NavLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { startNavigation } = useNavigation();
  const [pending, startTransition] = useTransition();

  const target = typeof href === "string" ? href : (href.pathname ?? "");

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (!target || target === pathname) return;

    event.preventDefault();
    startNavigation();
    startTransition(() => {
      router.push(target);
    });
  }

  return (
    <Link
      href={href}
      prefetch={true}
      onClick={handleClick}
      aria-busy={pending || undefined}
      className={cn(
        className,
        isActive && activeClassName,
        pending && "pointer-events-none opacity-70",
        "transition-all duration-150"
      )}
      {...props}
    >
      {pending && showSpinner ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          {children}
        </span>
      ) : (
        children
      )}
    </Link>
  );
}
