import { SpeakResult } from "src/shared";

export class SpeechSynthesizerService {
  speechSynthesizer!: SpeechSynthesisUtterance;
  speechSynthesizerAvailable: boolean = "speechSynthesis" in window;
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
    console.error("浏览器不支持 Web Speech API");
  }
  speak(message: string, language: string = "zh-CN"): SpeakResult {
    if (this.speechSynthesizerAvailable) {
      this.speechSynthesizer.lang = language;
      this.speechSynthesizer.text = message;
      if (!this.voices.length) {
        this.getVoices();
      }
      this.speechSynthesizer.voice =
        this.voices.find((voice) => voice.lang === language) || this.voices[0];
      speechSynthesis.speak(this.speechSynthesizer);
      return;
    }
    return {
      code: 503,
      message: "浏览器不支持 Web Speech API",
    };
  }
  getVoices() {
    if (this.speechSynthesizerAvailable) {
      this.voices = window.speechSynthesis.getVoices();
      return this.voices;
    }
    console.error("浏览器不支持 Web Speech API");
  }
}
export const speechSynthesizerService = new SpeechSynthesizerService();
