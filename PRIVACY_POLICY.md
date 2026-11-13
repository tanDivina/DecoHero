# DecoHero Privacy Policy
_Last updated: November 12, 2026_

Published at https://hero-apps.com/decohero/privacy.html (English and Spanish). Source: `~/hero-apps/decohero/privacy.html`. Keep this file and that page in sync.

DecoHero is made by Divina Endeavors LLC (Hero Apps), United States, the data controller for anything described here. Contact: support@hero-apps.com.

## In short
DecoHero has no accounts, no ads and no analytics. To make a redesign, the app sends the room photo you choose to our server, which passes it to Google's Gemini API and sends the design back to your phone. We do not store your photos or the designs. Our server does keep a small record linked to a random install ID: your credit balance, your purchases, which styles you generated, any designs you reported, and, for the first 48 hours only, the IP address your install first connected from. We keep the rest of that record until you ask us to delete it.

## 1. Your room photos and designs
When you tap to redesign, the app shrinks your photo (to at most 1280 pixels on the long side) and sends it over an encrypted connection to our server, together with the style you picked. Our server sends the photo and a fixed style instruction to the Google Gemini API, receives the redesigned image, and returns it to your phone.

- Our server handles the photo and the design in memory only. It does not write them to its database, to disk or to its logs, and they are gone once the request finishes.
- We use Google's paid Gemini API. Under its terms Google does not use your photos or designs to improve its products. Google may keep them for a limited time to detect abuse.
- On your phone, designs are kept in the app's temporary cache. They are saved to your gallery only when you tap Save, and shared only when you tap Share.
- You cannot type your own prompts. Every design uses one of the fixed styles in the app.

## 2. What our server stores
The first time you open DecoHero, it creates a random install ID on your phone. It is not linked to your name, email, phone number or Google account. Our server stores the following, linked to that ID:

| Record | What it contains | Why |
|---|---|---|
| Install record | Install ID, credit balance, whether you have ever bought credits, whether the install was refused free credits because of the limit described here, the date it was created, and the IP address your install first connected from (for IPv6, only the network part, the first four blocks). The IP address is erased automatically once the install is 48 hours old. | Keep your credit balance. The IP address lets us give free credits to a limited number of new installs per IP address per day, so free credits cannot be farmed. |
| Purchases | Install ID, the credit pack bought, the number of credits, the RevenueCat event ID, the Google Play transaction ID, the time, and the time of any refund | Add the credits you paid for exactly once, and remove them again if the purchase is refunded |
| Design log | Install ID, the style generated, whether it worked, and the time | Spot abuse, control costs and answer support questions |
| Reports | Install ID, the style of the design you reported, and the time. The report does not include your photo or the design. | Review AI output that users flag |
| Daily totals | The number of designs made per day, with no personal data | Daily spending limits |

**IP address.** Besides the copy in the install record, the server also keeps your IP address in memory for up to 10 minutes to limit how many requests one connection can make. That copy is not written to disk.

**Server logs.** Our hosting provider keeps the server's log output for a limited period set by the provider. These logs contain error messages, for each purchase the install ID and the credit pack, and for each refund the credit pack. They do not contain photos or designs. The provider's request logs also record the IP address, time and web address of each request to our server; for older versions of the app that address includes the install ID.

## 3. Buying credits
Payments are handled by Google Play. We never see your card details, and our server does not receive your name or the email address of your Google account. We use RevenueCat to confirm purchases: the app gives RevenueCat your install ID as its user ID, and RevenueCat receives your Google Play purchase details and basic technical information from its SDK (such as app version and device platform). RevenueCat then tells our server which credit pack to add. If Google Play refunds a purchase, RevenueCat tells our server and the credits from that pack are removed from your balance.

## 4. Who else receives data
| Provider | What it receives | Why |
|---|---|---|
| Google Gemini API (Google LLC) | Your room photo and the style instruction | Creates the redesign |
| RevenueCat, Inc. | Install ID, purchase details, basic device and app information | Confirms purchases and tells our server to add credits |
| Google Play (Google LLC) | Your purchase, under your Google account | Processes the payment |
| Our cloud hosting provider | Everything our server receives, as our processor | Runs the DecoHero server and its database |

Each provider processes data under its own terms: Google (https://policies.google.com/privacy), RevenueCat (https://www.revenuecat.com/privacy). We do not sell, rent or share personal data with anyone else.

## 5. Permissions the app asks for
- **Camera:** to photograph a room. You can also pick an existing photo with Android's photo picker, which needs no permission.
- **Storage (older Android versions only):** to save a design to your gallery when you tap Save.

DecoHero does not use your location, contacts, microphone or advertising ID.

## 6. What we do not do
- No accounts, passwords or sign-in.
- No advertising, no advertising ID, no analytics SDKs and no crash reporting SDKs.
- No selling of personal data, and no use of your photos to train AI models.

## 7. How long we keep data, and deleting it
Photos and designs are not kept on our server at all. The IP address in your install record is erased automatically once the install is 48 hours old. The other records in section 2 have no automatic expiry at the moment: we keep them until you ask us to delete them. Purchase records may need to be kept longer where tax or accounting law requires it.

To delete your data, email support@hero-apps.com. Include your install ID: you find it in the app under About and privacy (link at the bottom of the home screen), where you can copy or share it. If you no longer have the app, send one of these instead:

- the Google Play order number of a credit purchase (it starts with GPA. and is in your Google Play receipt email), or
- the approximate date and time you first opened the app.

We delete what we find within 30 days and confirm by email. Uninstalling DecoHero removes the install ID from your phone, so a later install starts fresh. It does not by itself delete the record on our server, and unused credits on the old install cannot be recovered.

Under the GDPR, the CCPA and similar laws you may also ask us what we hold about you, ask us to correct it, or object to how we use it. Write to the same address. We answer within 30 days.

## 8. Security
All traffic between the app, our server, Google and RevenueCat is encrypted with HTTPS. The release app refuses to talk to a server address that is not HTTPS. Our Gemini API key lives only on the server, never in the app.

## 9. Children
DecoHero is meant for adults. It is not directed to children under 13, and we do not knowingly collect their data.

## 10. Changes and contact
If we change what DecoHero does with data, we update this page and the date at the top. Questions: support@hero-apps.com, Divina Endeavors LLC, United States.
