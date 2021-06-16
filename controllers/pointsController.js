let transactions = new Array();
let pointsList = new Map();

exports.add_points = function(req, res) {
    let transaction = req.body;

    //Store the transaction
    transactions.push(transaction);

    let payer = transaction["payer"];
    let points = transaction["points"];

    //Update our running totals for each payer
    if (pointsList.has(payer)){
        if (pointsList.get(payer) - points <= 0) {
            pointsList.set(payer, 0);
        } else {
            pointsList.set(payer, pointsList.get(payer) + points);
        }
    } else {
        if (points <= 0) {
            pointsList.set(payer, 0);
        } else {
            pointsList.set(payer, points);
        }
    }

    console.log(pointsList);

    //Re-sort our array of transactions to keep it in ascending order
    //of transaction date (not received date). Not the most efficient,
    //but take advantage of the language where we can.
    transactions = transactions.sort((a,b) => 
        (Date.parse(a.timestamp) > Date.parse(b.timestamp)) ? 1 : -1);

    res.send(transactions);
};

exports.spend_points = function(req, res) {
    let pointsToSpend = req.body["points"];

    if (pointsToSpend <= 0) {
        res.send("Points to spend must be a positive number.");
    }

    let totalPointsAvailable = 0;
    pointsList.forEach(points => {
        totalPointsAvailable += points;
    });

    console.log(totalPointsAvailable);

    if (totalPointsAvailable < pointsToSpend) {
        res.send("Insufficient points balance. Points balance: " + totalPointsAvailable);
    }

    let pointsSpent = 0;
    let payers = new Map();

    for (let transaction of transactions) {
        //If we meet our points to spend, break loop
        if (pointsSpent === pointsToSpend) {
            break;
        }

        //Skip transactions that are for 0 points, if they exist
        if (transaction["points"] === 0) {
            continue;
        }

        let payer = transaction["payer"];

        //Skip payers who have no points available to spend
        if (pointsList.get(payer) === 0) {
            continue;
        }

        let points = transaction["points"];
        //Points spending logic
        if (pointsList.get(payer) - points >= 0) {
            //If we have points available from the current payer, use the value of the transaction
            if(pointsSpent + points > pointsToSpend) {
                //If this transaction puts us over the points we want to spend
                //update the transaction record and only use the neccessary points
                points = (pointsToSpend - pointsSpent);
                pointsSpent = pointsToSpend;
                transaction["points"] -= points;
            } else {
                //Otherwise, just use all points from this transaction and
                //remove it from the array
                //transactions.shift();
                transactions[transactions.indexOf(transaction)] = 
                    {"payer": payer, "points": 0, "timestamp": transaction["timestamp"]};
                pointsSpent += points;
            }

            payers.set(payer, 
                payers.has(payer) ? 
                ((payers.get(payer) * -1) + points) * -1 
                : points * -1);

            //Update running totals
            pointsList.set(payer, pointsList.get(payer) - points);
        } else {
            continue;
        }
    }

    res.json(JSON.stringify(Object.fromEntries(payers.entries())));
};

exports.get_points = function(req, res) {
    res.json(JSON.stringify(Object.fromEntries(pointsList.entries())));
};