console.log('version: v2.0');

// handle query parameters
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var twitchChannel = urlParams.get('twitchChannel');
var badges;
if (twitchChannel) {
    // create twitch chat badges object from twitchChannel name, if channel name is listed
    var badges = globalBadges;
    if (twitchChannel in customBadges) {
      badges.bits = customBadges[twitchChannel].bits;
      badges.subscriber = customBadges[twitchChannel].subscriber;
    };
};

var youtubeChannel = urlParams.get('youtubeChannel');
var youtubeChannelId = urlParams.get('youtubeChannelId');
var youtubeVideoId = urlParams.get('youtubeVideoId');
var youtubeChatId = urlParams.get('youtubeChatId');
var gapiKey = urlParams.get('gapiKey');
console.log('gapiKey = ',gapiKey);
if (gapiKey) {
    gapiKey = '&key=' + gapiKey;
    gapiURL = 'https://youtube.googleapis.com/youtube/v3/';
} else { // the keyless version currently appears to not be working
    gapiKey = ''
    gapiURL = 'https://yt.lemnoslife.com/noKey/';
}

/* //try implementing color options later
var youtubeModeratorColor = urlParams.get('youtubeModeratorColor') || '#5e84f1';
var youtubeOwnerColor = urlParams.get('youtubeOwnerColor') || '#ffca28';
var youtubeSponsorColor = urlParams.get('youtubeSponsorColor') || '#2ba640';
var youtubeVerifiedColor = urlParams.get('youtubeVerifiedColor') || #58acf2';
var youtubeDefaultColor = urlParams.get('youtubeDefaultColor') || '#b7b7b7';
*/

var youtubeRoleColors = {
  'chatModerator':'#5e84f1',
  'chatOwner':'#ffca28',
  'chatSponsor':'#2ba640',
  'verified':'#58acf2',
  'default':'#b7b7b7'
}

var youtubeChat = [];

async function getYoutubeChannelId() { // returns id of channel (quota: 100)
    if (!youtubeChannelId) {
        console.log('fetching youtubeChannelId...');
        const requestURL = `${gapiURL}search?part=snippet&q=${youtubeChannel}${gapiKey}&type=channel`
        console.log(requestURL);
        const response = await fetch(requestURL);
        console.log(response);
        const json = await response.json();
        console.log(json);
        youtubeChannelId = json.items[0].id.channelId;
    } else {console.log('getYoutubeChannelId call not made; channelId=', youtubeChannelId)};
    return youtubeChannelId;
}

async function getYoutubeLiveBroadcastId() { // returns videoId of current live broadcast (quota: 100)
  console.log('in getYoutubeLiveBroadcastId() ')
  if (!youtubeVideoId) {
      const response = await fetch(`${gapiURL}search?part=snippet&channelId=${youtubeChannelId}&order=date&type=video&eventType=live${gapiKey}`);
      const json = await response.json();
      console.log(json);
      youtubeVideoId = json.items[0].id.videoId;
  } else {console.log('getYoutubeLiveBroadcaseId call not made; videoId=', youtubeVideoId)};
  return youtubeVideoId;
}

async function getYoutubeLiveChatId() { //returns live chat ID (quota: 1)
    console.log(`in getYoutubeLiveChatId(); chatId = [${youtubeChatId}]`);
    if (!youtubeChatId) {
        const response = await fetch(`${gapiURL}videos?part=liveStreamingDetails,snippet&id=${youtubeVideoId}${gapiKey}`);
        const json = await response.json();
        youtubeChatId = await json.items[0].liveStreamingDetails.activeLiveChatId;
    } else {console.log('getYoutubeLiveChatId call not made; chatId=', youtubeChatId)};
    console.log(`activeLiveChatId: ${youtubeChatId}`);
    return youtubeChatId;
}

async function getYoutubeChat(pageToken='') { // returns page of chat (quota: ???)
    //console.log('line 51 pageToken=' + pageToken);
    if (pageToken) {
        pageToken = '&pageToken=' + pageToken;
    };
    const request = `${gapiURL}liveChat/messages?liveChatId=${youtubeChatId}&part=snippet,authorDetails${pageToken}${gapiKey}`
    const response = await fetch(request);
    const json = await response.json();
    const interval = json.pollingIntervalMillis;
    const nextPageToken = json.nextPageToken;
    //console.log('next page token', nextPageToken)
    const totalResults = json.pageInfo.totalResults;
    var incompleteMessageList = false;
    if (json.pageInfo.resultsPerPage < json.pageInfo.totalResults) {
        incompleteMessageList = true;
    };
    var messages = [];
    for (item of json.items) {
      var authorColor;
      if (item.authorDetails.isChatOwner) {
        authorColor = youtubeRoleColors.chatOwner;
      } else if (item.authorDetails.isChatModerator) {
        authorColor = youtubeRoleColors.chatModerator;
      } else if (item.authorDetails.isChatSponsor) {
        authorColor = youtubeRoleColors.chatSponsor;
      } else if (item.authorDetails.isVerified) {
        authorColor = youtubeRoleColors.verified;
      } else {authorColor = youtubeRoleColors.default};
      messages.push({
          "id": item.id,
          "userName": item.authorDetails.displayName,
          "content": item.snippet.displayMessage,
          "authorColor": authorColor,
          "details": item
      });
    };
    var messageResponse = {
        "incompleteMessageList": incompleteMessageList,
        "interval": interval,
        "nextPage": nextPageToken,
        "messages": messages,
        "totalResults": totalResults
    };
    return messageResponse;
}

async function newMessage(message) { // creates html element with message
    var newMessage = document.createElement('li');
    newMessage.setAttribute('id', message.id);
    var chatBox = document.querySelector("#chat>ul");
    var text = document.createElement("blockquote");

    var content = message.content;
    console.log(message.userName + ': ' + content)
    

    // sanitize html
    content = content.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    var contentCopy = content;
    
    for (const [key,value] of Object.entries(youtubeEmotes)) {
      content = content.split(key).join(`<img src=${value}>`);
      contentCopy = contentCopy.split(key).join(' ');
    };

    var isTokiPonaMessage = await isTokiPona(contentCopy);

    

    // split message into segments for different formatting, if message is in toki pona 
    if (isTokiPonaMessage[0] && contentCopy === contentCopy.toLowerCase()) {
        // this message is in toki pona, and has no proper nouns. 
        // therefore we can apply basic toki pona formatting
        console.log('toki pona w/o proper nouns');

        var span = document.createElement('span');
        span.className = 'tokipona';
        span.innerHTML = content;
        text.appendChild(span);
    } else if (isTokiPonaMessage[0]) {
        console.log('toki pona w/ proper nouns');
        // this message is in toki pona, and has proper nouns
        var uniqueNouns = [... new Set(isTokiPonaMessage[1])];
        var properNouns = [];
        for (word of uniqueNouns) {
            if (word !== word.toLowerCase()) {
            properNouns.push(word);
            }
        }
        for (word of properNouns) {
            content = content.split(word).join(`<span class="propernoun">${word}</span>`);
        }
        var span = document.createElement('span');
        span.className = 'tokipona';
        span.innerHTML = content;
        text.appendChild(span);
    } else {
        console.log('not toki pona');
        // message does not conform to toki pona standards set in isTokiPona()
        // apply no special toki pona formatting
        text.innerHTML = content;
    }

    //text.innerText = content;
    newMessage.innerHTML = `<span style="color:${message.authorColor}">${message.userName + ':'}</span>`;

    //newMessage.innerText = message.userName;
    newMessage.append(text);
    chatBox.append(newMessage);
}

async function pushYoutubeChat(messages) { // pushes each new message to chat list, calls newMessage
    //console.log(messages);
    for (const message of messages) {
        console.log('pushing message:', message.content)
        if (!youtubeChat.includes(message.id)) {
            youtubeChat.push(message.id);
            newMessage(message);
        };
    };
}

async function waitForYoutubeChatId() {
    if (!youtubeVideoId) {
      await getYoutubeChannelId(youtubeChannel);
    };
    console.log(`${youtubeChannel} channelId: ${youtubeChannelId}`);
    while (!youtubeVideoId) {
        console.log('trying to get live videoId...');
        await getYoutubeLiveBroadcastId();
        if (!youtubeVideoId) {await new Promise(r => setTimeout(r, 5000))};
    };
    console.log(`live videoId acquired: ${youtubeVideoId}`);
    console.log(`chatId: ${youtubeChatId}`);
    await getYoutubeLiveChatId();
    console.log(`chatId: ${youtubeChatId}`);
    return youtubeChatId;
}

async function youtubeChatListener() {
    //var response = await getChat(chatId);
    console.log('starting youtubeChatListener. chatId=', youtubeChatId);
    var interval = 0;
    var pageToken = '';
    //console.log('line132 pageToken=', pageToken)
    i = 1;
    j = 0;
    var ignoreList = [];
    while (i) {
        console.log(`listener loop# ${i}; pollingIntervalMillis: ${interval}; seconds: ${interval/1000}; pageToken: ${pageToken}`)
        await new Promise(r => setTimeout(r, interval));
        response = await getYoutubeChat(pageToken);
        //console.log(response);
        pushYoutubeChat(response.messages);
        interval = response.interval;
        pageToken = response.nextPage;
        for (message of response.messages) {
          if (message.content.includes('!clear') && !ignoreList.includes(message.id)) {
            pageToken = '';
            ignoreList.push(message.id);
          }
        }
        if (pageToken === '' && j > 0) {
          //console.log('pageToken ',pageToken, 'response',response,'youtubeChat',youtubeChat)
          var tempYoutubeChat = [];
          for (message of response.messages) {
            tempYoutubeChat.push(message.id);
          }
          //console.log('ytchat',youtubeChat,'tempytchat',tempYoutubeChat)
          for (id of youtubeChat) {
            //console.log(id);
            if (!tempYoutubeChat.includes(id)) {
              var deletedMessage = document.getElementById(id);
              console.log('deleted message',id,deletedMessage.innerHTML);
              deletedMessage.remove()
            };
          };
          youtubeChat = tempYoutubeChat;
          j = 0;
        };
        i++;
        j++;
    }
}

async function youtubeInit() {
    if (!youtubeChatId) {
        await waitForYoutubeChatId();
        console.log('chatId=',youtubeChatId);
    };
    await youtubeChatListener();
};

if (youtubeChannel || youtubeChannelId || youtubeVideoId || youtubeChatId) {
    youtubeInit();
};

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
  //console.log('isTokiPonaMessage: ' + isTokiPonaMessage[0])
  
  // split message into segments for different formatting, if message is in toki pona 
  if (isTokiPonaMessage[0] && messageCopy === messageCopy.toLowerCase()) {
      // this message is in toki pona, and has no proper nouns. 
      // therefore we can apply basic toki pona formatting
      var span = document.createElement('span');
      span.className = 'tokipona';
      span.innerHTML = message;
      text.appendChild(span);
  } else if (isTokiPonaMessage[0]) {
    // this message is in toki pona, and has proper nouns
    var uniqueNouns = [... new Set(isTokiPonaMessage[1])];
    var properNouns = [];
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
    text.innerHTML = message;
  }

  var userBadges = '';
  for (badge in extra['userBadges']) {
    //console.log('badge: ', badge);
    if (badge in badges) {
      //console.log('badge in global var badges. ');
      var badgeID = extra['userBadges'][badge];
      //console.log('badgeID: ', badgeID);
      if (badgeID in badges[badge]) {
        //console.log('badgeID in global var badges[badge]');
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

if (twitchChannel) {
    ComfyJS.Init(twitchChannel)
}

// references:
//https://gist.github.com/w3cj/4f1fa02b26303ae1e0b1660f2349e705

//https://yt.lemnoslife.com/ (keyless api)