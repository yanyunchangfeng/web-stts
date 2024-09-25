// import { webmToWavConverterService } from 'src/service';

// class WebRTCService {
//   mediaRecorder!: MediaRecorder;
//   audioChunks: Blob[] = [];
//   isListening = false;
//   stream!: MediaStream;
//   audioContext: AudioContext | null = null;
//   analyser: AnalyserNode | null = null;
//   isCheckingAudio = false;

//   async init(deviceId?: string) {
//     try {
//       this.stream = await navigator.mediaDevices.getUserMedia({
//         audio: { deviceId }
//       });
//     } catch (error) {
//       console.error('Failed to initialize media stream:', error);
//       throw error;
//     }
//   }
//   async start() {
//     try {
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       const deviceId = devices.find(
//         (device) => device.kind === 'audioinput' && device.deviceId === 'default'
//       )?.deviceId; // 容错率代码 保证获取默认的音频输入设备
//       await this.init(deviceId);
//       if (!this.stream) return false;
//       const audioTracks = this.stream.getAudioTracks();
//       if (audioTracks[0]?.enabled === false) {
//         audioTracks[0].enabled = true;
//       }
//       this.mediaRecorder = new MediaRecorder(this.stream);
//       this.mediaRecorder.ondataavailable = (event) => {
//         this.audioChunks.push(event.data);
//       };
//       this.mediaRecorder.start();
//       this.isListening = true;

//       // setTimeout(() => {
//       //   this.stream.removeTrack(audioTracks[0]); //模拟删除音频触发错误
//       // }, 1000 * 3);

//       return true;
//     } catch (error) {
//       console.error('Failed to start media recording:', error);
//       return false;
//     }
//   }
//   stop() {
//     this.mediaRecorder?.stop();
//   }
//   async onResult(): Promise<Blob> {
//     return new Promise((res, rej) => {
//       this.mediaRecorder.onstop = async () => {
//         this.stream?.getTracks().forEach((track) => {
//           track.stop(); // 停止每个轨道
//         });
//         this.isListening = false;
//         const webmBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
//         this.audioChunks = [];
//         try {
//           const wavBlob = await webmToWavConverterService.convertWebmToWav(webmBlob);
//           res(wavBlob);
//         } catch (error) {
//           console.error('Error converting WebM to WAV:', error);
//           rej(error);
//         }
//       };
//       this.mediaRecorder.onerror = (event) => {
//         const error = (event as any).error;
//         console.log('MediaRecorder Error:', error?.name, error?.message);
//         rej(error?.message || 'Unknown error');
//       };
//     });
//   }
//   // async onError() {
//   //   return new Promise((res, rej) => {
//   //     this.mediaRecorder.onerror = (event) => {
//   //       const error = (event as any).error;
//   //       console.log('MediaRecorder Error:', error?.name, error?.message);
//   //       rej(error?.message || 'Unknown error');
//   //     };
//   //   });
//   // }
//   downloadAudio(blob: Blob) {
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `${Date.now()}recording.wav`;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   }
//   playAudio(blob: Blob) {
//     const url = URL.createObjectURL(blob);
//     const audio = new Audio(url);
//     audio.play().catch((err) => {
//       console.error('Playback error:', err);
//     });
//     audio.onended = () => {
//       URL.revokeObjectURL(url);
//     };
//   }
//   checkVoice(threshold = 20, updateInterval = 200) {
//     if (!this.stream) {
//       console.warn('No stream available for analysis');
//       return;
//     }

//     if (!this.audioContext) {
//       this.audioContext = new AudioContext();
//     }

//     if (this.isCheckingAudio) {
//       console.warn('Audio checking is already running');
//       return; // 避免重复检测
//     }

//     const source = this.audioContext.createMediaStreamSource(this.stream);
//     this.analyser = this.audioContext.createAnalyser();
//     this.analyser.fftSize = 2048;

//     source.connect(this.analyser);

//     const dataArray = new Uint8Array(this.analyser.fftSize);
//     this.isCheckingAudio = true; // 开始检测
//     let lastUpdateTime = 0; // 控制检测频率

//     const checkAudio = (timestamp: number) => {
//       if (!this.analyser) return;

//       // 节流，确保 updateInterval 毫秒后才再次检测
//       if (timestamp - lastUpdateTime < updateInterval) {
//         requestAnimationFrame(checkAudio);
//         return;
//       }
//       lastUpdateTime = timestamp;

//       this.analyser.getByteTimeDomainData(dataArray);

//       const sum = dataArray.reduce((acc, val) => acc + Math.abs(val - 128), 0);
//       const average = sum / dataArray.length;

//       console.log(average > threshold ? '有声音输入' : '无声音', average);
//       requestAnimationFrame(checkAudio);
//     };

//     requestAnimationFrame(checkAudio); // 启动音频检测
//   }

//   stopVoiceCheck() {
//     if (this.audioContext) {
//       this.audioContext.close();
//       this.audioContext = null;
//     }
//     if (this.analyser) {
//       this.analyser.disconnect();
//       this.analyser = null;
//     }
//     this.isCheckingAudio = false;
//   }
// }

import { webmToWavConverterService } from 'src/service';

enum RecordingState {
  Idle,
  Recording,
  Stopped
}

class WebRTCService {
  private mediaRecorder!: MediaRecorder;
  private audioChunks: Blob[] = [];
  private stream!: MediaStream;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private state: RecordingState = RecordingState.Idle;

  async init(deviceId?: string) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
  }

  async start() {
    if (this.state !== RecordingState.Idle) return false;

    try {
      const deviceId = await this.getDefaultAudioDeviceId();
      await this.init(deviceId);
      this.setupMediaRecorder();
      this.mediaRecorder.start();
      this.state = RecordingState.Recording;
      return true;
    } catch (error) {
      this.handleError('Failed to start media recording', error);
      return false;
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
    if (this.state === RecordingState.Recording) {
      this.mediaRecorder.stop();
      this.state = RecordingState.Stopped;
    }
  }

  async onResult(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        this.stopMediaStream();
        this.resetState();
        const webmBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        try {
          const wavBlob = await webmToWavConverterService.convertWebmToWav(webmBlob);
          resolve(wavBlob);
        } catch (error) {
          this.handleError('Error converting WebM to WAV', error);
          reject(error);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        this.resetState();
        const error = (event as any).error;
        this.handleError('MediaRecorder error', error);
        reject(error?.message || 'Unknown error');
      };
    });
  }

  private stopMediaStream() {
    this.stream.getTracks().forEach((track) => track.stop());
  }
  private resetState() {
    this.state = RecordingState.Idle; // 重置状态为Idle
  }

  private handleError(message: string, error: any) {
    console.error(message, error);
  }

  downloadAudio(blob: Blob) {
    const url = URL.createObjectURL(blob);
    this.createDownloadLink(url, `${Date.now()}recording.wav`);
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
    const url = URL.createObjectURL(blob);
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

    if (this.analyser) {
      console.warn('Audio checking is already running');
      return;
    }

    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);
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
  }
}

export const webRTCService = new WebRTCService();
