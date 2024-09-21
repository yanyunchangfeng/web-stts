import { SpeechError, SpeechResult } from "src/shared";

class SpeechRecognizerService {
  recognition!: SpeechRecognition;
  language!: string;
  isListening = false;
  speechRecognizerAvailable: boolean = "webkitSpeechRecognition" in window;

  initialize(language = "zh-CN") {
    if (this.speechRecognizerAvailable) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.setLanguage(language);
      return true;
    }
    return false;
  }

  setLanguage(language = "zh-CN") {
    this.language = language;
    this.recognition.lang = language;
  }

  start() {
    if (!this.recognition) {
      return;
    }

    this.recognition.start();
    this.isListening = true;
  }
  onEnd() {
    this.recognition.onend = () => {
      this.isListening = false;
    };
  }
  stop() {
    this.recognition.stop();
  }
  async onResult(): Promise<SpeechResult> {
    return new Promise((res) => {
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimContent = ""; // 临时识别结果
        let finalContent = ""; // 最终识别结果
        let confidence = 0; // 识别准确率
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalContent += event.results[i][0].transcript;
            confidence += event.results[i][0].confidence;
            console.log(finalContent, "finalContent");
            console.log(confidence, "confidence");
          } else {
            interimContent += event.results[i][0].transcript;
            confidence += event.results[i][0].confidence;
            console.log(interimContent, "interimContent");
            console.log(confidence, "confidence");
          }
        }
        res({ interimContent, finalContent, confidence });
      };
    });
  }
  async onError() {
    return new Promise((res) => {
      this.recognition.onerror = (event) => {
        const eventError: string = (event as any).error;
        console.log("error", eventError);
        let error: SpeechError;
        switch (eventError) {
          case "no-speech":
            error = SpeechError.NoSpeech;
            break;
          case "audio-capture":
            error = SpeechError.AudioCapture;
            break;
          case "not-allowed":
            error = SpeechError.NotAllowed;
            break;
          default:
            error = SpeechError.Unknown;
            break;
        }
        res(error);
      };
    });
  }
}

export const speechRecognizerService = new SpeechRecognizerService();
