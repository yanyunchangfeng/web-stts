import { SpeechError, SpeechResult } from 'src/shared';

class SpeechRecognizerService {
  recognition!: SpeechRecognition;
  language!: string;
  isListening = false;
  speechRecognizerAvailable: boolean = 'webkitSpeechRecognition' in window;

  initialize(language = 'zh-CN') {
    if (this.speechRecognizerAvailable) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.setLanguage(language);
      return true;
    }
    return false;
  }

  setLanguage(language = 'zh-CN') {
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

  // onEnd() {
  //   this.recognition.onend = () => {
  //     this.isListening = false;
  //   };
  // }

  stop() {
    this.recognition.stop();
  }
  async onResult(): Promise<SpeechResult> {
    return new Promise((res, rej) => {
      let interimContent = ''; // 临时识别结果
      let finalContent = ''; // 最终识别结果
      let confidenceSum = 0; // 累加信心值
      let finalCount = 0; // 最终结果计数
      let hasFinalResult = false; // 检查是否有最终结果

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          if (event.results[i].isFinal) {
            finalContent += transcript;
            confidenceSum += confidence;
            finalCount++; // 统计最终结果的次数
            hasFinalResult = true;
            console.log(finalContent, 'finalContent');
          } else {
            interimContent += transcript;
            confidenceSum += confidence;
            console.log(interimContent, 'interimContent');
          }
        }
      };
      this.recognition.onend = () => {
        this.isListening = false;
        if (hasFinalResult || interimContent) {
          // 计算平均 confidence
          const averageConfidence = finalCount > 0 ? confidenceSum / finalCount : confidenceSum;
          res({ interimContent, finalContent, confidence: averageConfidence });
        } else {
          res({ interimContent: '', finalContent: '', confidence: 0 });
        }
      };
    });
  }
  async onError(): Promise<SpeechError> {
    return new Promise((res) => {
      this.recognition.onerror = (event) => {
        const eventError: string = (event as any).error;
        let error: SpeechError;
        switch (eventError) {
          case 'no-speech':
            error = SpeechError.NoSpeech;
            break;
          case 'audio-capture':
            error = SpeechError.AudioCapture;
            break;
          case 'not-allowed':
            error = SpeechError.NotAllowed;
            break;
          case 'network':
            error = SpeechError.NetWork;
            break;
          case 'aborted':
            error = SpeechError.Aborted;
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
