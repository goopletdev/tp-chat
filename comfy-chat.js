var badges = { //badges require OAUTH. for now, i'm hard-coding in a list of global badges
  "broadcaster": {
    "1": "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1"
  },
  "moderator": {
    "1": 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1'
  },
  "vip": {
    "1": 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/1'
  },
  "subscriber": { //custom sub badges
    "0": "",
    "2": "",
    "3": "",
    "6": "",
    "9": "",
    "12": "",
    "2000": "",
    "2002": "",
    "2003": "",
    "2006": "",
    "2009": "",
    "2012": "",
    "3000": "",
    "3002": "",
    "3003": "",
    "3006": "",
    "3009": "",
    "3012": ""
  },
  "bits": { //custom bit badges
    "100": "",
    "1000": "",
    "5000": "",
    "10000": "",
    "25000": ""
  }
}

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const channel = urlParams.get('channel');

ComfyJS.onChat = async (user, message, flags, self, extra) => {
  var newMessage = document.createElement('li');
  newMessage.setAttribute('id', extra.id);
  var chat = document.querySelector("#chat>ul");
  var text = document.createElement("blockquote");

  // check if message has emotes
  // define copy of message to run isTokiPona check
  var messageCopy = message;

  // define list for storing emotes to be replaced
  const stringReplacements = [];

  if (extra.messageEmotes) {
    // strip emotes from messageCopy for use in isTokiPona check
    // also store emotes in stringReplacements list
    for (emote in extra.messageEmotes){
      for (indexes of extra.messageEmotes[emote]) {
        var fromTo = indexes.split('-');
        var fromInt = parseInt(fromTo[0]);
        var toInt = parseInt(fromTo[1]);
        var emoteString = message.substring(fromInt, toInt + 1);
        messageCopy = messageCopy.substring(0, fromInt) + ' '.repeat(toInt - fromInt + 1) + messageCopy.substring(toInt + 1);
      };
      stringReplacements.push({
        stringToReplace: emoteString,
        replacement: `<img src="https://static-cdn.jtvnw.net/emoticons/v2/${emote}/default/dark/1.0">`,
      });
    };
  };

  // sanitize html
  message = message.replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // replace emotes in original message with html
  message = stringReplacements.reduce(
    (acc, { stringToReplace, replacement }) => {
      return acc.split(stringToReplace).join(replacement);
    },
    message
  );
  
  // check if message is toki pona using messageCopy
  var isTokiPonaMessage = await isTokiPona(messageCopy);
  console.log('isTokiPonaMessage: ' + isTokiPonaMessage[0])
  
  // split message into segments for different formatting, if message is in toki pona 
  if (isTokiPonaMessage[0] && messageCopy === messageCopy.toLowerCase()) {
      // this message is in toki pona, and has no proper nouns. 
      // therefore we can apply basic toki pona formatting
      var span = document.createElement('span');
      span.className = 'tokipona';
      span.innerHTML = message;
      text.appendChild(span);
  } else if (isTokiPonaMessage[0]) {
    // < this segment of code is new; ends with a comment with 
    // closing < bracket. replaces the code that follows 
    // that will be commented out.
    var uniqueNouns = [... new Set(isTokiPonaMessage[1])];
    var properNouns = []
    for (word of uniqueNouns) {
      if (word !== word.toLowerCase()) {
        properNouns.push(word);
      }
    }
    for (word of properNouns) {
      message = message.split(word).join(`<span class="propernoun">${word}</span>`);
    }
    var span = document.createElement('span');
    span.className = 'tokipona';
    span.innerHTML = message;
    text.appendChild(span);
  } else {
    // message does not conform to toki pona standards set in isTokiPona()
    // apply no special toki pona formatting
    if (user === 'BattsGo') {
      text.className = 'batts';
    }
    text.innerHTML = message;
  }

  var userBadges = '';
  for (badge in extra['userBadges']) {
    if (badge in badges) {
      var badgeID = extra['userBadges'][badge];
      if (badgeID in badges[badge]) {
        userBadges += `<img src="${badges[badge][badgeID]}">`;   
      }
    }
  }

  newMessage.innerHTML = `<span style="color:${extra.userColor}">${userBadges + user + ':'}</span>`;
  newMessage.append(text);
  chat.append(newMessage);
}

//this is silly, but i've repurposed the above code here just to get commands to display in chat
ComfyJS.onCommand = async (user, message, flags, self, extra) => {
  var newMessage = document.createElement('li');
  newMessage.setAttribute('id', extra.id);
  var chat = document.querySelector("#chat>ul");
  var text = document.createElement("blockquote");
  message = '!' + message + ' ' + flags;
  
  // sanitize html
  message = message.replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  text.innerText = message;

  var userBadges = '';
  for (badge in extra['userBadges']) {
    if (badge in badges) {
      var badgeID = extra['userBadges'][badge];
      if (badgeID in badges[badge]) {
        userBadges += `<img src="${badges[badge][badgeID]}">`;   
      }
    }
  }

  newMessage.innerHTML = `<span style="color:${extra.userColor}">${userBadges + user + ':'}</span>`;
  newMessage.append(text);
  chat.append(newMessage);
}

ComfyJS.onMessageDeleted = async (id, extra) => {
  var deletedMessage = document.getElementById(id);
  deletedMessage.remove()
}

ComfyJS.Init(channel)