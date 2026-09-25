/**
 * fetch for Supabase requests that tolerates one known race: a token issued
 * moments ago can be rejected as "JWT issued at future" while the API's
 * clock catches up. It happens right after sign-in/sign-up. Retries that one
 * response (at most twice, after 1 s and 2 s); everything else passes through.
 */
const RETRY_DELAYS_MS = [1000, 2000];

async function issuedInFuture(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  return (await response.clone().text()).includes("JWT issued at future");
}

export async function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response = await fetch(input, init);
  for (const delay of RETRY_DELAYS_MS) {
    if (!(await issuedInFuture(response))) return response;
    await new Promise((resolve) => setTimeout(resolve, delay));
    response = await fetch(input, init);
  }
  return response;
}
