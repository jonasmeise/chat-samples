/*
Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/apache2.0/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
    
    This file is what connects to chat and parses messages as they come along. The chat client connects via a 
    Web Socket to Twitch chat. The important part events are onopen and onmessage.
*/

var updatecounter=0;
var commandString = '!request';
var modrequest = false;
var modrequestString  = '!modreq';
var getString = '!get';
var skipString = '!skip';
var modString = '!okay';
var helpString = '!help';
var reqArray = new Array();
var currentReader = 0;
var endReader = 0;
var myWebSocket;
var mods = ["luxu5", "alkhalim", "luxu5requestbot"];

var chatClient = function chatClient(options){
    this.username = options.username;
    this.password = options.password;
    this.channel = options.channel;

    this.server = 'irc-ws.chat.twitch.tv';
    this.port = 443;
}

chatClient.prototype.open = function open(){
    console.log(this.username + "/Bot gestartet fuer #" + document.getElementById("channel").value);
    this.webSocket = new WebSocket('wss://' + this.server + ':' + this.port + '/', 'irc');
    myWebSocket = this.webSocket;

    this.webSocket.onmessage = this.onMessage.bind(this);
    this.webSocket.onerror = this.onError.bind(this);
    this.webSocket.onclose = this.onClose.bind(this);
    this.webSocket.onopen = this.onOpen.bind(this);
};

chatClient.prototype.onError = function onError(message){
    console.log('Error: ' + message);
};

/* This is an example of a leaderboard scoring system. When someone sends a message to chat, we store 
   that value in local storage. It will show up when you click Populate Leaderboard in the UI. 
*/
chatClient.prototype.onMessage = function onMessage(message){

    var parsed = this.parseMessage(message.data);

    if(parsed !== null){

        /*console.log(parsed.message);
        userPoints = localStorage.getItem(parsed.username);

        if(userPoints === null){
            localStorage.setItem(parsed.username, 10);
        }
        else {
                localStorage.setItem(parsed.username, parseFloat(userPoints) + 0.25);
        }*/

        //PING CHECK
        var original = parsed.original;

        if(original === 'PING :tmi.twitch.tv\r\n'){
            console.log("Bot wurde gepingt. Pong back")
            //PONG BACK
            this.webSocket.send('PONG :tmi.twitch.tv\r\n');
        }

        if(parsed.command === 'PRIVMSG')
        {
            var msg = parsed.message;
            console.log(msg);

            if(msg.localeCompare(commandString + '\r\n') === 0)
            {
                send('Type "!request [link]" to request sheet music for me to play! Your song will be added to the queue this way.');
                console.log("??");
            }
            else if(msg.startsWith(commandString)){
                var link = msg.split(" ")[1].slice(0, -1);

                var newID = randomID();
                var output = link + ';' + parsed.username + ';' + newID + ';' + settingModrequest();

                reqArray[endReader] = output;
                endReader++;

                if(modrequest){
                    send('Request added! Mods need to confirm your song with "' + modString + ' ' + newID + '".');
                }
                else
                {
                    send('Request successfully added!');
                }

                console.log(output + ' zu Liste hinzugefügt.');
            }
            else if(msg.startsWith(modrequestString)){
                if(hasRights(parsed.username)){
                    modrequest = !modrequest;

                    send('Mod confirmation for song requests: ' + modrequest);
                }
            }
            else if(msg.startsWith(getString)){
                if(hasRights(parsed.username)){
		    if(reqArray.length <= currentReader){
			send('No songs in queue at the moment :(');
	 	    }

                    var nextsong = reqArray[currentReader].split(';');

                    if(nextsong[3].startsWith('1')){
                        currentReader++;
                        send('Next song: "' + nextsong[0] + '" requested by ' + nextsong[1]);
                    }
                    else
                    {
                        send('The song "' + nextsong[0] + '" requested by ' + nextsong[1] + '(' + nextsong[2] + ') is still awaiting moderation!');
                    }
                }
            }
            else if(msg.startsWith(skipString)){
                if(hasRights(parsed.username)){
                    currentReader++;

                    send('Skipped the next song!');
                }
            }
            else if(msg.startsWith(modString)){
                if(hasRights(parsed.username))
                {
                    var number = msg.split(" ")[1].slice(0, -2);
	            var counter = 0;

                    for (let entry of reqArray)
                    {
                        var splitty = entry.split(';')[2];

                        if(splitty.localeCompare(number) === 0)
                        {
                            reqArray[counter] = entry.slice(0, -1) + '1';
                            console.log(reqArray[counter]);
                            console.log('Eintrag #' + number + ' erfolgreich bestaetigt.');
			    send('Request #' + number + ' confirmed!');
                        }
                        counter++;
                    }
                }
            }
            else if(msg.startsWith(helpString)){
                send("Commands: !request, !help . Mod commands: !get, !okay, !skip, !modreq");
            }
        }
    }
};

function hasRights(username){
    for (let name of mods)
    {
        if(username.localeCompare(name) === 0)
        {
            return true;
        }
    }

    return false;
}

function settingModrequest(){
    if(modrequest){
        return 0;
    }
    else
    {
        return 1;
    }
}

function randomID() {
    var a = [], i = ('a').charCodeAt(0), j = ('z').charCodeAt(0), end = '';

        for (y=i; y <= j; ++y) {
            a.push(String.fromCharCode(y));
        }

    for (x=0;x<5;x++)
    {
        end = end + a[Math.round(Math.random()*25)];
    }

    return end;

}

function send(message){
    if (myWebSocket !== null && myWebSocket.readyState === 1) {
            console.log('Sending ' + message);

            myWebSocket.send('PRIVMSG #' + document.getElementById("channel").value + ' :' + message);
    }
}

chatClient.prototype.onOpen = function onOpen(){
    var socket = this.webSocket;

    if (socket !== null && socket.readyState === 1) {
        console.log('Connecting and authenticating...');

        socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
        socket.send('PASS ' + this.password);
        socket.send('NICK ' + this.username);
        socket.send('JOIN #' + document.getElementById("channel").value);
    }
};

chatClient.prototype.onClose = function onClose(){
    console.log('Disconnected from the chat server.');
};

chatClient.prototype.close = function close(){
    if(this.webSocket){
        this.webSocket.close();
    }
};

/* This is an example of an IRC message with tags. I split it across 
multiple lines for readability. The spaces at the beginning of each line are 
intentional to show where each set of information is parsed. */

//@badges=global_mod/1,turbo/1;color=#0D4200;display-name=TWITCH_UserNaME;emotes=25:0-4,12-16/1902:6-10;mod=0;room-id=1337;subscriber=0;turbo=1;user-id=1337;user-type=global_mod
// :twitch_username!twitch_username@twitch_username.tmi.twitch.tv 
// PRIVMSG 
// #channel
// :Kappa Keepo Kappa

chatClient.prototype.parseMessage = function parseMessage(rawMessage) {
    var parsedMessage = {
        message: null,
        tags: null,
        command: null,
        original: rawMessage,
        channel: null,
        username: null
    };

    if(rawMessage[0] === '@'){
        var tagIndex = rawMessage.indexOf(' '),
        userIndex = rawMessage.indexOf(' ', tagIndex + 1),
        commandIndex = rawMessage.indexOf(' ', userIndex + 1),
        channelIndex = rawMessage.indexOf(' ', commandIndex + 1),
        messageIndex = rawMessage.indexOf(':', channelIndex + 1);

        parsedMessage.tags = rawMessage.slice(0, tagIndex);
        parsedMessage.username = rawMessage.slice(tagIndex + 2, rawMessage.indexOf('!'));
        parsedMessage.command = rawMessage.slice(userIndex + 1, commandIndex);
        parsedMessage.channel = rawMessage.slice(commandIndex + 1, channelIndex);
        parsedMessage.message = rawMessage.slice(messageIndex + 1);
    }

    /*if(parsedMessage.command !== 'PRIVMSG'){
        parsedMessage = null;
    }*/

    return parsedMessage;
}
