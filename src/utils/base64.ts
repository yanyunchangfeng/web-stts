export const base64ToAudio = (base64Str: string, mimeType = "audio/wav") => {
  try {
    // 去掉前缀b'和后缀'
    const cleanBase64 = base64Str.replace(/^b'/, "").replace(/'$/, "");

    // 解码Base64字符串
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    // 将二进制字符串转换为Uint8Array
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 创建Blob对象
    const blob = new Blob([bytes], { type: mimeType });
    const audioUrl = URL.createObjectURL(blob);

    // 创建音频元素并播放
    const audio = new Audio(audioUrl);
    audio
      .play()
      .then(() => {
        console.log("音频播放成功");
      })
      .catch((error) => {
        console.error("音频播放失败:", error);
      });

    // 释放URL对象
    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(audioUrl);
      console.log("音频播放结束，已释放资源");
    });
  } catch (error) {
    console.error("处理Base64音频时发生错误:", error);
  }
};
