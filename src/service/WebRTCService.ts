import { webmToWavConverterService } from 'src/service';
class WebRTCService {
  mediaRecorder!: MediaRecorder;
  audioChunks: Blob[] = [];
  isListening = false;
  stream!: MediaStream;
  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  isCheckingAudio = false;

  async init(deviceId?: string) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId
      }
    });
  }
  async start() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const deviceId = devices.find(
        (device) => device.kind === 'audioinput' && device.deviceId === 'default'
      )?.deviceId; // 容错率代码 保证获取默认的音频输入设备
      await this.init(deviceId);
      if (!this.stream) return false;
      const audioTracks = this.stream.getAudioTracks();
      if (audioTracks[0]?.enabled === false) {
        audioTracks[0].enabled = true;
      }
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };
      this.mediaRecorder.start();
      this.isListening = true;
      // setTimeout(() => {
      //   this.stream.removeTrack(audioTracks[0]); //模拟删除音频触发错误
      // }, 1000 * 3);
      return true;
    } catch (error) {
      console.error('Failed to start media recording:', error);
      return false;
    }
  }
  stop() {
    this.mediaRecorder?.stop();
  }
  async onResult(): Promise<Blob> {
    return new Promise((res, rej) => {
      this.mediaRecorder.onstop = async () => {
        this.stream?.getTracks().forEach((track) => {
          track.stop(); // 停止每个轨道
        });
        this.isListening = false;
        const webmBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        try {
          const wavBlob = await webmToWavConverterService.convertWebmToWav(webmBlob);
          res(wavBlob);
        } catch (error) {
          console.error('Error converting WebM to WAV:', error);
          rej(error);
        }
      };
      this.mediaRecorder.onerror = (event) => {
        const error = (event as any).error;
        console.log('MediaRecorder Error:', error?.name, error?.message);
        rej(error?.message || 'Unknown error');
      };
    });
  }
  // async onError() {
  //   return new Promise((res) => {
  //     this.mediaRecorder.onerror = (event) => {
  //       const error = (event as any).error;
  //       if (error) {
  //         console.log('MediaRecorder Error:', error.name, error.message);
  //         res(error.message);
  //       } else {
  //         console.log('Unknown error occurred in MediaRecorder');
  //         res('Unknown error');
  //       }
  //     };
  //   });
  // }
  downloadAudio(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${Date.now()}recording.wav`; // 设置下载文件名
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // 释放 URL 对象
  }
  playAudio(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch((err) => {
      console.error('Playback error:', err);
    }); // 播放录制的音频
    audio.onended = () => {
      URL.revokeObjectURL(url); // 释放 URL 对象
    };
  }
  checkVoice(threshold = 20, updateInterval = 200) {
    if (!this.stream) {
      console.warn('No stream available for analysis');
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.isCheckingAudio) {
      console.warn('Audio checking is already running');
      return; // 避免重复检测
    }

    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    source.connect(this.analyser);

    const dataArray = new Uint8Array(this.analyser.fftSize);
    this.isCheckingAudio = true; // 开始检测
    let lastUpdateTime = 0; // 控制检测频率

    const checkAudio = (timestamp: number) => {
      if (!this.analyser) return;

      // 节流，确保 updateInterval 毫秒后才再次检测
      if (timestamp - lastUpdateTime < updateInterval) {
        requestAnimationFrame(checkAudio);
        return;
      }
      lastUpdateTime = timestamp;

      this.analyser.getByteTimeDomainData(dataArray);

      const sum = dataArray.reduce((acc, val) => acc + Math.abs(val - 128), 0);
      const average = sum / dataArray.length;

      console.log(average > threshold ? '有声音输入' : '无声音', average);
      requestAnimationFrame(checkAudio);
    };

    requestAnimationFrame(checkAudio); // 启动音频检测
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
