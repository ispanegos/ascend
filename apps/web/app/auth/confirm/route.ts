import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { SIGN_IN_PATH, safeNextPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Email confirmation landing. Handles both the PKCE `code` flow and the
 * `token_hash` flow, depending on the project's email template.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error("Missing confirmation parameters") };

  if (error) {
    return NextResponse.redirect(new URL(`${SIGN_IN_PATH}?error=confirmation`, request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}
