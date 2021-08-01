class Validation {
    constructor(){
        this.followers = 10,
        this.statuses = 10,
        this.trigger = 'scare!'
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