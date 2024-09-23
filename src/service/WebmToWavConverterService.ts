class WebmToWavConverterService {
  lastAudioContextOptions?: AudioContextOptions;
  audioContext: AudioContext | null = null;
  // 将 WebM Blob 转换为 WAV Blob，增加 bitDepth 和 AudioContextOptions 参数
  public async convertWebmToWav(
    webmBlob: Blob,
    bitDepth: 16 | 24 | 32 = 16,
    options?: AudioContextOptions
  ): Promise<Blob> {
    console.time('convertWebmToWav');
    // 确保位深度是支持的值
    if (![16, 24, 32].includes(bitDepth)) {
      throw new Error(`Unsupported bit depth: ${bitDepth}. Supported values are 16, 24, or 32.`);
    }
    // 检查当前 AudioContext 是否已经存在以及配置是否一致
    if (!this.audioContext || this.lastAudioContextOptions !== options) {
      if (this.audioContext) {
        // 关闭现有的 AudioContext
        await this.audioContext.close();
      }
      // 创建新的 AudioContext
      this.audioContext = new AudioContext(options);
      this.lastAudioContextOptions = options; // 保存配置
    }
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    const wavBlob = this.audioBufferToWav(audioBuffer, bitDepth);

    console.timeEnd('convertWebmToWav');
    return wavBlob;
  }

  // 将 AudioBuffer 转换为 WAV Blob，增加 bitDepth 参数
  private audioBufferToWav(audioBuffer: AudioBuffer, bitDepth: number): Blob {
    const numOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    console.log('sampleRate', sampleRate);

    // 根据位深度计算缓冲区大小
    const bytesPerSample = bitDepth / 8;
    const bufferLength = audioBuffer.length * numOfChannels * bytesPerSample;
    const wavBuffer = new ArrayBuffer(44 + bufferLength);
    const view = new DataView(wavBuffer);

    // 写入 WAV 文件头
    this.writeWavHeader(view, numOfChannels, sampleRate, bitDepth, bufferLength);
    // 写入音频数据
    this.writeAudioData(view, audioBuffer, 44, bitDepth);

    return new Blob([view], { type: 'audio/wav' });
  }

  // 写入 WAV 文件头，保持不变
  private writeWavHeader(
    view: DataView,
    numOfChannels: number,
    sampleRate: number,
    bitDepth: number,
    bufferLength: number
  ) {
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + bufferLength, true); // 文件大小
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Sub-chunk size
    // view.setUint16(20, 1, true); // PCM 格式
    // view.setUint16(20, 3, true); // PCM 格式为 3 代表浮点数
    view.setUint16(20, bitDepth === 16 ? 1 : bitDepth === 32 ? 3 : 1, true); // PCM 格式
    view.setUint16(22, numOfChannels, true); // 通道数
    view.setUint32(24, sampleRate, true); // 采样率
    view.setUint32(28, sampleRate * numOfChannels * (bitDepth / 8), true); // Byte rate
    view.setUint16(32, numOfChannels * (bitDepth / 8), true); // Block align
    view.setUint16(34, bitDepth, true); // 位深度
    this.writeString(view, 36, 'data');
    view.setUint32(40, bufferLength, true); // 数据大小
  }

  // 写入 PCM 音频数据，修改以支持不同位深度
  private writeAudioData(view: DataView, audioBuffer: AudioBuffer, offset: number, bitDepth: number) {
    const numOfChannels = audioBuffer.numberOfChannels;

    // 根据位深度写入音频数据
    for (let channel = 0; channel < numOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i])); // 防止溢出

        // 根据不同的位深度写入数据
        if (bitDepth === 16) {
          const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          view.setInt16(offset, intSample, true);
          offset += 2;
        } else if (bitDepth === 24) {
          const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
          view.setInt8(offset, intSample & 0xff);
          view.setInt8(offset + 1, (intSample >> 8) & 0xff);
          view.setInt8(offset + 2, (intSample >> 16) & 0xff);
          offset += 3;
        } else if (bitDepth === 32) {
          // 32位浮点数处理
          const floatSample = Math.max(-1.0, Math.min(1.0, sample)); // 限制在 -1.0 到 1.0 范围
          view.setFloat32(offset, floatSample, true); // 使用浮点数写入
          offset += 4;
        }
      }
    }
  }

  // 写入字符串，保持不变
  private writeString(view: DataView, offset: number, text: string) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
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
    blobData: Blob | Blob[],
    as32BitFloat: boolean = false,
    contextOptions?: AudioContextOptions
  ): Promise<Blob> {
    console.time('getWaveBlob');
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
    console.timeEnd('getWaveBlob');
    return new Blob([waveFileData], { type: 'audio/wave' });
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
  private async _getAudioBuffer(blobData: Blob | Blob[], contextOptions?: AudioContextOptions): Promise<AudioBuffer> {
    console.time('_getAudioBuffer');
    const blob = blobData instanceof Blob ? blobData : new Blob(blobData);
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext(contextOptions);
    const result = audioContext.decodeAudioData(arrayBuffer);
    console.timeEnd('_getAudioBuffer');
    return result;
  }
}
export const webmToWavConverterService = new WebmToWavConverterService();
