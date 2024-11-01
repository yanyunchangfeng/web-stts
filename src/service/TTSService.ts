import { TTSData, AudioType, TTSAtobMode, CombTTSExecStrategy } from 'src/shared';
import { Base64 } from 'js-base64';
import { voiceFusionRequestService, SpeechSynthesizerService } from 'src/service';

class TTSService {
  speechSynthesizerService!: SpeechSynthesizerService;
  currentAudio?: HTMLAudioElement; // 当前播放的音频
  async tts(params: TTSData, ttsAtobMode: TTSAtobMode = TTSAtobMode.JSBASE64) {
    this.stopAudio();
    const audioBase64Str = await voiceFusionRequestService.tts(params);
    const audioBlob = this.atobBase64ToBlob(audioBase64Str, ttsAtobMode); // js-base64
    await this.playAudio(audioBlob);
  }
  async speak(params: TTSData) {
    if (!this.speechSynthesizerService) {
      this.speechSynthesizerService = new SpeechSynthesizerService();
    }
    return await this.speechSynthesizerService.speak(params.text, params.lang);
  }
  async combineTTS(params: TTSData, combTtsExecStr: `${CombTTSExecStrategy}` = CombTTSExecStrategy.BROWSER) {
    const cacheAudioBase64Str = params.audioBase64;
    let result;
    if (combTtsExecStr === CombTTSExecStrategy.BROWSER) {
      result = await this.speak(params);
      if (!result) return;
      if (cacheAudioBase64Str) return await this.cacheBase64ToAudio(cacheAudioBase64Str);
      return await this.tts(params);
    }
    // try {
    if (cacheAudioBase64Str) return await this.cacheBase64ToAudio(cacheAudioBase64Str);
    result = await this.speak(params); // 在这里执行在ios chrome上可以播放
    if (!result) return;
    await this.tts(params);
    // } catch (e) {
    //   // this.speak(params); // 在这里执行在ios chrome上无法播放
    // }
  }
  async cacheBase64ToAudio(base64Str: string) {
    this.stopAudio();
    const audioBlob = this.atobBase64ToBlob(base64Str, TTSAtobMode.WINDOW);
    await this.playAudio(audioBlob);
  }
  jsBase64AtobStr(base64Str: string) {
    return Base64.atob(base64Str);
  }
  windowAtobBase64Str(base64Str: string) {
    return window.atob(base64Str);
  }
  atobBase64ToBlob(base64Str: string, ttsAtobMode: TTSAtobMode) {
    base64Str = this.base64StrReplace(base64Str);
    let binaryString = '';
    if (ttsAtobMode === TTSAtobMode.JSBASE64) {
      binaryString = this.jsBase64AtobStr(base64Str);
    } else {
      binaryString = this.windowAtobBase64Str(base64Str);
    }
    const unit8Array = this.binaryStrToUint8Array(binaryString);
    return this.uint8ArrayToBlob(unit8Array);
  }
  base64StrReplace(base64Str: string) {
    // 去掉前缀b'和后缀' 不然会报错
    return base64Str.replace(/^b'/, '').replace(/'$/, '');
  }
  binaryStrToUint8Array(binaryString: string) {
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  uint8ArrayToBlob(uint8Array: Uint8Array, mimeType: AudioType = AudioType.WAV) {
    return new Blob([uint8Array], { type: mimeType });
  }
  async playAudio(audioBlob: Blob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    this.currentAudio = audio;
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        this.currentAudio = undefined;
      };
      const onEnded = () => {
        cleanup();
        resolve(0);
      };
      const onError = (error: any) => {
        cleanup();
        console.error('音频播放失败:', error);
        reject(error);
      };
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      audio.play().catch((error) => {
        cleanup();
        console.error('音频播放失败:', error);
        reject(error);
      });
    });
  }
  // 新增方法用于取消播放
  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause(); // 暂停音频播放
      this.currentAudio.currentTime = 0; // 重置播放时间
      this.currentAudio = undefined; // 清空当前音频
    }
  }
}

export const ttsService = new TTSService();
