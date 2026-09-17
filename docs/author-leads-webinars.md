# Author lead funnel and webinar hub

- /become-an-author/ — author lead landing page
- /webinars/ — upcoming and past/on-demand webinar library
- /webinars/signup/ — webinar announcement signup
- /author-roadmap/ — printable six-stage resource

## Brevo
Account: 36seas LLC. Form: “36Seas — Author roadmap and webinar updates”. Target: existing “First Mate — Confirmed Writing Interest” list. Required, unchecked OPT_IN field. Default double opt-in confirmation template. After email validation, redirect to https://36seas.com/author-roadmap/.

Both signup pages embed the same live Brevo-hosted form, with a standalone fallback link. No API key is exposed or needed. Brevo handles validation and confirmation; this release does not import existing contacts or send a campaign. End-to-end inbox delivery requires a consenting test address; no unsolicited test email was sent.

## Add webinars
Edit 36seas-site/webinars/events.json. Keep it empty until events are confirmed; do not present sample events as scheduled sessions or completed recordings. Each record:

```json
{"title":"Confirmed session title","status":"upcoming","topic":"writing","speaker":"Confirmed speaker","dateLabel":"October 1, 2026 · 2 PM ET","description":"What attendees will learn.","url":"https://your-confirmed-registration-url"}
```

Status: upcoming or past. Topic: writing, design, or publishing. For a replay use status past and a real replay URL. The hub supports availability/topic filters and text search. Add final recording metadata only when available.

The pages draw inspiration from book.supercool.com and brevo.com/webinar-hub while using original 36Seas copy and existing Meat Wagon assets. No third-party author endorsements or bestseller guarantees are used.
