const { Validation } =require('./Validation');
const { OAuth } = require('./OAuth');
const { Quote } = require('./Quotes');
const util          = require('util');
const request       = require('request').defaults({encoding: null});

class Tweet {
    constructor(){
        this.OA =  new OAuth();
        this.Validate =  new Validation();
        this.Q =  new Quote();
        this.get = util.promisify(request.get);
        this.post = util.promisify(request.post);
        this.tweetId = '';
        this.messageVar  = {};
        this.usersVar    = {};
        this.event = {};
        this.friendship = {};
        this.quotes = [];
    }

    async  receiveDMEvent(event) {
        this.event = event;
        await this.getDirectMessage()    
    }
    async getDirectMessage() {
    
        if (!this.event.direct_message_events) {
            return;
        }
    
        // Count the users followers and tweets.
        const users           = Object.values(this.event.users);
        this.usersVar = {
            usersFollowersCount : (Object.values(users)[0]).followers_count,
            usersStatusesCount  : (Object.values(users)[0]).statuses_count
        };

        // Assigns the important constant variables.
        var message           = this.event.direct_message_events.shift();
        this.messageVar = {
            senderScreenName  : this.event.users[message.message_create.sender_id].screen_name,
            senderAttachment  : message.message_create.message_data.attachment,
            senderUrl         : message.message_create.message_data.entities.urls.url,
            senderMessage     : message.message_create.message_data.text,
            recipientId       : message.message_create.target.recipient_id,
            senderId          : message.message_create.sender_id,
            senderMsgId       : message.id,
        };

       
 
        // Check to see if the message is undefined/error.
        if (typeof message === 'undefined' || typeof message.message_create === 'undefined') {
            return;
        }
    
        // Check to see if the sender is the same as the recipient of the message.
        if (this.messageVar.senderId === this.messageVar.recipientId) {
            return;
        }
    
        // [CHANGEABLE] Put your own sender id to block the bot from sending DM to itself.
        // Check it in console.log(senderId);
        if (this.messageVar.senderId === '1421363180253577218') {
            return;
        }
    
        
        // [CHANGEABLE] Put your desired keyword here, replace the /tst/ keyword.
        if (!((this.messageVar.senderMessage).toLowerCase()).includes(this.Validate.getTrigger())) {
            return;
        }


        // [CHANGEABLE] Rejects all messages from users below 100 followers and 500 tweets.
        else if (!(this.usersVar.usersFollowersCount > this.Validate.getFollowers() && this.usersVar.usersStatusesCount > this.Validate.getStatuses())) {
          
            await this.rejectMessage(this.messageVar.senderId, this.messageVar.senderScreenName);
            return;
        }
        else

        this.quotes = this.Q.getQuotes();

        await this.checkFriendship(this.Validate.dev_screen_name, this.messageVar.senderScreenName).then(response => {
           this.friendship = JSON.parse(Buffer.from(response.body).toString());
        })

        if(!this.friendship.relationship.target.following){
            await  this.tellToFollowMessage(this.messageVar.senderId, this.messageVar.senderScreenName).then(function(response){
            });
            return;
        }

        if(!this.friendship.relationship.source.following){
            await  this.tellNotFollbackMessage(this.messageVar.senderId, this.messageVar.senderScreenName).then(function(response){
            });
            return;
        }

    
        // This if else if functions will check the messages for an image.
        // If there's no image, then it will check for URL/Link.
        // If there's no URL/Link, then it will just post the text.
        if (typeof this.messageVar.senderAttachment !== 'undefined') {
    
            try {
    
                const senderMediaUrl = this.messageVar.senderAttachment.media.media_url;
    
                let image = {};
                await this.getMedia(senderMediaUrl).then(response => {
                    //console.log(JSON.stringify(response, null, 4));
                    image = { 
                    imageBuffer: Buffer.from(response.body)
                    };
                }); 
                var imageBase64 = (image.imageBuffer).toString('base64');
                var imageBytes = Buffer.byteLength(image.imageBuffer, 'base64');
        
                let media = {};
                await this.uploadMediaInit(imageBytes).then(response => {
                    //console.log(JSON.stringify(response, null, 4));
                    media = {
                    mediaBody : response.body,
                    };
                });
                var mediaJson = JSON.parse(media.mediaBody);
                var mediaIdString = mediaJson.media_id_string;
                    
                await this.uploadMediaAppend(mediaIdString, imageBase64).then(response => {
                    //console.log(JSON.stringify(response, null, 4));
                });
                   
                await this.uploadMediaFinalize(mediaIdString).then(response => {
                    //console.log(JSON.stringify(response, null, 4));
                });
        
                const senderMediaLink = message.message_create.message_data.entities.urls[0].url;
                
                var statusWithUrl = this.messageVar.senderMessage;
                var urlToRemove = senderMediaLink;
                var statusNoUrl = statusWithUrl.replace(urlToRemove, "");
                
                let encodeMsg = statusNoUrl;
                if (encodeMsg.length <= 150){
                    encodeMsg += '\n\n\n 👻 Quote: ' + this.quotes[Math.floor(Math.random()*this.quotes.length)].quote; 
                }
                const encodeImg = mediaIdString;

                await this.postTweet(this.messageVar.senderScreenName, encodeMsg, undefined, encodeImg);
            }
    
            catch (e) {
                console.error(e);
            }
        }
    
        else if (typeof senderAttachment === 'undefined' && typeof senderUrl !== 'undefined') {
    
            try {
    
                let encodeMsg = this.messageVar.senderMessage;
                if (encodeMsg.length <= 150){
                    encodeMsg += '\n\n\n 👻 Quote: ' + this.quotes[Math.floor(Math.random()*this.quotes.length)].quote; 
                }
                const encodeUrl = this.messageVar.senderUrl;

                await this.postTweet(this.messageVar.senderScreenName, encodeMsg, encodeUrl, undefined);
            }
            
            catch (e) {
                console.error(e);
            }
        }
    
        else if (typeof senderAttachment === 'undefined' && typeof senderUrl === 'undefined') {
    
            try {
    
                let encodeMsg = this.messageVar.senderMessage;
                if (encodeMsg.length <= 150){
                    encodeMsg += '\n\n\n 👻 Quote: ' + this.quotes[Math.floor(Math.random()*this.quotes.length)].quote; 
                }
                await this.postTweet(this.messageVar.senderScreenName, encodeMsg, undefined, undefined);
            }
            
            catch (e) {
                console.error(e);
            }
        }
    }

    async checkFriendship(source_screen_name, target_screen_name){
        const request = {
            url: `https://api.twitter.com/1.1/friendships/show.json?source_screen_name=${source_screen_name}&target_screen_name=${target_screen_name}`,
            oauth: this.OA.getConfig(),
        };
        return await this.get(request).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }
    
    async  getTweetId() {
    
        if (!this.event.tweet_create_events) {
            return;
        }

        const tweet = this.event.tweet_create_events;

        const tweetId = {
        id : Object.values(tweet)[0].id_str
        };

        return tweetId;
    }

    async replyDirectMessage() {
    
        // Check to see if the message is undefined/error.
        if (typeof this.messageVar.senderId === 'undefined' || typeof this.messageVar.senderScreenName === 'undefined' || this.messageVar.senderMessage === 'undefined') {
            return;
        }
    
        // Check to see if the sender is the same as the recipient of the message.
        if (this.messageVar.senderId === this.messageVar.recipientId) {
            return;
        }
    
        // [CHANGEABLE] Put your own sender id to block the bot from sending DM to itself.
        // Check it in console.log(senderId);
        if (this.messageVar.senderId === '1421363180253577218') {
            return;
        }
    
        // [CHANGEABLE] Put your desired keyword here, replace the /tst/ keyword.
        if (!((this.messageVar.senderMessage).toLowerCase()).includes(this.Validate.getTrigger())) {
            return;
        }

        // [CHANGEABLE] Rejects all message from users below 100 followers and 500 tweets.
        else if (!(this.usersVar.usersFollowersCount > this.Validate.getFollowers() && this.usersVar.usersStatusesCount > this.Validate.getStatuses())) {
            return;
        }
        else
        
        await this.replyMessage(this.messageVar.senderId, this.messageVar.senderScreenName, this.messageVar.senderMessage, this.tweetId.id);
    }

    async  replyDMEvent(event) {
        this.event = event;
        this.tweetId = await this.getTweetId();
    
        // Calling function to mark read the message sent to us. 
        await this.markAsRead(this.messageVar.senderMsgId, this.messageVar.senderId).then(response => {
            //console.log(JSON.stringify(response, null, 4));
        });
    
        // Showing the typing thing when the bot is processing.
        await this.indicateTyping(this.messageVar.senderId).then(response => {
            //console.log(JSON.stringify(response, null, 4));
        });
    
        await this.getTweetId();
    
        await this.replyDirectMessage();
    } 

    async welcomeMessage(event){
        this.event = event;
        const sender_id = this.event.follow_events[0].source.id
        const screen_name = this.event.follow_events[0].source.screen_name
        const requestReply = {
            url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
            oauth: this.OA.getConfig(),
            json: {
            event: {
                type: 'message_create',
                message_create: {
                target: {
                    recipient_id: sender_id
                },
                message_data: {
                    text: `Hai @${screen_name}! 👋. Selamat datang di Scare Fess ya \n ~👻`
                }
                }
            }
            }
        };
        console.log(`[${new Date().toLocaleString()}] [CONSOLE] User @${screen_name} following`);
        return await this.post(requestReply).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }
    
    // And all this functions below is the functions to be called inside the receive/replyDMEvent function.
    async  markAsRead(message_id, sender_id) {
    
        const requestRead = {
            url: 'https://api.twitter.com/1.1/direct_messages/mark_read.json',
            oauth: this.OA.getConfig(),
            form: {
            last_read_event_id: message_id,
            recipient_id: sender_id
            }
        };
        return await this.post(requestRead).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }
    
    async  indicateTyping(sender_id) {
    
        const requestIndicator = {
            url: 'https://api.twitter.com/1.1/direct_messages/indicate_typing.json',
            oauth: this.OA.getConfig(),
            form: {
            recipient_id: sender_id
            }
        };
        return await this.post(requestIndicator).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }
    
    async  getMedia(url) {
    
        const getImage = {
            url: url,
            oauth: this.OA.getConfig()
        };
        return await this.get(getImage).then(function(response) {
            return response; 
        })
        .catch(error => console.error(error));
    }
    
    async  uploadMediaInit(total_bytes) {
        
        const uploadImageInit = {
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            oauth: this.OA.getConfig(),
            form: {
            command: 'INIT',
            total_bytes: total_bytes,
            media_type: 'image/jpeg'
            }
        };
        return await this.post(uploadImageInit).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }
    
    async  uploadMediaAppend(media_id, media_data) {
    
        const uploadImageAppend = {
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            oauth: this.OA.getConfig(),
            formData: {
            command: 'APPEND',
            media_id: media_id,
            segment_index: '0',
            media_data: media_data
            }
        };
        return await this.post(uploadImageAppend).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }
    
    async  uploadMediaFinalize(media_id) {
    
        const uploadImageFinalize = {
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            oauth: this.OA.getConfig(),
            form: {
            command: 'FINALIZE',
            media_id: media_id
            }
        };
        return await this.post(uploadImageFinalize).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }
    
    async  replyMessage(sender_id, sender_screen_name, sender_message, tweet_id) {
    
        const requestReply = {
            url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
            oauth: this.OA.getConfig(),
            json: {
            event: {
                type: 'message_create',
                message_create: {
                target: {
                    recipient_id: sender_id
                },
                message_data: {
                    text: `Hai @${sender_screen_name}! 👋. menfess kamu berhasil dikirim nih, cek disini ya \n ~👻 https://twitter.com/scarefess/status/${tweet_id}`
                }
                }
            }
            }
        };
        console.log(`[${new Date().toLocaleString()}] [CONSOLE] User @${sender_screen_name} says: ${sender_message}`);
        return await this.post(requestReply).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }
    
    async  rejectMessage(sender_id, sender_screen_name) {
    
        const requestReject = {
            url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
            oauth: this.OA.getConfig(),
            json: {
            event: {
                type: 'message_create',
                message_create: {
                target: {
                    recipient_id: sender_id
                },
                message_data: {
                    text: `Hai @${sender_screen_name}! 👋. Untuk mengirim menfess kamu harus punya ${this.Validate.getFollowers()} followers, dan ${this.Validate.getStatuses()} tweets dulu ya \n ~👻`,
                }
                }
            }
            }
        };
        console.log(`[${new Date().toLocaleString()}] [CONSOLE] Rejected user @${sender_screen_name}'s message`);
        return await this.post(requestReject).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }

    async  tellToFollowMessage(sender_id, sender_screen_name) {
    
        const requestReject = {
            url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
            oauth: this.OA.getConfig(),
            json: {
            event: {
                type: 'message_create',
                message_create: {
                target: {
                    recipient_id: sender_id
                },
                message_data: {
                    text: `Hai @${sender_screen_name}! 👋. Wah kamu belum follow nih, follow dulu yuk! @scarefess \n ~👻`,
                }
                }
            }
            }
        };
        console.log(`[${new Date().toLocaleString()}] [CONSOLE] Rejected user @${sender_screen_name}'s message`);
        return await this.post(requestReject).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }

    async  tellNotFollbackMessage(sender_id, sender_screen_name) {
    
        const requestReject = {
            url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
            oauth: this.OA.getConfig(),
            json: {
            event: {
                type: 'message_create',
                message_create: {
                target: {
                    recipient_id: sender_id
                },
                message_data: {
                    text: `Hai @${sender_screen_name}! 👋. Yaaah, kamu belum dapat follback nih, tunggu sesi open follback dulu ya \n ~👻`,
                }
                }
            }
            }
        };
        console.log(`[${new Date().toLocaleString()}] [CONSOLE] Rejected user @${sender_screen_name}'s message`);
        return await this.post(requestReject).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }
    
    
    async postTweet(sender_screen_name, status, attachment_url, media_ids) {
    
        const sendTwt = {
            url: 'https://api.twitter.com/1.1/statuses/update.json',
            oauth: this.OA.getConfig(),
            form: {
            status: status,
            attachment_url: attachment_url,
            media_ids: media_ids
            }
        };
        console.log(`[${new Date().toLocaleString()}] [CONSOLE] Tweeted user @${sender_screen_name}'s message`);
        return await this.post(sendTwt).then(function(response) {
            return response;
        })
        .catch(error => console.error(error));
    }
    
    sleep(ms) {
    
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }
}

module.exports = {
    Tweet
}