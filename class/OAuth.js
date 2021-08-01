class OAuth {
    constructor(){
        this.config = {
            token           : process.env.ACCESS_TOKEN,
            token_secret    : process.env.ACCESS_TOKEN_SECRET,
            consumer_key    : process.env.CONSUMER_KEY,
            consumer_secret : process.env.CONSUMER_KEY_SECRET,
            env             : process.env.WEBHOOK_ENV,
            ngrok_secret    : process.env.NGROK_AUTH_TOKEN 
        }
    }

    getConfig(){
        return this.config;
    }
}

module.exports = {
    OAuth
}