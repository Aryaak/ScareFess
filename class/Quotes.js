const fs = require('fs');

class Quote {
    constructor(){
        this.quotes = [];
        this.fetchQuotes();
    }

    async fetchQuotes() {
       await fs.readFile('data/quotes.json', 'utf8', (err, data) => {
            if (err) {
                console.log(`Error reading file from disk: ${err}`);
            } else {
                this.quotes = JSON.parse(data);
            }
        
        });
    }

    getQuotes(){
        return this.quotes;
    }
}
module.exports = {
    Quote
}