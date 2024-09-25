export enum TTSVoice {
  man = 'man',
  woman = 'woman'
}

export enum TTSAtobMode {
  WINDOW = 'window.atob',
  JSBASE64 = 'jsbase64.atob'
}

export enum SpeechError {
  NoSpeech = 'no-speech',
  AudioCapture = 'audio-capture',
  NotAllowed = 'not-allowed',
  NetWork = 'network',
  Abort = 'abort',
  Unknown = 'unknown'
}

export enum CombTTSExecStrategy {
  BROWSER = 'BROWSER',
  TTS = 'TTS'
}