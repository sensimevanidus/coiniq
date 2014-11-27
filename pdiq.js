/**
 * 3rd party libraries
 */
var request = require('request'); // used for API calls.
var chalk = require('chalk'); // used to colorize console output.

/**
 * PDIQ client config
 */
var pdiqClientConfig = {
    
    /**
     * Bet amounts
     */
    defaultBetAmount: 10.0, // default bet amount
    betAmount: 10.0, // bet amount of the current game (some algorithms may increase bet amount in a session)
    previousBetAmount: null, // previous game's bet mount
    
    /**
     * Balance
     */
    maxBalance: null, // the maximum balance seen in the current session
    balance: null, // current balance of the user
    startingBalance: null, // starting balance of the user
    
    /**
     * Profits
     */
    totalProfit: 0.0, // total profit made in this session
    totalProfitPercentage: 0.0, // total profit made in this session (in terms of percentage)
    
    /**
     * Counters
     */
    gameNumber: 1, // number of the game in the current session
    lossCounter: 0, // number of successive losses
    winCounter: 0, // number of successive wins
    regenerateSeedAt: 100, // frequence of seed regeneration
    
    /**
     * Game related
     */
    direction: '<', // algorithm's direction choice for the current game '<' or '>'
    target: 80, // base number used for deciding whether or not the user wins the game
    defaultTarget: 80, // base number used for deciding whether or not the user wins the game
    divider: 950.0, // a number used by the algorithm for adjusting bet for the game
                      // (e.g 950.0 for 5 losses, 5000.0 for 6 losses, 27000.0 for 7
                      // losses 137000.0 for 8 losses)
    timeout: 5000 // number of milliseconds for API response timeout
}

/**
 * PDIQ client
 */
var pdiqClient = {
    /**
     * Initialization method
     */
    init: function() {
        // Set the access token (given as a parameter)
        this.accessToken = process.argv[2];
        
        // How many games will this session have?
        this.numberOfGames = parseInt(process.argv[3]);

        // Reset profits
        this.totalProfit = 0.0;
        this.totalProfitPercentage = 0.0;

        // Reset counters
        this.gameNumber = 1;
        this.lossCounter = 0;
        this.winCounter = 0;
        
        if (this.accessToken) {
            // Fetch user information.
            // TODO: Fetch user information and set variables accordingly.
            
            // Finally, let the dice decide!
            this.run();
        } else {
            throw 'You must provide your Primedice access token to continue.';
        }
    },

    /**
     * Main method
     */
    run: function() {
        var self = this;
        request.post(self._getAPIURL('/bet'), {
            json: true,
            timeout: pdiqClientConfig.timeout,
            form: {
                amount: pdiqClientConfig.betAmount,
                target: pdiqClientConfig.target,
                condition: pdiqClientConfig.direction
            }
        }, function callback(err, httpResponse, result) {
            if (err) {
                console.log('Error: ' + err);
                // Continue the loop
                if (++pdiqClientConfig.gameNumber <= self.numberOfGames) {
                    setTimeout(function() {
                        self.run();
                    }, 50);
                } else {
                    self.end();
                }
            } else {
                if (result && result.bet) {
                    /**
                     * Algorithm goes in here
                     */
                    
                    // Is the game won?
                    var gameWon = result.bet.win;
                    
                    // Store the previous bet amount
                    pdiqClientConfig.previousBetAmount = pdiqClientConfig.betAmount;
                    
                    // Update the user balance
                    pdiqClientConfig.balance = result.user.balance;
                    
                    // Set the starting balance (just once)
                    if (null === pdiqClientConfig.startingBalance) {
                        pdiqClientConfig.startingBalance = pdiqClientConfig.balance;
                    }
                    
                    // Set the maximum balance (if necessary)
                    if (pdiqClientConfig.maxBalance < result.user.balance) {
                        pdiqClientConfig.maxBalance = result.user.balance;
                    }
                    
                    // Set the profits
                    pdiqClientConfig.totalProfit = pdiqClientConfig.balance - pdiqClientConfig.startingBalance;
                    pdiqClientConfig.totalProfitPercentage = parseFloat((pdiqClientConfig.totalProfit / pdiqClientConfig.startingBalance) * 100).toFixed(2);
                    
                    // If the game is won;
                    if (gameWon) { 
                        // Reset the bet amount
                        if (pdiqClientConfig.balance > 0.0 && pdiqClientConfig.betAmount > 0.0) {
                            pdiqClientConfig.betAmount = parseFloat(pdiqClientConfig.balance / pdiqClientConfig.divider).toFixed(2);
                        } else {
                            pdiqClientConfig.betAmount = pdiqClientConfig.defaultBetAmount;
                        }

                        // Reset the loss counter
                        pdiqClientConfig.lossCounter = 0;
                    }
                    
                    // Or else (if the game is lost);
                    else {
                        // Increase the bet amount
                        pdiqClientConfig.betAmount *= 5.25;

                        // Increment the loss counter
                        pdiqClientConfig.lossCounter++;
                    }

                    /**
                     * Output useful information
                     */
                    
                    if (gameWon) {
                        var winStr = chalk.green('[WIN]');
                    } else {
                        var winStr = chalk.red('[LOSS]');
                    }
                    
                    if (pdiqClientConfig.totalProfit >= 0.0) {
                        var totalProfitStr = chalk.green('Total profit: ' + parseFloat(pdiqClientConfig.totalProfit).toFixed(2) + "\t~ " + pdiqClientConfig.totalProfitPercentage + "%");
                    } else {
                        var totalProfitStr = chalk.red('Total loss: ' + parseFloat(pdiqClientConfig.totalProfit).toFixed(2) + "\t~ " + pdiqClientConfig.totalProfitPercentage + "%");
                    }
                    
                    console.log(
                        pdiqClientConfig.gameNumber + '. ' + winStr + "\t" +
                        "(" + pdiqClientConfig.lossCounter + ") " +    
                        "(" + parseFloat(result.bet.roll).toFixed(2) + ' ' + pdiqClientConfig.direction + ' ' + parseFloat(pdiqClientConfig.target).toFixed(2) + ")\t\t" +
                        "Bet: " + parseFloat(pdiqClientConfig.previousBetAmount).toFixed(2) + "\t\t" +
                        "Balance: " + pdiqClientConfig.balance + "\t\t" + totalProfitStr
                    );

                    // Modify direction (if necessary)
                    if (! gameWon && (3 == pdiqClientConfig.lossCounter || 5 == pdiqClientConfig.lossCounter)) {
                        pdiqClientConfig.direction = '>';
                        pdiqClientConfig.target = 100 - pdiqClientConfig.target;
                    } else {
                        pdiqClientConfig.direction = '<';
                        pdiqClientConfig.target = pdiqClientConfig.defaultTarget;
                    }
                } else {
                    console.log(pdiqClientConfig.gameNumber + '. - Something\'s wrong! Result: ' + result);
                }
                
                // Regenerate seed (if necessary)
                if (0 < pdiqClientConfig.gameNumber && 0 == pdiqClientConfig.gameNumber % pdiqClientConfig.regenerateSeedAt) {
                    request.post(self._getAPIURL('/seed'), {
                        json: true,
                        timeout: pdiqClientConfig.timeout,
                        form: {
                            seed: self._generateSeed()
                        }
                    }, function callback(err, httpResponse, result) {
                        if (err) {
                            console.log('Could not regenerate seed! Error: ' + err);
                        } else {
                            console.log('Regenerated seed!');
                        }
                        // Continue the loop
                        if (++pdiqClientConfig.gameNumber <= self.numberOfGames) {
                            setTimeout(function() {
                                self.run();
                            }, 50);
                        } else {
                            self.end();
                        }
                    });
                } else {
                    // Continue the loop
                    if (++pdiqClientConfig.gameNumber <= self.numberOfGames) {
                        setTimeout(function() {
                            self.run();
                        }, 50);
                    } else {
                        self.end();
                    }
                }
            }
        });
    },
    end: function() {
        console.log('The end!');
    },
    _getAPIURL: function(path) {
        return 'https://api.primedice.com/api' + path + '?access_token=' + this.accessToken;
    },
    _generateSeed: function() {
        var seed = '';
        var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        
        for (var i = 0; i < 30; i++) {
            seed += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        }

        return seed;
    }
}

// Go go go!
pdiqClient.init();
