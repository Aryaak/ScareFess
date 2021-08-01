/*jshint esversion: 9*/

require('dotenv').config();

const { Autohook }  = require('twitter-autohook');
const { OAuth } = require('./class/OAuth');
const { Tweet } = require('./class/Tweet'); 


const OA = new OAuth();
const T = new Tweet();

// Starts the bot.
(async start => {

    try {
        const webhook = new Autohook(OA.getConfig());
        await webhook.removeWebhooks();
        await webhook.start();

        webhook.on('event', async event  => {
            if (event.direct_message_events) {
                await T.receiveDMEvent(event);
            }
            else if (event.tweet_create_events) {
                await T.replyDMEvent(event);
            }
        });

        await webhook.subscribe({
            oauth_token: process.env.ACCESS_TOKEN,
            oauth_token_secret: process.env.ACCESS_TOKEN_SECRET
        });
    }
    
    catch (e) {
        console.error(e);
        if (e.name === 'RateLimitError') {
            await sleep(e.resetAt - new Date().getTime());
            process.exit(1);
        }

        else 
        process.exit(1);
    }
}) ();