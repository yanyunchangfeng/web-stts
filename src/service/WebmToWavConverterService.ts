class WebmToWavConverterService {
  audioContext: AudioContext | null = null;
  // 将 webm Blob 转换为 wav Blob
  async convertWebmToWav(webmBlob: Blob): Promise<Blob> {
    // 将 WebM Blob 转换为 ArrayBuffer
    const arrayBuffer = await this.blobToArrayBuffer(webmBlob);
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    // 生成 WAV 文件
    return this.audioBufferToWav(audioBuffer);
  }

  // 将 Blob 转换为 ArrayBuffer
  private blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  // 将 AudioBuffer 转换为 WAV Blob
  private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    // 提取所有音频数据
    let result;
    const bufferLength = audioBuffer.length * numOfChannels * (bitDepth / 8);
    const buffer = new ArrayBuffer(44 + bufferLength);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + bufferLength, true);
    this.writeString(view, 8, 'WAVE');

    // FMT sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Sub-chunk size
    view.setUint16(20, format, true); // Audio format (1 for PCM)
    view.setUint16(22, numOfChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * numOfChannels * (bitDepth / 8), true); // Byte rate
    view.setUint16(32, numOfChannels * (bitDepth / 8), true); // Block align
    view.setUint16(34, bitDepth, true); // Bits per sample

    // Data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, bufferLength, true);

    // 写入 PCM 数据
    if (numOfChannels === 2) {
      result = this.interleave(audioBuffer);
    } else {
      result = audioBuffer.getChannelData(0);
    }

    this.floatTo16BitPCM(view, 44, result);

    return new Blob([view], { type: 'audio/wav' });
  }

  // 将 float32 PCM 数据转换为 int16 PCM 数据
  private floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }

  // 将多通道数据交错
  private interleave(input: AudioBuffer): Float32Array {
    const { numberOfChannels, length } = input;
    const result = new Float32Array(length * numberOfChannels);
    const channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(input.getChannelData(i));
    }
    for (let i = 0, index = 0; i < length; i++) {
      for (let j = 0; j < numberOfChannels; j++) {
        result[index++] = channels[j][i];
      }
    }
    return result;
  }

  // 写入字符串到 DataView
  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
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
}
export const webmToWavConverterService = new WebmToWavConverterService();
