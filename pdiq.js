var request = require('request');
var chalk = require('chalk');
var i = 0;
var defaultAmount = 10;
var amount = defaultAmount;
var oldAmount = amount;
var maxBalance = 0.00000000;
var balance = maxBalance;
var lossCounter = 0;
var direction = '<';
var target = 80;
var startingBalance = null;
//var divider = 950.0;      // 5 loss
//var divider = 5000.0;     // 6 loss
var divider = 27000.0;    // 7 loss
//var divider = 137000.0;     // 8 loss
function run() {
    request.post('https://api.primedice.com/api/bet?access_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NTMyNzYsInRva2VuIjoiODMzOWM4MDQzZGJhM2VlYjU5YWE5YjEwMmYyNzk1ZTYifQ.eHKHL2UZ7QTPjTXIrrEy2f6D0DgNvGXrGheHcTD5fWs', {
        json: true,
        form: {
            amount: amount,
            target: target,
            condition: direction
        },
        timeout: 5000
    }, function callback(err, httpResponse, body) {
        if (err) {
            console.log('Error:');
            console.log(err);
        }
        if (body && body.bet) {
            var win = body.bet.win;
            oldAmount = amount;
            if (win) {
                lossCounter = 0;
                direction = '<';
                if (balance > 0.00000000) {
                    amount = parseFloat(balance / divider).toFixed(2);
                } else {
                    amount = defaultAmount;
                }
            } else {
                lossCounter++;
                //if (++lossCounter <= 2) {
                    amount *= 5.25;
                //} else {
                //    amount = defaultAmount;
                //}
                /*
                if (lossCounter == 4) {
                    direction = '>';
                } else if (lossCounter == 6) {
                    direction = '<';
                }
                */
            }
            balance = body.user.balance;
            if (null === startingBalance) {
                startingBalance = balance;
            }
            if (maxBalance < body.user.balance) {
                maxBalance = body.user.balance;
            }
            if (win) {
                var winStr = chalk.green('[WIN]');
            } else {
                var winStr = chalk.red('[LOSS]');
            }
            var totalProfit = balance - startingBalance;
            var totalProfitPercentage = parseFloat((totalProfit / startingBalance) * 100).toFixed(2);
            if (totalProfit >= 0.0) {
                var totalProfitStr = chalk.green('Total profit: ' + parseFloat(totalProfit).toFixed(2) + "\t~ " + totalProfitPercentage + "%");
            } else {
                var totalProfitStr = chalk.red('Total loss: ' + parseFloat(totalProfit).toFixed(2) + "\t~ " + totalProfitPercentage + "%");
            }
            console.log(i + '. ' + winStr + "\t(" + body.bet.roll + ' ' + direction + ' ' + target + ")\tBet: " + parseFloat(oldAmount).toFixed(2) + "\t\tBalance: " + balance + "\t\t" + totalProfitStr);
        } else {
            console.log(i + ' - Something\'s wrong');
            console.log(body);
        }
        if (0 < i && i % 100 == 0) {
            console.log('---');
            console.log('Max balance: ' + maxBalance);
            console.log('---');
        }
        if (++i < 100000) {
            setTimeout(function() {
                run();
            }, 50);
        } else {
            console.log('Stopped');
        }
    });
}
run();
