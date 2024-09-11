// from m4ym4y https://gist.github.com/m4ym4y/7f2c3efd70115b149a72abec0f0f037e#file-is-toki-pona-js
let tokiPonaDictionary
let tokiPonaDictionaryPromise
const tokiPonaDictionaryURL = 'https://raw.githubusercontent.com/lipu-linku/jasima/main/data.json'
const nonLetterRegexp = new RegExp(/[^A-Za-z]/g)
const forbiddenSequenceRegexp = new RegExp(/([jklmpstw][jklmnpstw]|nn|[aeiou][aeiou]|wu|wo|ji|ti|[^aeioujklmnpstw]|[^aeioun]$)/i)

async function fetchTokiPonaDictionary () {
  const res = await fetch(tokiPonaDictionaryURL)

  if (!res.ok) {
    throw new Error('could not fetch toki pona dictionary')
  }

  const json = await res.json()

  if (!json || !json.data) {
    throw new Error('toki pona dictionary returned empty response: ' + JSON.stringify(json))
  }

  return json.data
}

async function isTokiPona(message) {
  if (!tokiPonaDictionary) {
    tokiPonaDictionaryPromise = fetchTokiPonaDictionary()
    tokiPonaDictionary = await tokiPonaDictionaryPromise
  } else if (tokiPonaDictionaryPromise) {
    tokiPonaDictionary = await tokiPonaDictionaryPromise
  }

  // remove punctation
  const messageNoPunctuation = message.replace(nonLetterRegexp, ' ')
  const words = messageNoPunctuation.split(/\s+/).filter((element) => { return element !== "" })

  //console.log('list of words:', words)

  let tokiPonaWordCount = 0
  let properNounCount = 0

  for (const word of words) {
    if (tokiPonaDictionary[word]) {
      tokiPonaWordCount++
      continue
    }

    if (word.charAt(0) === word.charAt(0).toLowerCase()) {
      //console.log('found non-capitalized proper noun: ', word)
      return false
    }

    if (word.substring(1) !== word.substring(1).toLowerCase()) {
      //console.log('found capitalized noun after first letter: ', word)
      return false
    }

    if (word.match(forbiddenSequenceRegexp)) {
      //console.log('word contains forbidden sequence: ', word)
      return false
    }

    properNounCount++
  }

  //console.log(`toki pona words: ${tokiPonaWordCount}, proper nouns: ${properNounCount}`)
  return [tokiPonaWordCount >= properNounCount, words] 
  //turned return statement into a list, since it turns out we seem to need both the boolean and the list of words
}

window.addEventListener('load', async () => {
  tokiPonaDictionaryPromise = fetchTokiPonaDictionary()
  tokiPonaDictionary = await tokiPonaDictionaryPromise 
})