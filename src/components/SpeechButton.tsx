import { FC, useEffect, useMemo, useState } from 'react';
import { Button, Input } from 'antd';
import React from 'react';
import { TTSVoice, SpeechResult } from 'src/shared';
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
  const [speechResult, setSpeechResult] = useState<SpeechResult>({
    interimContent: '',
    finalContent: '',
    confidence: 0
  });
  const [rtcResultText, setRtcResultText] = useState<string>('');
  const speechResultText = useMemo(() => {
    const { interimContent, finalContent, confidence } = speechResult;
    return `
    interimContent:${interimContent}
    finalContent:${finalContent}
    confidence:${confidence}
    `;
  }, [speechResult]);
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
    try {
      await handleTTS();
    } catch (e) {
      console.error('handleTTS error', e);
      const data = await handleSpeechSynthesizer();
      if (data) {
        console.error(data.message);
      }
    }
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
      const data: any = await voiceFusionRequestService.stt(formData);
      console.log(`stt result :${data}`);
      setRtcResultText(data);
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
      speechRecognizerService.onError().then((err) => {
        console.error(err);
        speechRecognizerService.stop();
        toggleState(setSpeechRecording);
      });
      speechRecognizerService.onResult().then((data) => {
        console.log(data);
        setSpeechResult(data);
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
      <h1>Combine TTS 语音测试（先执行supcon的TTS 捕获错误后执行浏览器语音合成引擎 提高成功率）</h1>
      <Button onClick={handleCombineTTS}>Combine TTS 播放语音</Button>
      <h1>Web SpeechRecognizer API 语音测试（底层依赖于Google的云服务器，需要科学上网）</h1>
      <Button onClick={handleSpeechRecognizer}>{speechRecordingText}</Button>
      <Input.TextArea value={speechResultText} style={{ marginTop: '20px' }} autoSize={{ minRows: 2, maxRows: 6 }} />
      <h1>STT API 语音测试 （supcon的STT）</h1>
      <Button onClick={handleSTT}>{rtcRecordingText}</Button>
      <Input.TextArea value={rtcResultText} style={{ marginTop: '20px' }} autoSize={{ minRows: 2, maxRows: 6 }} />
    </>
  );
};
export default SpeechButton;
