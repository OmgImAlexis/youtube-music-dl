import { get } from 'lodash-es'
import utils from './utils'

const videoIds = {}
const videoInfos = {}
const videoStates = {}

const onPageChangedAddRules = () => {
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: {
            hostEquals: 'music.youtube.com'
          }
        })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }
  ])
}

const requestVideoInfo = async (videoId) => {
  if (videoInfos[videoId]) return await videoInfos[videoId]._promise
  videoInfos[videoId] = {
    _promise: utils.getVideoInfo(videoId)
  }
  videoInfos[videoId].result = await videoInfos[videoId]._promise
  chrome.runtime.sendMessage({
    action: 'videoInfosUpdated',
    videoInfos
  })
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, onPageChangedAddRules)
})

chrome.runtime.onMessage.addListener(async (message, sender) => {
  let state
  let videoId
  switch (message.action) {
    case 'newVideoId':
      console.log('new video id', message.videoId, 'from', sender.tab.id)
      videoIds[sender.tab.id] = message.value
      break
    case 'requestVideoInfo':
      console.log('request video info', message.videoId)
      await requestVideoInfo(message.videoId)
      break
    case 'downloadYTMusic':
      console.log('download video id', message.videoId, 'with itag', message.itag)
      await requestVideoInfo(message.videoId)
      utils.download(videoInfos[message.videoId].result.ytInfo, message.itag)
      break
    case 'newYtMusicAppState':
      state = JSON.parse(message.value)
      videoId = get(state, 'player.playerResponse.videoDetails.videoId')
      if (!videoId) return console.log('new yt music app state without videoId')
      console.log('new yt music app state for', videoId)
      if (!videoStates[sender.tab.id]) videoStates[sender.tab.id] = {}
      videoStates[sender.tab.id][videoId] = state
      chrome.runtime.sendMessage({
        action: 'videoStatesUpdated',
        videoStates
      })
      break
    default:
      console.log('new message', message)
  }
})

window.videoIds = videoIds
window.videoInfos = videoInfos
window.videoStates = videoStates
