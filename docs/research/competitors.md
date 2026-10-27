# Competitor research (checked 2026-10-27)

Legend: **[V]** verified from a source opened on 2026-10-27, **[U]** unverified (general knowledge or an inference).

## 1. Pollnet Global / TheMyLeader (India)
- **Who:** Pollnet Global Pvt Ltd, an active Indian company incorporated 2018-12-18 (CIN U74999RJ2018PTC063349) [V] ([qorpiq](https://qorpiq.com/company/pollnet-global-private-limited/U74999RJ2018PTC063349)). It describes itself as a "technology firm based in Singapore" [V] ([uptoplay](https://www.uptoplay.net/themyleader/com.global.pollnet.themyleader)).
- **Product:** TheMyLeader ("India's first democracy app") connects citizens with their MP, MLA and officials, and lets citizens send issues to them. Sold as a service to candidates: candidate apps, social-media marketing, WhatsApp and Facebook creatives, a 24/7 call centre [V] (uptoplay).
- **Users:** 3,013 Android downloads. Last update v2.0 on 2022-07-28. **Removed from Google Play on 2025-01-09** [V] ([chrome-stats](https://chrome-stats.com/d/com.global.pollnet.themyleader)).
- **Reviews:** a handful of positive reviews from 2019 [V] (chrome-stats).
- **Business model:** B2B. Candidates and campaigns pay; it is a campaign tool, not neutral [V/inferred].
- **Privacy:** a template privacy policy listing Firebase Analytics, Crashlytics and the Facebook SDK as third-party collectors [V] ([policy](https://pages.flycricket.io/themyleader/privacy.html)). No identity verification or secret ballot is described [U: absence of evidence].
- **Trademark:** an Indian application filed 2014, class 35, status "Send To Vienna Codification" [V, non-official source] ([insiderbiz](https://www.insiderbiz.in/company-trademark/POLLNET-GLOBAL-PRIVATE-LIMITED)).
- **Weaknesses:** effectively dead, tiny reach, partisan funding, ad and analytics SDKs, no ballot integrity.

## 2. Global
| Product | What it is | Model | Weakness vs us |
|---|---|---|---|
| GeoPoll (Mobile Accord, USA) | Mobile survey platform for clients | B2B work orders, 50% upfront [V] ([terms](https://www.geopoll.com/on-demand-terms/)) | Not a citizen product. **Owns the GeoPoll name**, so we must rename |
| Show of Hands | Community polling app, results by demographics, anonymous [V] ([App Store](https://apps.apple.com/us/app/show-of-hands-polls-more/id336442597)) | Consumer [U: ads/premium] | Last iOS update 2023-10-05 [V]. No verified identity, so results can be gamed; US-centric |
| Pol.is / vTaiwan | Consensus mapping. vTaiwan is volunteer-run and has driven no major decisions since 2018 [V] ([DOD](https://www.designingopendemocracy.com/organisations/vtaiwan/)) | Open source / civic | No ballot, no mobile youth UX |
| Decidim | Open-source participatory-democracy platform for cities | Hosted by integrators. Open Source Politics is moving clients to Go Vocal [V] ([FAQ](https://opensourcepolitics.eu/wp-content/uploads/2026/03/FAQ_OSP_GOVOCAL.pdf)) | Institution-run, heavy UX, not national |
| Join (Taiwan) | Government petition and consultation platform [U] | Government | Government-run, Taiwan only |

## 3. Israel
| Player | What | Notes |
|---|---|---|
| Midgam (Channel 12) | Pollster, online plus phone. ~507 respondents of 2,502 contacted; weighting not published [V] ([Benaym](https://www.davidbenaym.com/en/articles/sondages-israeliens-ce-quils-disent-ce-quils-ne-disent-pas)) | Opaque weighting, small samples |
| HaMadad (Channel 13, since June 2026) | Three online panels (Midgam Project, Askaria, StatNet), ~1,016 respondents, the most detailed publisher [V] (Benaym; [Wikipedia](https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_Israeli_legislative_election)) | Contact counts and weighting not published |
| Panels Politics | Maariv pollster until 2023-06-29 [V] ([politpro](https://politpro.eu/en/israel/polling-institutes/panels-politics)) | Not active for Maariv now |
| iPanel | Paid survey-panel app (points for vouchers), ~100k members, ESOMAR [V] ([site](https://www.ipanel.co.il/), [Play](https://play.google.com/store/apps/details?hl=he&id=com.ipanel.app)) | Paid respondents, commercial research, no public results |
| Kalpi-style apps | Not researched in depth [U] | — |

Note: "Hamidgam" in the brief is Midgam / Project Midgam.

## 4. How we win
1. **A verified, secret ballot.** One person, one vote, using identity tiers and blind-signature tokens (ADR-0019/0024), while no one, us included, can see who voted what. None of the products above offers both [V from the sources above, as far as they describe].
2. **Radical transparency.** Open repo, published method, k-thresholds and snapshots, versus pollsters that do not publish weighting [V Benaym].
3. **Privacy by design, no ads, no tracking SDKs.** Compare TheMyLeader's Firebase and Facebook SDKs [V].
4. **Neutral and citizen-owned.** No candidate or client pays for results, versus Pollnet (campaigns) and GeoPoll/iPanel (clients).
5. **Youth-first mobile UX** in Hebrew and English, plus a social layer with public profiles and opt-in anonymity (ADR-0023), versus institutional tools like Decidim and Pol.is.
6. **Election-law aware.** §16ה blackout enforced from config.

## 5. Naming implications
- "GeoPoll" conflicts with Mobile Accord's GeoPoll [V].
- "PollNet" conflicts with Pollnet Global (same domain), and pollnet.com is registered (2002) [V RDAP].
