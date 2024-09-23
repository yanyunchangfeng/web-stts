import { webmToWavConverterService } from 'src/service';
class WebRTCService {
  mediaRecorder!: MediaRecorder;
  audioChunks: Blob[] = [];
  isListening = false;
  stream!: MediaStream;
  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  async init(deviceId?: string) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId
        }
      });
    } catch (error) {
      console.log(error);
    }
  }
  async start() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const deviceId = devices.find((device) => device.kind === 'audioinput' && device.deviceId === 'default')?.deviceId; // 容错率代码 保证获取默认的音频输入设备
    await this.init(deviceId);
    if (!this.stream) return false;
    const audioTracks = this.stream.getAudioTracks();
    console.log(audioTracks);
    if (audioTracks[0].enabled === false) {
      audioTracks[0].enabled = true;
    }
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data);
    };
    this.mediaRecorder.start();
    this.isListening = true;
    return true;
  }
  stop() {
    this.mediaRecorder?.stop();
  }
  async onResult(): Promise<Blob> {
    return new Promise((res) => {
      this.mediaRecorder.onstop = async () => {
        this.stream?.getTracks().forEach((track) => {
          track.stop(); // 停止每个轨道
        });
        this.isListening = false;
        const webmBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        const wavBlob = await webmToWavConverterService.convertWebmToWav(webmBlob, 24);
        const wavBlob2 = await webmToWavConverterService.convertWebmToWav(webmBlob, 24, { sampleRate: 96000 });
        res(wavBlob);
        // const getWaveBlob = await webmToWavConverterService.getWaveBlob(webmBlob, false);
        // res(getWaveBlob);
      };
    });
  }
  async onError() {
    return new Promise((res) => {
      this.mediaRecorder.onerror = (event) => {
        const eventError: string = (event as any).error;
        console.log('Error: ' + eventError);
        res(eventError);
      };
    });
  }
  downloadAudio(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${Date.now()}recording.wav`; // 设置下载文件名
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  playAudio(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play(); // 播放录制的音频
  }
  checkVoice(threshold = 20) {
    if (!this.stream) {
      console.warn('No stream available for analysis');
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    source.connect(this.analyser);

    const dataArray = new Uint8Array(this.analyser.fftSize);

    const checkAudio = () => {
      if (!this.analyser) return;

      this.analyser.getByteTimeDomainData(dataArray);
      let sum = 0;

      for (let i = 0; i < dataArray.length; i++) {
        sum += Math.abs(dataArray[i] - 128); // 128 表示无声
      }

      const average = sum / dataArray.length;

      if (average > threshold) {
        console.log('有声音输入', average);
      } else {
        console.log('无声音', average);
      }

      requestAnimationFrame(checkAudio);
    };

    checkAudio();
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
  }
}

export const webRTCService = new WebRTCService();
