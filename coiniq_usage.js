// TODO: import pdiqclient library here

// initialize a new CoinIQ client
var coinIQ = new CoinIQ({
    platform: 'primedice.com',
    username: '<username>',
    password: '<password>',
    numberOfGames: '<number_of_games>',
    regenerateSeedInitially: true,
    algorithm: 'greedy'
});

// run the client using the greedy algorithms
coinIQ.run();

// pause the client
coinIQ.pause();

// stop the client
coinIQ.stop();

// restart the client
coinIQ.restart();
