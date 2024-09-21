class WebmToWavConverterService {
  audioContext: AudioContext | null = null;
  // 将 webm Blob 转换为 wav Blob
  // 有问题 下载下来的语音识别不清楚
  convertWebmToWav(webmBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          //   if (!this.audioContext) {
          const audioContext = new AudioContext();
          //   }
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const wavBlob = this.encodeWav(audioBuffer);
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(webmBlob);
    });
  }

  // 编码 PCM 数据为 WAV 格式
  private encodeWav(audioBuffer: AudioBuffer): Blob {
    const { numberOfChannels, sampleRate } = audioBuffer;
    const interleaved = this.interleave(audioBuffer);
    const wavHeader = this.createWavHeader(interleaved.length, numberOfChannels, sampleRate);
    const wavBuffer = new Uint8Array([...wavHeader, ...interleaved]);

    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  // 交错合并多通道的 PCM 数据
  private interleave(audioBuffer: AudioBuffer): Int16Array {
    const buffers = Array.from({ length: audioBuffer.numberOfChannels }, (_, i) => audioBuffer.getChannelData(i));
    const length = buffers[0].length * buffers.length;
    const interleaved = new Float32Array(length);

    let inputIndex = 0;
    for (let i = 0; i < buffers[0].length; i++) {
      for (let channel = 0; channel < buffers.length; channel++) {
        interleaved[inputIndex++] = buffers[channel][i];
      }
    }

    return this.floatTo16BitPCM(interleaved);
  }

  // 将 float32 PCM 数据转换为 int16 PCM 数据
  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    return Int16Array.from(float32Array.map((s) => Math.max(-1, Math.min(1, s)) * (s < 0 ? 0x8000 : 0x7fff)));
  }

  // 创建 WAV 文件头部
  private createWavHeader(dataLength: number, numChannels: number, sampleRate: number): Uint8Array {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength * 2, true); // Data size + header size
    this.writeString(view, 8, 'WAVE');

    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // Audio format (1 for PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * numChannels * 2, true); // Byte rate
    view.setUint16(32, numChannels * 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample

    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength * 2, true); // NumSamples * NumChannels * BitsPerSample/8

    return new Uint8Array(buffer);
  }

  // 写入字符串到 DataView
  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  private _writeStringToArray(aString: string, targetArray: Uint8Array, offset: number): void {
    for (let i = 0; i < aString.length; ++i) {
      targetArray[offset + i] = aString.charCodeAt(i);
    }
  }

  private _writeInt16ToArray(aNumber: number, targetArray: Uint8Array, offset: number): void {
    aNumber = Math.floor(aNumber);
    targetArray[offset + 0] = aNumber & 255; // byte 1
    targetArray[offset + 1] = (aNumber >> 8) & 255; // byte 2
  }

  private _writeInt32ToArray(aNumber: number, targetArray: Uint8Array, offset: number): void {
    aNumber = Math.floor(aNumber);
    targetArray[offset + 0] = aNumber & 255; // byte 1
    targetArray[offset + 1] = (aNumber >> 8) & 255; // byte 2
    targetArray[offset + 2] = (aNumber >> 16) & 255; // byte 3
    targetArray[offset + 3] = (aNumber >> 24) & 255; // byte 4
  }

  // Returns the bits of the float as a 32-bit integer value.
  private _floatBits(f: number): number {
    const buf = new ArrayBuffer(4);
    new Float32Array(buf)[0] = f;
    const bits = new Uint32Array(buf)[0];
    // Return as a signed integer.
    return bits | 0;
  }

  private _writeAudioBufferToArray(
    audioBuffer: AudioBuffer,
    targetArray: Uint8Array,
    offset: number,
    bitDepth: number
  ): void {
    const length = audioBuffer.length;
    const channels = audioBuffer.numberOfChannels;

    for (let index = 0; index < length; ++index) {
      for (let channel = 0; channel < channels; ++channel) {
        const channelData = audioBuffer.getChannelData(channel);
        let sample: number;

        if (bitDepth === 16) {
          sample = channelData[index] * 32768.0;
          sample = Math.max(-32768, Math.min(32767, sample));
          this._writeInt16ToArray(sample, targetArray, offset);
          offset += 2;
        } else if (bitDepth === 32) {
          sample = this._floatBits(channelData[index]);
          this._writeInt32ToArray(sample, targetArray, offset);
          offset += 4;
        } else {
          throw new Error('Invalid bit depth for PCM encoding.');
        }
      }
    }
  }

  // Converts Blob data to AudioBuffer
  private async _getAudioBuffer(blobData: Blob, contextOptions?: AudioContextOptions): Promise<AudioBuffer> {
    const blob = blobData instanceof Blob ? blobData : new Blob([blobData]);

    const url = URL.createObjectURL(blob);
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    const audioContext = new AudioContext(contextOptions);
    return audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Converts a Blob or Blob[] to a WAV Blob.
   *
   * @param blobData - Blob or Blob[] to be converted to audio/wave Blob
   * @param as32BitFloat - Convert to 16-bit or 32-bit file, default 16-bit
   * @param contextOptions - AudioContext options for encoding
   * @returns Promise<Blob> - WAV Blob
   */
  public async getWaveBlob(
    blobData: Blob,
    as32BitFloat: boolean = false,
    contextOptions?: AudioContextOptions
  ): Promise<Blob> {
    const audioBuffer = await this._getAudioBuffer(blobData, contextOptions);

    const frameLength = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const bitsPerSample = as32BitFloat ? 32 : 16;
    const bytesPerSample = bitsPerSample / 8;
    const byteRate = sampleRate * numberOfChannels * bytesPerSample;
    const blockAlign = numberOfChannels * bytesPerSample;
    const wavDataByteLength = frameLength * numberOfChannels * bytesPerSample;
    const headerByteLength = 44;
    const totalLength = headerByteLength + wavDataByteLength;
    const waveFileData = new Uint8Array(totalLength);
    const subChunk1Size = 16;
    const subChunk2Size = wavDataByteLength;
    const chunkSize = 4 + (8 + subChunk1Size) + (8 + subChunk2Size);

    this._writeStringToArray('RIFF', waveFileData, 0);
    this._writeInt32ToArray(chunkSize, waveFileData, 4);
    this._writeStringToArray('WAVE', waveFileData, 8);
    this._writeStringToArray('fmt ', waveFileData, 12);
    this._writeInt32ToArray(subChunk1Size, waveFileData, 16); // SubChunk1Size
    this._writeInt16ToArray(as32BitFloat ? 3 : 1, waveFileData, 20); // AudioFormat
    this._writeInt16ToArray(numberOfChannels, waveFileData, 22); // NumChannels
    this._writeInt32ToArray(sampleRate, waveFileData, 24); // SampleRate
    this._writeInt32ToArray(byteRate, waveFileData, 28); // ByteRate
    this._writeInt16ToArray(blockAlign, waveFileData, 32); // BlockAlign
    this._writeInt16ToArray(bitsPerSample, waveFileData, 34); // BitsPerSample
    this._writeStringToArray('data', waveFileData, 36);
    this._writeInt32ToArray(subChunk2Size, waveFileData, 40); // SubChunk2Size

    // Write actual audio data starting at offset 44
    this._writeAudioBufferToArray(audioBuffer, waveFileData, 44, bitsPerSample);

    return new Blob([waveFileData], { type: 'audio/wave' });
  }
}
export const webmToWavConverterService = new WebmToWavConverterService();
