import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH, SIGN_IN_PATH, isAuthOnlyPath, isPublicPath } from "@/lib/routes";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Session refresh + optimistic route guard. Server Components re-verify the
 * user before reading data (lib/auth.ts); this is not the only check.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  function redirectTo(path: string) {
    const target = NextResponse.redirect(new URL(path, request.url));
    // Carry refreshed session cookies across the redirect.
    for (const cookie of response.cookies.getAll()) target.cookies.set(cookie);
    return target;
  }

  if (!userId && !isPublicPath(pathname)) {
    const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return redirectTo(`${SIGN_IN_PATH}${next}`);
  }

  // "/" itself is resolved by app/page.tsx, which reads the Spawn state.
  if (userId && isAuthOnlyPath(pathname)) {
    return redirectTo(HOME_PATH);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, PWA files and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icons/|manifest.webmanifest|sw.js|robots.txt).*)",
  ],
};
