# HMU Verification bot

This bot is used to confirm identity of vetted and private mailing list group members within the HMU Discord chat server.

## Setup

```sh
git clone git@github.com:hitmeupnyc/hmu-bot.git
cd hmu-bot/
npm install
npm test
npm start

# …
npm run deploy
# only needed to be run once, ever
npm run deploy:commands
```

## notes

As part of configuration, share the Google Sheet used with `hmu-bot@auth-project-189019.iam.gserviceaccount.com` which was configured [here](https://console.cloud.google.com/iam-admin/serviceaccounts?project=auth-project-189019&supportedpurview=project)
