export { default } from "next-auth/middleware";

// Protect the authenticated surface of the app. Unauthenticated visitors are
// redirected to /login (configured via NEXTAUTH pages.signIn).
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chart/:path*",
    "/chat/:path*",
    "/monthly/:path*",
    "/transits/:path*",
    "/context/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
