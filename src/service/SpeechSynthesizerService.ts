import { SpeakResult } from 'src/shared';
import { sleep } from 'src/utils';

export class SpeechSynthesizerService {
  speechSynthesizer!: SpeechSynthesisUtterance;
  speechSynthesizerAvailable: boolean = 'speechSynthesis' in window;
  voices: SpeechSynthesisVoice[] = [];
  abortController: AbortController = new AbortController();
  constructor() {
    this.initSynthesis();
  }
  initSynthesis() {
    if (this.speechSynthesizerAvailable) {
      this.speechSynthesizer = new SpeechSynthesisUtterance();
      this.speechSynthesizer.volume = 1; // 设置音量
      this.speechSynthesizer.rate = 1; // 设置语速
      this.speechSynthesizer.pitch = 0.2; // 设置音高
      this.getVoices();
      return;
    }
    return {
      code: 503,
      message: '浏览器不支持 Web Speech API'
    };
  }
  async speak(message: string, language: string = 'zh-CN'): Promise<SpeakResult> {
    if (this.speechSynthesizerAvailable) {
      this.abortController.abort();
      this.abortController = new AbortController();
      this.cancel();
      await sleep(100);
      return new Promise(async (resolve, reject) => {
        this.speechSynthesizer.lang = language;
        this.speechSynthesizer.text = message;
        if (!this.voices.length) {
          this.getVoices();
        }
        const voice = this.voices.find((voice) => voice.lang === language);
        this.speechSynthesizer.voice = voice || this.voices[0];
        const cleanup = () => {
          this.speechSynthesizer.removeEventListener('end', onEnd);
          this.speechSynthesizer.removeEventListener('error', onError);
          this.speechSynthesizer.removeEventListener('boundary', onBoundary);
        };
        const onEnd = () => {
          cleanup();
          resolve();
        };
        const onBoundary = () => {
          if (this.abortController.signal.aborted) {
            this.cancel(); // 立即停止播放
            cleanup();
            reject(new Error('音频播放已中止'));
          }
        };
        const onError = (error: any) => {
          cleanup();
          reject(error);
        };
        this.speechSynthesizer.addEventListener('end', onEnd);
        this.speechSynthesizer.addEventListener('boundary', onBoundary);
        this.speechSynthesizer.addEventListener('error', onError);
        speechSynthesis.speak(this.speechSynthesizer);
      });
    }
    return {
      code: 503,
      message: '浏览器不支持 Web Speech API'
    };
  }
  getVoices() {
    if (this.speechSynthesizerAvailable) {
      this.voices = window.speechSynthesis.getVoices();
      return this.voices;
    }
    return {
      code: 503,
      message: '浏览器不支持 Web Speech API'
    };
  }
  cancel() {
    if (this.speechSynthesizerAvailable && this.speechSynthesizer) {
      speechSynthesis.cancel(); // 停止所有正在播放的语音
    }
  }
  abortSpeak() {
    this.abortController.abort();
  }
}
export const speechSynthesizerService = new SpeechSynthesizerService();
