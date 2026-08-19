"use client";

import { useEffect } from "react";
import { saveDriverHomeSnapshot } from "@/lib/offline/db";

export function DriverHomeSnapshot({ data }: { data: unknown }) {
  useEffect(() => {
    void saveDriverHomeSnapshot(data);
  }, [data]);

  return null;
}
