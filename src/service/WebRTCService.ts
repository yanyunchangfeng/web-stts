import { webmToWavConverterService } from 'src/service';

class WebRTCService {
  private mediaRecorder!: MediaRecorder;
  private audioChunks: Blob[] = [];
  isListening = false;
  private stream!: MediaStream;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  isCheckingAudio = false;
  private audioTracks: MediaStreamTrack[] = [];

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

  async start() {
    try {
      const deviceId = await this.getDefaultAudioDeviceId();
      await this.init(deviceId);
      if (!this.stream) return false;
      this.setupMediaRecorder();
      this.enAbledAudioTracks();
      this.mediaRecorder.start();
      this.isListening = true;
      return true;
    } catch (error) {
      this.handleError('Failed to start media recording', error);
      return false;
    }
  }
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
    this.mediaRecorder.ondataavailable = (event) => this.audioChunks.push(event.data);
  }

  stop() {
    this.mediaRecorder?.stop();
  }
  private resetRecordingState() {
    this.isListening = false;
  }
  private resetAudioData() {
    this.audioChunks = [];
    this.audioTracks = [];
  }
  private resetAudioInit() {
    this.resetRecordingState();
    this.resetAudioData();
  }
  async onResult(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        this.stopMediaStream();
        const webmBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.resetAudioInit();
        try {
          const wavBlob = await webmToWavConverterService.convertWebmToWav(webmBlob);
          resolve(wavBlob);
        } catch (error) {
          this.handleError('Error converting WebM to WAV', error);
          reject(error);
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
    // 这里可以添加用户提示
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

  checkVoice(threshold = 20, updateInterval = 200) {
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
    this.startAudioCheck(threshold, updateInterval);
  }

  private startAudioCheck(threshold: number, updateInterval: number) {
    const dataArray = new Uint8Array(this.analyser!.fftSize);
    let lastUpdateTime = 0;

    const checkAudio = (timestamp: number) => {
      if (!this.analyser) return;

      if (timestamp - lastUpdateTime < updateInterval) {
        requestAnimationFrame(checkAudio);
        return;
      }
      lastUpdateTime = timestamp;

      this.analyser.getByteTimeDomainData(dataArray);
      const average = this.calculateAudioAverage(dataArray);
      console.log(average > threshold ? '有声音输入' : '无声音', average);
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
}

export const webRTCService = new WebRTCService();
