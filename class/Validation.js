const { OAuth } = require('./OAuth');

class Validation {
    constructor(){
        this.OA =  new OAuth();
        this.followers = 10;
        this.statuses = 10;
        this.trigger = 'scare!';
        this.dev_screen_name = 'scarefess'
    
    }

    getFollowers(){
        return this.followers;
    }

    getStatuses(){
        return this.statuses;
    }

    getTrigger(){
        return this.trigger;
    }


}

module.exports = {
    Validation
}