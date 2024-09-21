export const speech = (str = "你好，这是语音播放的示例") => {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(str);
    utterance.lang = "zh-CN"; // 设置为中文
    utterance.pitch = 1; // 设置音高
    utterance.rate = 1; // 设置语速
    utterance.volume = 1; // 设置音量

    // 播放语音
    window.speechSynthesis.speak(utterance);
  } else {
    console.error("浏览器不支持 Web Speech API");
  }
};
