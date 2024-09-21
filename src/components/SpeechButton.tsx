import { FC, useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import React from 'react';
import { TTSVoice } from 'src/shared';
import {
  ttsService,
  speechSynthesizerService,
  speechRecognizerService,
  webRTCService,
  voiceFusionRequestService
} from 'src/service';
import { toggleState } from 'src/utils';

const SpeechButton: FC = () => {
  const [speechRecording, setSpeechRecording] = useState(false);
  const [rtcRecording, setRtcRecording] = useState(false);
  const speechRecordingText = useMemo(() => {
    return speechRecording ? '停止录音' : '开始录音';
  }, [speechRecording]);
  const rtcRecordingText = useMemo(() => {
    return rtcRecording ? '停止录音' : '开始录音';
  }, [rtcRecording]);

  const handleSpeechSynthesizer = async () => {
    return speechSynthesizerService.speak('hello world');
  };

  const handleTTS = async () => {
    await ttsService.speak({
      text: 'hello world',
      // voc: TTSVoice.man,
      voc: TTSVoice.woman
    });
  };
  const handleCombineTTS = async () => {
    const data = await handleSpeechSynthesizer();
    if (!data) return;
    await handleTTS();
  };

  const handleSpeechRecognizer = () => {
    if (speechRecognizerService.isListening) {
      speechRecognizerService.stop();
      toggleState(setSpeechRecording);
      return;
    }
    speechRecognizerService.start();
    toggleState(setSpeechRecording);
  };
  const handleSTT = async () => {
    try {
      if (webRTCService.isListening) {
        webRTCService.stop();
        webRTCService.stopVoiceCheck();
        toggleState(setRtcRecording);
        return;
      }
      const success = await webRTCService.start();
      if (!success) return;
      webRTCService.checkVoice(5);
      toggleState(setRtcRecording);
      webRTCService.onError();
      const wavblob = await webRTCService.onResult();
      if (!wavblob) return;
      webRTCService.downloadAudio(wavblob);
      const formData = new FormData();
      formData.append('file', wavblob, `${Date.now()}.wav`);
      const data = await voiceFusionRequestService.stt(formData);
      console.log(`stt result :${data}`);
    } catch (err) {
      console.error(err);
      webRTCService.stop();
      webRTCService.stopVoiceCheck();
      toggleState(setRtcRecording);
    }
  };

  const initWebSpeechRecognizer = () => {
    const webSpeechReady = speechRecognizerService.initialize();
    if (webSpeechReady) {
      speechRecognizerService.onEnd();
      speechRecognizerService.onError().then((err) => {
        console.error(err);
        speechRecognizerService.stop();
        toggleState(setSpeechRecording);
      });
      speechRecognizerService.onResult().then((data) => {
        console.log(data);
      });
    } else {
      console.error('Your Browser is not supported. Please try Google Chrome.');
    }
  };
  useEffect(() => {
    initWebSpeechRecognizer();
  }, []);

  return (
    <>
      <h1>Web SpeechSynthesize API 语音测试 （底层基于浏览器语音合成引擎，无需科学上网）</h1>
      <Button onClick={handleSpeechSynthesizer}>Web SpeechSynthesize 播放语音</Button>
      <h1>TTS API 语音测试 （supcon的TTS）</h1>
      <Button onClick={handleTTS}>TTS API播放语音</Button>
      <h1>Combine TTS 语音测试</h1>
      <Button onClick={handleCombineTTS}>Combine TTS 播放语音</Button>
      <h1>Web SpeechRecognizer API 语音测试（底层依赖于Google的云服务器，需要科学上网）</h1>
      <Button onClick={handleSpeechRecognizer}>{speechRecordingText}</Button>
      <h1>STT API 语音测试 （supcon的STT）</h1>
      <Button onClick={handleSTT}>{rtcRecordingText}</Button>
    </>
  );
};
export default SpeechButton;
