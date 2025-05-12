# Discord Verification bot

This bot is used to confirm identity of vetted and private mailing list group members within the Gloss Discord chat server.

## Setup

```sh
git clone git@github.com:vcarl/gloss-bot.git
cd gloss-bot/
npm install
npm test
npm start

# …
npm run deploy
# only needed to be run once, ever
npm run deploy:commands
```

## notes

As part of configuration, share the Google Sheet used with `gloss-728@auth-project-189019.iam.gserviceaccount.com` which was configured [here]()

## new project notes

There are 3 files for env vars:

- .env
  - These are used during the commands deploy script
- wrangler.toml
  - Unsure if these are used locally, they are used in production and must be present. Secrets live in the web UI under settings for a worker.
- .dev.vars
  - These are used locally

[Set up a new service account](https://console.cloud.google.com/iam-admin/serviceaccounts?project=auth-project-189019&supportedpurview=project), then in account settings, download a new key. Update the values in `google-auth.ts`, and include the private key in `.dev.vars`.

[Set up a new Mailjet sender address here](https://app.mailjet.com/account/sender?type=domain)
