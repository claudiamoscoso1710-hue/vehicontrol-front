"use client";

import { SerwistProvider } from "@serwist/next/react";

type Props = {
  children: React.ReactNode;
};

export function PwaRegister({ children }: Props) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
    >
      {children}
    </SerwistProvider>
  );
}
