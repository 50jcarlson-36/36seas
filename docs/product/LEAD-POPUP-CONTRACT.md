# Lead-generation presentation contract

Owner correction, 2026-09-21: every campaign offer is a compact popup matching the supplied reference, not an embedded page section.

- Home and pricing load `lead-popups.js` and `lead-popups.css`.
- Retrieve all 26 offers from the app's `/api/campaigns/catalog`; do not duplicate prices, destinations or campaign copy in public HTML.
- Center a light native dialog, maximum 480px wide, with responsive insets, top image, bold short headline, brief copy, one primary CTA and visible close button. Terms/preferences remain collapsed.
- Keep Escape/backdrop dismissal, focus restoration, reduced-motion support, form-focus protection, competing-dialog checks, one-per-session/seven-day automatic cooldown and pause preferences.
- Founder/newsletter CTAs open the app's modal capture flow. Preserve the exact campaign ID and selected commercial offer. A lead request never grants entitlement.
- Only actual popup opens count as impressions. Preserve privacy opt-out, DNT/GPC and origin-restricted telemetry. A CTA is not a paid order.
- Keep the complete Meat Wagon cover spread uncropped and retain normal product/pricing information.
- Run the JavaScript syntax, cover-spread and lead-popup checks before release.
