export type PwaInstallPlatform = "ios" | "android" | "desktop" | "unknown";

export function detectPwaInstallPlatform(): PwaInstallPlatform {
  if (typeof window === "undefined") return "unknown";

  const ua = window.navigator.userAgent;
  const uaPlatform = (
    window.navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData?.platform;

  if (uaPlatform === "Android" || /Android/i.test(ua)) {
    return "android";
  }

  const isIosDevice =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

  if (isIosDevice) return "ios";
  return "desktop";
}

export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function isBeforeInstallPromptEvent(
  event: Event
): event is BeforeInstallPromptEvent {
  return "prompt" in event && typeof (event as BeforeInstallPromptEvent).prompt === "function";
}

export function getPwaInstallButtonLabel(
  platform: PwaInstallPlatform,
  installing = false
): string {
  if (installing) return "Instalando...";

  switch (platform) {
    case "ios":
      return "Cómo instalar en iPhone/iPad";
    case "android":
      return "Instalar en Android";
    case "desktop":
      return "Instalar en Windows/Mac";
    default:
      return "Instalar app del conductor";
  }
}

export function getPwaInstallHelp(platform: PwaInstallPlatform): {
  title: string;
  steps: string[];
} {
  switch (platform) {
    case "ios":
      return {
        title: "Instalar en iPhone o iPad",
        steps: [
          "Abre esta página en Safari (no en Chrome ni en el navegador de Instagram).",
          "Toca el botón Compartir (cuadrado con flecha hacia arriba).",
          "Elige «Añadir a pantalla de inicio».",
          "Confirma con «Añadir». La app abrirá en /driver.",
        ],
      };
    case "android":
      return {
        title: "Instalar en Android",
        steps: [
          "Usa Chrome o Edge en esta página.",
          "Si aparece el aviso de instalación, acepta.",
          "Si no, abre el menú ⋮ del navegador.",
          "Elige «Instalar aplicación» o «Añadir a pantalla de inicio».",
        ],
      };
    case "desktop":
      return {
        title: "Instalar en Windows o Mac",
        steps: [
          "Usa Chrome, Edge o Brave en esta página.",
          "Haz clic en «Instalar app» arriba si está disponible.",
          "Si no, busca el icono de instalación (⊕ o monitor) en la barra de direcciones.",
          "Confirma «Instalar». Se abrirá como app independiente.",
        ],
      };
    default:
      return {
        title: "Instalar la app",
        steps: [
          "Usa un navegador compatible (Chrome, Edge o Safari en iOS).",
          "Busca la opción «Instalar» o «Añadir a pantalla de inicio» en el menú del navegador.",
        ],
      };
  }
}
