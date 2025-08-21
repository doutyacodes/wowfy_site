'use client';

import { Suspense } from "react";
import SignUpPage from "./SignUpPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpPage />
    </Suspense>
  );
}
