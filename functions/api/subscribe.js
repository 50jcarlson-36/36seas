const RESEND_API = 'https://api.resend.com';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});

const redirect = (request, state) => {
  const url = new URL('/thanks/', request.url);
  url.searchParams.set('signup', state);
  return Response.redirect(url.toString(), 303);
};

const wantsJson = request => request.headers.get('accept')?.includes('application/json');

const resend = (apiKey, path, body) => fetch(`${RESEND_API}${path}`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify(body),
});

const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
})[character]);

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).hostname !== new URL(request.url).hostname) {
    return json({ ok: false, error: 'Invalid origin.' }, 403);
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    return wantsJson(request)
      ? json({ ok: false, error: 'Newsletter service is not configured.' }, 503)
      : redirect(request, 'unavailable');
  }

  const form = await request.formData();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const name = String(form.get('name') || '').trim().slice(0, 100);
  const interest = String(form.get('interest') || '36Seas reader list').trim().slice(0, 120);
  const consent = form.get('marketing_consent');
  const honeypot = String(form.get('company_website') || '');

  if (honeypot) return redirect(request, 'success');
  if (!consent || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return wantsJson(request)
      ? json({ ok: false, error: 'A valid email and consent are required.' }, 400)
      : redirect(request, 'invalid');
  }

  const firstName = name.split(/\s+/)[0] || undefined;
  const lastName = name.split(/\s+/).slice(1).join(' ') || undefined;
  const contactResponse = await resend(env.RESEND_API_KEY, '/contacts', {
    email,
    first_name: firstName,
    last_name: lastName,
    unsubscribed: false,
    segments: env.RESEND_SEGMENT_ID ? [{ id: env.RESEND_SEGMENT_ID }] : undefined,
  });

  if (!contactResponse.ok && contactResponse.status !== 409) {
    console.error('Resend contact error', contactResponse.status, await contactResponse.text());
    return wantsJson(request)
      ? json({ ok: false, error: 'Unable to save subscription.' }, 502)
      : redirect(request, 'error');
  }

  const safeName = escapeHtml(firstName || 'Reader');
  const safeInterest = escapeHtml(interest);
  const confirmation = resend(env.RESEND_API_KEY, '/emails', {
    from: env.RESEND_FROM,
    to: email,
    reply_to: env.RESEND_REPLY_TO || 'hello@36seas.com',
    subject: 'Welcome aboard 36Seas',
    html: `<div style="background:#080a0b;color:#eee8dc;padding:42px;font-family:Arial,sans-serif"><p style="color:#c79a55;letter-spacing:.18em;text-transform:uppercase;font-size:12px">36Seas Publishing</p><h1 style="font-family:Georgia,serif;font-weight:400;font-size:42px;margin:20px 0">Welcome aboard, ${safeName}.</h1><p style="color:#c8c1b7;line-height:1.7;max-width:560px">You are on the list for ${safeInterest}. We will send new releases, trailer premieres, and occasional reader-only book offers—never noise.</p><p style="margin-top:34px"><a href="https://36seas.com/#catalog" style="background:#c79a55;color:#080a0b;padding:14px 20px;text-decoration:none;font-weight:bold">Explore the catalog</a></p><p style="color:#77716a;margin-top:42px;font-size:12px">You received this because you subscribed at 36seas.com. Reply to this email if you would like to unsubscribe.</p></div>`,
  });

  const notification = env.RESEND_ADMIN_EMAIL
    ? resend(env.RESEND_API_KEY, '/emails', {
        from: env.RESEND_FROM,
        to: env.RESEND_ADMIN_EMAIL,
        reply_to: email,
        subject: `New 36Seas signup: ${interest}`,
        text: `Name: ${name || 'Not provided'}\nEmail: ${email}\nInterest: ${interest}\nConsent: Yes`,
      })
    : Promise.resolve(new Response(null, { status: 204 }));

  const [confirmationResponse, notificationResponse] = await Promise.all([confirmation, notification]);
  if (!confirmationResponse.ok) console.error('Resend confirmation error', confirmationResponse.status, await confirmationResponse.text());
  if (!notificationResponse.ok) console.error('Resend notification error', notificationResponse.status, await notificationResponse.text());

  return wantsJson(request) ? json({ ok: true }) : redirect(request, 'success');
}

export function onRequestGet() {
  return json({ ok: false, error: 'Method not allowed.' }, 405);
}
