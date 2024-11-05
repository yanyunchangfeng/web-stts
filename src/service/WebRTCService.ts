import { webmToWavConverterService } from 'src/service';
import { SpeechError } from 'src/shared';

class WebRTCService {
  private mediaRecorder!: MediaRecorder;
  private audioChunks: Blob[] = [];
  isListening = false;
  private stream!: MediaStream;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isCheckingAudio = false;
  private audioTracks: MediaStreamTrack[] = [];
  private isNoSpeech = false;
  abortController = new AbortController();
  private isMuted = false;
  private defaultStartOptions = {
    threshold: 22,
    updateInterval: 200,
    maxSilenceDuration: 3000,
    noSpeechIsError: false
  };
  private defaultMuteMessage = '录音服务未启用';
  async init(deviceId?: string) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId }
      });
    } catch (error) {
      console.error('Failed to initialize media stream:', error);
      throw error;
    }
  }

  async start(options: Partial<typeof this.defaultStartOptions> = {}) {
    try {
      Object.assign(this.defaultStartOptions, options);
      this.abortController.abort();
      this.abortController = new AbortController();
      this.abortController.signal.addEventListener('abort', this.onAbort);
      const deviceId = await this.getDefaultAudioDeviceId();
      await this.init(deviceId);
      if (!this.stream) return false;
      this.setupMediaRecorder();
      this.enAbledAudioTracks();
      this.mediaRecorder.start();
      this.isListening = true;
      this.isNoSpeech = false;
      this.isMuted = false;
      this.checkVoice(
        this.defaultStartOptions.threshold,
        this.defaultStartOptions.updateInterval,
        this.defaultStartOptions.maxSilenceDuration
      );
      return true;
    } catch (error) {
      this.handleError('Failed to start media recording', error);
      return false;
    }
  }
  private onAbort = () => {
    this.abortController.signal.removeEventListener('abort', this.onAbort);
    this.stop(); // 停止录音
  };
  getAudioTracks() {
    if (!this.audioTracks.length) {
      this.audioTracks = this.stream?.getAudioTracks();
    }
    return this.audioTracks;
  }
  delAudioTracks() {
    if (this.audioTracks.length) {
      this.stream?.removeTrack(this.audioTracks[0]); //模拟删除音频触发错误
    }
  }
  private enAbledAudioTracks() {
    this.getAudioTracks();
    if (this.audioTracks.length) {
      this.audioTracks[0].enabled = true;
    }
  }
  private async getDefaultAudioDeviceId(): Promise<string | undefined> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.find((device) => device.kind === 'audioinput' && device.deviceId === 'default')?.deviceId;
  }

  private setupMediaRecorder() {
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (event) => {
      if (!this.isMuted) this.audioChunks.push(event.data);
    };
  }

  stop() {
    this.mediaRecorder?.stop();
  }
  stopAndDiscard() {
    this.abortController.abort();
  }
  private resetRecordingState() {
    this.isListening = false;
  }
  private resetAudioMuteState() {
    this.isMuted = false;
  }
  private resetAudioData() {
    this.audioChunks = [];
    this.audioTracks = [];
  }
  private resetAudioInit() {
    this.resetRecordingState();
    this.resetAudioMuteState();
    this.resetAudioData();
  }
  async onResult(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        try {
          this.stopVoiceCheck();
          this.stopMediaStream();
          if (this.abortController.signal.aborted) {
            return reject(new Error('录音已中止'));
          }
          if (this.isNoSpeech && this.defaultStartOptions.noSpeechIsError) return reject(SpeechError.NoSpeech); // 没有检测到语音是否抛出异常
          const webmBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const wavBlob = await webmToWavConverterService.convertWebmToWav(webmBlob);
          resolve(wavBlob);
        } catch (error) {
          this.handleError('Error converting WebM to WAV', error);
          reject(error);
        } finally {
          this.resetAudioInit();
        }
      };

      this.mediaRecorder.onerror = (event) => {
        this.resetAudioInit();
        const error = (event as any).error;
        this.handleError('MediaRecorder error', error);
        reject(error?.message || 'Unknown error');
      };
    });
  }

  private stopMediaStream() {
    this.stream.getTracks().forEach((track) => track.stop());
  }

  private handleError(message: string, error: any) {
    console.error(message, error);
  }

  downloadAudio(blob: Blob) {
    const url = this.createObjectURL(blob);
    this.createDownloadLink(url, `${Date.now()}recording.wav`);
  }
  private createObjectURL(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  private createDownloadLink(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  playAudio(blob: Blob) {
    const url = this.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch((err) => this.handleError('Playback error', err));
    audio.onended = () => URL.revokeObjectURL(url);
  }

  checkVoice(threshold = 20, updateInterval = 200, maxSilenceDuration = 3000) {
    if (!this.stream) {
      console.warn('No stream available for analysis');
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.isCheckingAudio || this.analyser) {
      console.warn('Audio checking is already running');
      return; // 避免重复检测
    }

    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);
    this.isCheckingAudio = true; // 开始检测
    this.startAudioCheck(threshold, updateInterval, maxSilenceDuration);
  }

  private startAudioCheck(threshold: number, updateInterval: number, maxSilenceDuration: number) {
    const dataArray = new Uint8Array(this.analyser!.fftSize);
    let lastUpdateTime = 0;
    let silenceDuration = 0;
    let soundDetected = false; // 新增变量，用于标识是否检测到声音
    const checkAudio = (timestamp: number) => {
      if (!this.analyser) return;

      if (timestamp - lastUpdateTime < updateInterval) {
        requestAnimationFrame(checkAudio);
        return;
      }
      lastUpdateTime = timestamp;
      if (this.isMuted) {
        silenceDuration = 0;
      }
      this.analyser.getByteTimeDomainData(dataArray);
      const average = this.calculateAudioAverage(dataArray);
      console.log(average > threshold ? '有声音输入' : '无声音', average);
      if (average > threshold) {
        soundDetected = true; // 声音检测到
        silenceDuration = 0; // 重置无声计时器
      } else if (soundDetected) {
        silenceDuration += updateInterval; // 检测到声音后才开始计时
      }
      if (silenceDuration >= maxSilenceDuration) {
        console.log(`超过${maxSilenceDuration / 1000}秒无声音，停止检测`);
        this.isNoSpeech = true;
        this.stopVoiceCheck(); // 停止检测
        this.stop();
        return;
      }

      requestAnimationFrame(checkAudio);
    };

    requestAnimationFrame(checkAudio);
  }

  private calculateAudioAverage(dataArray: Uint8Array): number {
    const sum = dataArray.reduce((acc, val) => acc + Math.abs(val - 128), 0);
    return sum / dataArray.length;
  }

  stopVoiceCheck() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    this.isCheckingAudio = false;
  }
  mute(message = this.defaultMuteMessage) {
    if (!this.isListening) {
      return {
        code: 503,
        message
      };
    }
    if (!this.isMuted) {
      this.audioTracks.forEach((track) => (track.enabled = false));
      this.isMuted = true;
    }
  }

  unmute(message = this.defaultMuteMessage) {
    if (!this.isListening) {
      return {
        code: 503,
        message
      };
    }
    if (this.isMuted) {
      this.audioTracks.forEach((track) => (track.enabled = true));
      this.isMuted = false;
    }
  }
}

export const webRTCService = new WebRTCService();
