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

const SpeechButton: FC = () => {
  const [speechRecording, setSpeechRecording] = useState(false);
  const [speakText, setSpeakText] = useState('hello world');
  const [speechResult, setSpeechResult] = useState<SpeechResult>({
    interimContent: '',
    finalContent: '',
    confidence: 0
  });
  const [speechErr, setSpeechErr] = useState('');
  const [rtcResultText, setRtcResultText] = useState<string>('');
  const speechResultText = useMemo(() => {
    const { interimContent, finalContent, confidence } = speechResult;
    return `
    interimContent:${interimContent}
    finalContent:${finalContent}
    confidence:${confidence}
    speechErr:${speechErr}
    `;
  }, [speechResult, speechErr]);
  const [rtcRecording, setRtcRecording] = useState(false);
  const speechRecordingText = useMemo(() => {
    return speechRecording ? '停止录音' : '开始录音';
  }, [speechRecording]);
  const rtcRecordingText = useMemo(() => {
    return rtcRecording ? '停止录音' : '开始录音';
  }, [rtcRecording]);

  const handleSpeechSynthesizer = async () => {
    return speechSynthesizerService.speak(speakText);
  };

  const handleTTS = async () => {
    await ttsService.speak({
      text: speakText,
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
    if (!speechRecognizerService.recognition) return;
    if (speechRecognizerService.isListening) {
      speechRecognizerService.stop();
      setSpeechRecording(false);
      return;
    }
    speechRecognizerService.start();
    setSpeechResult({
      interimContent: '',
      finalContent: '',
      confidence: 0
    });
    setSpeechErr('');
    speechRecognizerService.onError().then((err: any) => {
      console.error(err);
      setSpeechErr(err);
      speechRecognizerService.stop();
      setSpeechRecording(false);
    });
    speechRecognizerService.onResult().then((data) => {
      console.log(data);
      setSpeechResult(data);
    });

    setSpeechRecording(true);
  };
  const handleSTT = async () => {
    try {
      if (webRTCService.isListening) {
        webRTCService.stop();
        webRTCService.stopVoiceCheck();
        setRtcRecording(false);
        return;
      }
      const success = await webRTCService.start();
      if (!success) return;
      webRTCService.checkVoice(5);
      setRtcRecording(true);
      webRTCService.onError().then((err: any) => {
        console.log('error', err);
        webRTCService.stop();
        webRTCService.stopVoiceCheck();
        setRtcRecording(false);
        // navigator.mediaDevices.getUserMedia({ audio: true }).then((newStream) => {
        //   newStream.getTracks().forEach((track) => track.stop()); // 立刻停止新的流，确保设备释放
        // });
      });
      const wavblob = await webRTCService.onResult();
      if (!wavblob) return;
      webRTCService.downloadAudio(wavblob);
      const formData = new FormData();
      formData.append('file', wavblob, `${Date.now()}.wav`);
      const data: any = await voiceFusionRequestService.stt(formData);
      setRtcResultText(data);
    } catch (err) {
      console.error(err);
      webRTCService.stop();
      webRTCService.stopVoiceCheck();
      setRtcRecording(false);
    }
  };

  const initWebSpeechRecognizer = () => {
    const webSpeechReady = speechRecognizerService.initialize();
    if (webSpeechReady) {
      // speechRecognizerService.onError().then((err: any) => {
      //   console.error(err);
      //   setSpeechErr(err);
      //   speechRecognizerService.stop();
      //   setSpeechRecording(false);
      // });
      // speechRecognizerService.onResult().then((data) => {
      //   console.log(data);
      //   setSpeechResult(data);
      //   setSpeechErr('');
      // });
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
      <Input placeholder="请输入语音内容" defaultValue={speakText} onChange={(e) => setSpeakText(e.target.value)} />
      <Button onClick={handleSpeechSynthesizer} style={{ marginTop: '20px' }}>
        Web SpeechSynthesize 播放语音
      </Button>
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
