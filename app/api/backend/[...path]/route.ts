import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getBackendUrl() {
  const url = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    throw new Error("BACKEND_URL no configurada.");
  }
  return url.replace(/\/$/, "");
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Sesión expirada. Vuelve a iniciar sesión." },
        { status: 401 }
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.json(
        { success: false, error: "Sesión expirada. Vuelve a iniciar sesión." },
        { status: 401 }
      );
    }

    const path = `/${pathSegments.join("/")}`;
    const contentType = request.headers.get("content-type") ?? "";
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.access_token}`,
    };

    let body: BodyInit | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      if (contentType.includes("multipart/form-data")) {
        body = await request.formData();
      } else {
        const rawBody = await request.text();
        if (rawBody) {
          headers["Content-Type"] = contentType || "application/json";
          body = rawBody;
        }
      }
    }

    const response = await fetch(`${getBackendUrl()}${path}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const responseText = await response.text();
    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo conectar con el servidor.",
      },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
