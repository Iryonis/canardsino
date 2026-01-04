"use client";

import Link from "next/link";

export const UnloggedNav = () => {
  return (
    <>
      <Link
        href="/login"
        className="px-4 py-2 bg-blue-dark hover:bg-blue text-blue-lightest rounded-lg transition border border-blue"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="px-4 py-2 bg-gradient-to-r from-blue to-blue-light hover:from-blue-light hover:to-blue-lightest text-blue-darkest font-bold rounded-lg transition"
      >
        Register
      </Link>
    </>
  );
};
