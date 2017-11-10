const express = require('express');
const morgan = require('morgan');
const bodyParser = require("body-parser");
const mockData = require("./../data.json");
const fs = require("fs");

const app = express();

var start = new Date();

function validateKey(key){
    if(key == "todoItemId" || "name" || "priority" || "completed") {
        return true;
    }
    return false;
}

function writeAfterValidated(req, res, key){
    if (validateKey(key)) { // if validate
        for (let i = 0; i < mockData.length; i++){
            if (req.params.number == mockData[i].todoItemId){
                let key = Object.keys(req.body);
                mockData[i][key] = req.body[key];
                fs.writeFile("./data.json", JSON.stringify(mockData, null, 4), function(err){
                    if (err){
                        logger(req, res);
                        throw err;
                    }
                });
                
            }
        }
    } // end of if "validate"
};

function logger(req, res) {
        
    let agent = req.headers["user-agent"];
    let time = new Date().toISOString();
    let method = req.method;
    let resource = req.originalUrl;
    let version = "HTTP/" + req.httpVersion;
    let status = res.statusCode;
    let comma = ",";
    agent = agent.replace(/,/g, "");
    let log = agent;
    log += comma + time;
    log += comma + method;
    log += comma + resource;
    log += comma + version;
    log += comma + status;
    //console.log(log);
    
    fs.appendFile("./logs/logs_current.csv", "\n" + log, function(err, fd){
        if (err){
            throw (err);
        };
    }); // end of fs.appendFile

    fs.readFile("./logs/logs_current.csv", "utf8", function(err, data){
        if(err){
            throw err;
        }
        let lines = data.split("\n");

        if(lines.length > 20){
            let now = dateFormat(new Date(), "yyyy_mm_dd_HH_MM_ss");
            totalLogs.push(now);
            fs.copyFileSync("./logs/logs_current.csv", "./logs/logs_" + totalLogs[totalLogs.length-1] + ".csv");
            fs.writeFileSync("./logs/logs_current.csv", "Agent,Time,Method,Resource,Version,Status", "utf8");
            if (totalLogs.length >= 5) {
                let logToDelete = totalLogs.shift();
                console.log(logToDelete);
                fs.unlink("./logs/logs_" + logToDelete + ".csv", function(err){
                    if(err){
                        throw err;
                    }
                });
            }
        }
    }) // end of fs.readFile
}; // end of logger

app.use(bodyParser.json());


app.get("/", (req, res) => {
    let timeRun = (new Date() - start)/1000;
        res.status(200).send({
        status: "ok",
        "time running": timeRun.toString()
    })
});

app.get("/api/TodoItems", (req, res) => {
    res.status(200).send(mockData);
})

app.get("/api/TodoItems/:number", (req, res) => {
    for (let i = 0; i < mockData.length; i++){
        if (mockData[i].todoItemId == req.params.number){
            return res.status(200).send(mockData[i]);
        }
    }
    logger(req, res);
    res.sendStatus(404);
});

app.post("/api/TodoItems/", (req, res) => {

    for (let i = 0; i < mockData.length; i++){
        if (req.body.todoItemId == mockData[i].todoItemId){
            mockData[i] == req.body;
            fs.writeFile("./data.json", JSON.stringify(mockData, null, 4), function(err){
                if (err){
                    logger(req, res);
                    throw err;
                }
            });
             return res.status(201).json(req.body);
            //return console.log("if", mockData)
        }  
    }
    mockData.push(req.body);
            fs.writeFile("./data.json", JSON.stringify(mockData, null, 4), "utf8", function(err){
                if (err){
                    logger(req, res);
                    throw err;
                }
            });
        
    res.status(200).json(req.body);
});

app.delete("/api/TodoItems/:number", (req, res) => {
    for (let i = 0; i < mockData.length; i++){
        if (req.params.number == mockData[i].todoItemId){
            let deletedItem = mockData[i];
            mockData.splice(i, 1);
            fs.writeFile("./data.json", JSON.stringify(mockData, null, 4), "utf8", function(err){
                if (err){
                    logger(req, res);
                    throw err;
                }
            });
            return res.status(200).json(deletedItem);
        }
    }
    logger(req, res);
    res.sendStatus(404);
});

app.put("/api/TodoItems/:number", (req, res) => {
    if (req.params.number == req.body.todoItemId) {  
        for (let i = 0; i < mockData.length; i++){
            if (req.params.number == mockData[i].todoItemId){
                mockData[i] = req.body;
                fs.writeFile("./data.json", JSON.stringify(mockData, null, 4), function(err){
                    if (err){
                        logger(req, res);
                        throw err;
                    }
                });
                return res.status(201).json(req.body);
            }
        }
    }
    logger(req, res);
    res.sendStatus(503);
});

app.patch("/api/TodoItems/:number", (req, res) => {
    let reqKey = Object.keys(req.body);
    let counter = 0;
    if (reqKey.indexOf("todoItemId") > -1) {
        logger(req, res);
        return res.sendStatus(503);
    }
    for (let j = 0; j < reqKey.length; j++){ 
        let key = reqKey[j];
        if (validateKey(key)) {
            switch (key) { // switch
                case "name":
                    if (typeof req.body[key] === "string") {
                        writeAfterValidated(req, res, key);
                    };
                    counter++;
                    break;
                case "priority":
                    if(Number.isInteger(req.body[key])) {
                        writeAfterValidated(req, res, key);
                    };
                    counter++;
                    break;
                case "completed":
                    if(typeof req.body[key] === "boolean") {
                        writeAfterValidated(req, res, key);
                    };
                    counter++;
                    break;
            } // end of switch
        } // end of if
    }; // end of for loop
    if(counter > 0) {
        return res.status(201).json(req.body);
    };
    logger(req, res);
    res.sendStatus(404);
});

module.exports = app;
