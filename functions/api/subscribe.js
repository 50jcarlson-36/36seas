// Compatibility for older cached reader forms. Brevo now collects and confirms
// reader subscriptions directly; never claim a lead was saved by this redirect.
export async function onRequestPost({ request }) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).hostname !== new URL(request.url).hostname) {
    return new Response('Invalid origin.', { status: 403 });
  }
  if (request.headers.get('accept')?.includes('application/json')) {
    return Response.json({ ok: false, error: 'Reader signup has moved. Please continue at https://36seas.com/reader-news/', signupUrl: 'https://36seas.com/reader-news/' }, { status: 409, headers: { 'cache-control': 'no-store' } });
  }
  return Response.redirect(new URL('/reader-news/?source=legacy-signup', request.url), 303);
}
export function onRequestGet() {
  return Response.json({ ok: false, error: 'Method not allowed.' }, { status: 405 });
}
