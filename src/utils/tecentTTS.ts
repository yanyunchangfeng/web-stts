export async function getSpeechFromText(text = "你好，这是语音播放的示例") {
  const response = await fetch("https://tts.tencentcloudapi.com", {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
      "X-TC-Action": "TextToVoice",
    },

    body: JSON.stringify({
      Text: text,
      SessionId: "session-1234",
      Volume: 1,
      Speed: 1,
      ProjectId: 0,
      ModelType: 1,
      VoiceType: 1001,
      PrimaryLanguage: 1,
      SampleRate: 16000,
      Codec: "wav",
      EnableSubtitle: true,
    }),
  });

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  const audio = new Audio(audioUrl);
  audio.play(); // 播放生成的音频
}
