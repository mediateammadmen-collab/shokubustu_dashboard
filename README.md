# Shokubutsu Meta Ads dashboard

A server-rendered dashboard showing live Meta Ads performance for Shokubutsu Bangladesh. It only reads from Meta.

## Environment setup

Copy `.env.example` to `.env.local` and fill it in. All three variables are server-only.

| Variable | Value |
| --- | --- |
| `META_ACCESS_TOKEN` | A token with the `ads_read` permission |
| `META_AD_ACCOUNT_ID` | The ad account, such as `act_1234567890` |
| `META_API_VERSION` | The Graph API version, such as `v26.0` |

Then run:

```bash
npm install
npm run dev
```

If a variable is missing, the dashboard shows an error naming it.

## Generating a token

A system user token is best for the live site, because it doesn't depend on one person's login and can be limited to this ad account.

1. Open [Meta Business Settings](https://business.facebook.com/settings) and go to **Users > System users**.
2. Create a system user, or pick an existing one.
3. Choose **Assign assets**, select only this ad account, and grant view access to its performance.
4. Choose **Generate token**, pick your Meta app, and tick `ads_read`.
5. Save the token in `.env.local` and in Netlify. Never commit it.

To let ad videos play on the dashboard, also assign the Facebook Page that owns them. Without access, Meta returns no video file and the card shows the poster instead.

## Deploying to Netlify

`netlify.toml` already sets the build command and the Next.js plugin.

```bash
npx netlify-cli login
npx netlify-cli init
npx netlify-cli env:set META_API_VERSION v26.0
npx netlify-cli deploy --build --prod
```

Set `META_ACCESS_TOKEN` and `META_AD_ACCOUNT_ID` the same way, or under **Site configuration > Environment variables** in Netlify.

Deploying from your own computer copies `.env.local` into the server bundle. Move it out of the project folder while you deploy, and put it back afterwards.

The dashboard has no login, so anyone with the link can see the data, including through the JSON routes. Add Netlify's password protection if that isn't what you want.

## How the numbers work

- **Bangladesh only:** the dashboard includes campaigns whose name contains `bangladesh`, in any letter case. The delivery country is only displayed.
- **Reach** always comes from Meta at the account or filtered level, and is never added up across campaigns.
- **Daily reach** counts the people reached on each day. The same person can count on several days, so the daily figures add up to more than Unique Reach.
- **Age shares** are each age group's part of the total for that metric. Meta reports reach separately for each age, so age reach can differ slightly from Unique Reach.
- **Location** comes from Meta's region breakdown and shows where ads were delivered, including outside Bangladesh. Meta reports reach separately for each region, so the total row uses Unique Reach instead of adding them up.
- **Placement** comes from Meta's platform and position breakdown. Its total row also uses Unique Reach.
- **Platform and device** come from Meta's platform and device breakdowns. **Operating system** is worked out from the device, because Meta doesn't report it. Desktop can't be split further, and the table leaves reach empty because it can't be added across devices.
- **Video metrics** appear only on video ads. Video plays and 3s views are different Meta metrics, and cost per ThruPlay is spend divided by ThruPlays.
- **Results and cost per result** use Meta's own fields. For reach, cost per result is spend ÷ reach × 1,000.
- **Rates** are calculated from summed raw counts, never averaged.
- **Rate limits:** the last good result for each date range is saved in the system temp folder. During a Meta rate limit the page shows it with a notice, and pauses calls to Meta for 2 minutes after retries fail.
- **Caching:** numbers are cached for 5 minutes, ad images and details for 6 hours, and account settings for a day. The Refresh button clears the numbers and ad details, so use it sparingly while on Meta's lower access tier.

## JSON routes

`GET /api/insights` and `GET /api/creatives` accept the same `range`, `start` and `end` parameters as the dashboard.

## Adding a logo

The header currently shows a text mark. To use a logo, add `public/logo.png` and replace the mark in `components/Header.js`.
