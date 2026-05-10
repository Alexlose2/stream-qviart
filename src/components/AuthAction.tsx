"use client";

import { signIn, signOut } from "next-auth/react";

type AuthActionProps =
  | {
      mode: "sign-in";
      disabled?: boolean;
    }
  | {
      mode: "sign-out";
      disabled?: boolean;
    };

function GoogleIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.89-1.74 2.99-4.3 2.99-7.43Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.22-2.51c-.9.6-2.04.95-3.39.95-2.61 0-4.82-1.76-5.61-4.13H3.06v2.59A9.99 9.99 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.39 13.88A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.88V7.53H3.06A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.06 4.47l3.33-2.59Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.99c1.47 0 2.79.51 3.83 1.5l2.85-2.85C16.95 3.03 14.7 2 12 2a9.99 9.99 0 0 0-8.94 5.53l3.33 2.59C7.18 7.75 9.39 5.99 12 5.99Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <path
        d="M15 17l5-5-5-5M20 12H9M12 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function AuthAction(props: AuthActionProps) {
  if (props.mode === "sign-out") {
    return (
      <button
        className="secondary-button"
        disabled={props.disabled}
        onClick={() => signOut({ callbackUrl: "/" })}
        type="button"
      >
        <SignOutIcon />
        Salir
      </button>
    );
  }

  return (
    <button
      className="primary-button"
      disabled={props.disabled}
      onClick={() => signIn("google", { callbackUrl: "/" })}
      type="button"
    >
      <GoogleIcon />
      Entrar con Google
    </button>
  );
}
