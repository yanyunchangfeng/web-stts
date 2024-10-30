import { SpeakResult } from 'src/shared';
import { sleep } from 'src/utils';

export class SpeechSynthesizerService {
  speechSynthesizer!: SpeechSynthesisUtterance;
  speechSynthesizerAvailable: boolean = 'speechSynthesis' in window;
  voices: SpeechSynthesisVoice[] = [];
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
      if (speechSynthesis.speaking) {
        this.cancel();
        await sleep(100);
      }
      this.speechSynthesizer.lang = language;
      this.speechSynthesizer.text = message;
      if (!this.voices.length) {
        this.getVoices();
      }
      const voice = this.voices.find((voice) => voice.lang === language);
      this.speechSynthesizer.voice = voice || this.voices[0];
      return new Promise((resolve, reject) => {
        // 播放结束时触发 resolve
        this.speechSynthesizer.addEventListener('end', () => resolve());
        // 播放出现错误时触发 reject
        this.speechSynthesizer.addEventListener('error', (error) => reject(error));
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
    if (this.speechSynthesizerAvailable) {
      speechSynthesis.cancel(); // 停止所有正在播放的语音
    }
  }
}
export const speechSynthesizerService = new SpeechSynthesizerService();
