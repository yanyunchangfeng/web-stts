import { TTSData, AudioType, TTSAtobMode } from "src/shared";
import { Base64 } from "js-base64";
import { voiceFusionRequestService } from "src/service";

class TTSService {
  async speak(
    params: TTSData,
    ttsAtobMode: TTSAtobMode = TTSAtobMode.JSBASE64
  ) {
    const audioBase64Str = await voiceFusionRequestService.tts(params);
    const audioBlob = this.atobBase64ToBlob(audioBase64Str, ttsAtobMode); // js-base64
    await this.playAudio(audioBlob);
  }
  jsBase64AtobStr(base64Str: string) {
    return Base64.atob(base64Str);
  }
  windowAtobBase64Str(base64Str: string) {
    return window.atob(base64Str);
  }
  atobBase64ToBlob(base64Str: string, ttsAtobMode: TTSAtobMode) {
    base64Str = this.base64StrReplace(base64Str);
    let binaryString = "";
    if (ttsAtobMode === TTSAtobMode.JSBASE64) {
      binaryString = this.jsBase64AtobStr(base64Str);
    } else {
      binaryString = this.windowAtobBase64Str(base64Str);
    }
    const unit8Array = this.binaryStrToUint8Array(binaryString);
    return this.uint8ArrayToBlob(unit8Array);
  }
  base64StrReplace(base64Str: string) {
    // 去掉前缀b'和后缀' 不然会报错
    return base64Str.replace(/^b'/, "").replace(/'$/, "");
  }
  binaryStrToUint8Array(binaryString: string) {
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  uint8ArrayToBlob(
    uint8Array: Uint8Array,
    mimeType: AudioType = AudioType.WAV
  ) {
    return new Blob([uint8Array], { type: mimeType });
  }
  async playAudio(audioBlob: Blob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    try {
      await audio.play();
      console.log("音频播放成功");
    } catch (error) {
      console.error("音频播放失败:", error);
    }
    // 释放URL对象
    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(audioUrl);
      console.log("音频播放结束，已释放资源");
    });
  }
}

export const ttsService = new TTSService();
