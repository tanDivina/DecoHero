# DecoHero Privacy Policy
_Last updated: November 12, 2026_

<!-- Repo note (not published). This file is the English source of https://deco.hero-apps.com/privacy:
     `node scripts/build-site.mjs` turns it into site/privacy.html. The Spanish source is
     scripts/site-src/privacy.es.md. Keep both in step. The older Android-only page at
     https://hero-apps.com/decohero/privacy.html (source ~/hero-apps/decohero/privacy.html) stays where it is. -->
<!-- TODO(Dorien): the Android-only page at hero-apps.com/decohero/privacy.html still says "no accounts" for DecoHero as a whole. That is still true for the Android app, but decide whether to add a line there pointing to this page for the web app. -->

DecoHero is made by Divina Endeavors LLC (Hero Apps), United States, the data controller for anything described here. Contact: support@hero-apps.com.

This policy covers the DecoHero Android app, the DecoHero web app at https://deco.hero-apps.com/app and the website at https://deco.hero-apps.com.

## In short
DecoHero has no ads, and we run no analytics or tracking of our own. To make a redesign, the app sends the room photo you choose to our server, which passes it to Google's Gemini API and sends the design back to your device. We do not store your photos or the designs. Our server does keep a small record so your credits work: your credit balance, your purchases, which styles you generated, any designs you reported, and, for the first 48 hours only, the IP address you first connected from.

- **Android app:** there are no accounts. The record is linked to a random install ID.
- **Web app:** there are accounts. You sign in with Google through Firebase Authentication, and the record is linked to the user ID of that sign-in. Our server does not store your email address, name or profile picture; Firebase Authentication, a Google service, holds your Google email address and name.

We keep the rest of that record until you delete it or ask us to delete it.

## 1. Your room photos and designs
When you tap to redesign, the app shrinks your photo (to at most 1280 pixels on the long side) and sends it over an encrypted connection to our server, together with the style you picked. Our server sends the photo and a fixed style instruction to the Google Gemini API, receives the redesigned image, and returns it to your device.

- Our server handles the photo and the design in memory only. It does not write them to its database, to disk or to its logs, and they are gone once the request finishes.
- We use Google's paid Gemini API. Under its terms Google does not use your photos or designs to improve its products. Google may keep them for a limited time to detect abuse.
- On your phone, designs are kept in the app's temporary cache. They are saved to your gallery only when you tap Save, and shared only when you tap Share.
- In the web app, designs are held in the page's memory and are gone when you close or reload the page. A design is saved to your device only when you choose Save, which downloads the image, and shared only when you choose Share.
- You cannot type your own prompts. Every design uses one of the fixed styles in the app.

## 2. What our server stores
**Android app.** The first time you open DecoHero, it creates a random install ID on your phone. On Android it is not linked to your name, email, phone number or Google account.

**Web app.** When you sign in with Google (section 3), our server creates a random user ID for you and stores it together with the Firebase user ID of your sign-in. On the web, that random user ID takes the place of the install ID. Our server does not store your email address, name or profile picture.

Our server stores the following, linked to that ID:

| Record | What it contains | Why |
|---|---|---|
| Install or account record | Install ID (Android), or random user ID and Firebase user ID (web), credit balance, whether you have ever bought credits, whether you were refused free credits because of the limit described here, the date the record was created, and the IP address you first connected from (for IPv6, only the network part, the first four blocks). The IP address is erased automatically once the record is 48 hours old. | Keep your credit balance. The IP address lets us give free credits to a limited number of new installs or accounts per IP address per day, so free credits cannot be farmed. |
| Purchases | Your ID, the credit pack bought, the number of credits, the RevenueCat event ID, the transaction ID from Google Play or from the web payment, the time, and the time of any refund | Add the credits you paid for exactly once, and remove them again if the purchase is refunded |
| Design log | Your ID, the style generated, whether it worked, and the time | Spot abuse, control costs and answer support questions |
| Reports | Your ID, the style of the design you reported, and the time. The report does not include your photo or the design. | Review AI output that users flag |
| Daily totals | The number of designs made per day, with no personal data | Daily spending limits |

**IP address.** Besides the copy in the install or account record, the server also keeps your IP address in memory for up to 10 minutes to limit how many requests one connection can make. That copy is not written to disk.

**Server logs.** Our hosting provider keeps the server's log output for a limited period set by the provider. These logs contain error messages, for each purchase your ID and the credit pack, and for each refund the credit pack. They do not contain photos or designs. The provider's request logs also record the IP address, time and web address of each request to our server; for older versions of the Android app that address includes the install ID.

## 3. Signing in on the web
The Android app has no sign-in. The web app uses Google sign-in through Firebase Authentication, a Google service.

- When you sign in, Google asks you which account to use. Firebase Authentication then gives the web app the basic profile of that account: a user ID, your email address, your name and your profile picture. Our server stores only the user ID. We never see your Google password.
- Firebase Authentication keeps your sign-in record on Google's servers, as our processor (user ID, email address, name, profile picture address and sign-in times). Google also logs the IP address and browser details of sign-ins for security and keeps those logs for a limited time.
- Each request from the web app to our server carries a short-lived sign-in token, which our server checks against Google's public keys.

## 4. Buying credits
**Android app.** Payments are handled by Google Play. We never see your card details, and our server does not receive your name or the email address of your Google account. We use RevenueCat to confirm purchases: the app gives RevenueCat your install ID as its user ID, and RevenueCat receives your Google Play purchase details and basic technical information from its SDK (such as app version and device platform). RevenueCat then tells our server which credit pack to add. If Google Play refunds a purchase, RevenueCat tells our server and the credits from that pack are removed from your balance.

**Web app.** Payments are handled by Stripe through RevenueCat Web Billing. You type your card details into a checkout form run by RevenueCat and Stripe. DecoHero never sees or stores your card number. The web app passes your random user ID and the email address of your Google sign-in to the checkout, so RevenueCat receives your user ID, that email address (used for the receipt) and the purchase details. Stripe receives your payment details and email address, plus technical information it uses to prevent fraud, such as your IP address and browser. The RevenueCat checkout software in the web app also sends RevenueCat technical events about the checkout (for example that the checkout opened, or that a payment step failed), which RevenueCat uses to process and support purchases. RevenueCat then tells our server which credit pack to add. If a purchase is refunded, RevenueCat tells our server and the credits from that pack are removed from your balance.

## 5. Who else receives data
| Provider | What it receives | Why |
|---|---|---|
| Google Gemini API (Google LLC) | Your room photo and the style instruction | Creates the redesign |
| RevenueCat, Inc. | Install ID or user ID, purchase details, basic device, browser and app information; on the web also the email address of your Google sign-in and technical events from the checkout | Confirms purchases and tells our server to add credits |
| Google Play (Google LLC) | Your purchase, under your Google account (Android app) | Processes the payment |
| Stripe, Inc. | Your card and payment details, email address, IP address and browser information (web app) | Processes card payments on the web and prevents fraud |
| Firebase Authentication (Google LLC) | Your Google account's user ID, email address, name and profile picture address, plus IP address and browser details of sign-ins (web app), as our processor | Google sign-in on the web |
| Our cloud hosting provider | Everything our server receives, as our processor | Runs the DecoHero server and its database |
| Vercel Inc. | The IP address, time and web address of each request for a page or file of the website or web app | Hosts the website and the web app's files |
| Google Fonts (Google LLC) | Your IP address and browser details when the website loads its fonts | Serves the fonts used on the website |

Each provider processes data under its own terms: Google (https://policies.google.com/privacy), RevenueCat (https://www.revenuecat.com/privacy), Stripe (https://stripe.com/privacy), Vercel (https://vercel.com/legal/privacy-policy). We do not sell, rent or share personal data with anyone else.

## 6. The Android waitlist on the website
If you join the Android waitlist on https://deco.hero-apps.com, we store your email address, the language of the page, the page address and the time in our own inbox database (Cloud Firestore, a Google service). A notification with the same details is sent to our email through FormSubmit (https://formsubmit.co). We use your address only to tell you when the Android app is available. To be removed from the list, email support@hero-apps.com.

## 7. Permissions
**Android app.**

- **Camera:** to photograph a room. You can also pick an existing photo with Android's photo picker, which needs no permission.
- **Storage (older Android versions only):** to save a design to your gallery when you tap Save.

**Web app.** You choose a photo through your browser's own file or camera picker.

DecoHero does not use your location, contacts, microphone or advertising ID.

## 8. Browser storage and cookies
The web app keeps a small amount of data in your browser's storage (local storage and similar) so it works between visits:

- your sign-in session, managed by Firebase Authentication, so you stay signed in;
- app settings such as your language choice.

During checkout, Stripe and RevenueCat may set their own cookies or browser storage to process the payment and prevent fraud. We set no advertising or analytics cookies on the website or in the web app. Signing out, or clearing the site data for deco.hero-apps.com in your browser, removes what the web app stored.

<!-- TODO(Dorien): once the web app is final, list the exact local storage keys here (check the built app in the browser's dev tools: Application > Storage) and confirm that nothing else is stored. -->

## 9. What we do not do
- No advertising and no advertising ID. We run no analytics and no crash reporting of our own, and the apps contain no advertising, analytics or crash reporting SDKs. The only third-party events are the technical checkout events the RevenueCat software sends to RevenueCat when you buy credits on the web (section 4).
- No selling of personal data, and no use of your photos to train AI models.
- Android app: no accounts, passwords or sign-in.
- Web app: no passwords of our own. Sign-in is handled by Google, and our server stores no email address, name or profile picture.

## 10. How long we keep data, and deleting it
Photos and designs are not kept on our server at all. The IP address in your install or account record is erased automatically once the record is 48 hours old. The other records in section 2 have no automatic expiry at the moment: we keep them until you delete them or ask us to delete them. Purchase records may need to be kept longer where tax or accounting law requires it.

**Web app.** Open About and privacy in the web app and choose Delete account. This immediately removes the link to your sign-in, your credit balance, your design log and your reports from our server, and deletes your account in Firebase Authentication. Purchase records are kept for tax and accounting, no longer linked to the account. Unused credits are lost and cannot be restored.

After the deletion we keep two things for a short time, only to prevent abuse: a one-way salted hash of your sign-in ID for up to 3 hours, so that a session that was still open cannot re-create the account, and the record that free starter credits were given to your IP address, which is deleted after 48 hours like the other IP data. We also keep the account's random DecoHero ID on a list of deleted accounts, with no sign-in ID, email or IP attached, so that a payment that arrives late is not credited to a deleted account.

If you cannot sign in, email support@hero-apps.com from the address of your Google account and we will delete the account for you.

<!-- TODO(Dorien): account deletion does not remove the customer record that RevenueCat and Stripe hold for past web purchases. Decide whether to say so here, or to delete those on request. -->

**Android app.** To delete your data, email support@hero-apps.com. Include your install ID: you find it in the app under About and privacy (link at the bottom of the home screen), where you can copy or share it. If you no longer have the app, send one of these instead:

- the Google Play order number of a credit purchase (it starts with GPA. and is in your Google Play receipt email), or
- the approximate date and time you first opened the app.

We delete what we find within 30 days and confirm by email. Uninstalling DecoHero removes the install ID from your phone, so a later install starts fresh. It does not by itself delete the record on our server, and unused credits on the old install cannot be recovered.

Under the GDPR, the CCPA and similar laws you may also ask us what we hold about you, ask us to correct it, or object to how we use it. Write to the same address. We answer within 30 days.

## 11. Security
All traffic between the app, our server, Google, RevenueCat and Stripe is encrypted with HTTPS. The release Android app refuses to talk to a server address that is not HTTPS. Our Gemini API key lives only on the server, never in the app or in the web page.

## 12. Children
DecoHero is meant for adults. It is not directed to children under 13, and we do not knowingly collect their data.

## 13. Changes and contact
If we change what DecoHero does with data, we update this page and the date at the top. Questions: support@hero-apps.com, Divina Endeavors LLC, United States.
