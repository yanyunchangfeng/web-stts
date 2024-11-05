import React, { FC, useEffect, useMemo, useState } from 'react';
import { Button, Input, Space, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined } from '@ant-design/icons';
import { TTSVoice, SpeechResult, CombTTSExecStrategy } from 'src/shared';
import { ttsService, speechRecognizerService, webRTCService, voiceFusionRequestService } from 'src/service';
import { toggleState } from 'src/utils';

const text = `《庄子》是中国道家思想的重要经典，书中通过寓言和对话探讨了自然、自由、生命和死亡的哲学。以下是《庄子》的一些核心思想：
     无为而治：强调顺应自然，不强求而为，主张自然发展的一种智慧。`;
const audioBase64 = ``;
const SpeechButton: FC = () => {
  const [speechRecording, setSpeechRecording] = useState(false);
  const [speakText, setSpeakText] = useState(text);
  const [speechResult, setSpeechResult] = useState<SpeechResult>({
    interimContent: '',
    finalContent: '',
    confidence: 0
  });
  const [speechErr, setSpeechErr] = useState('');
  const [rtcResultText, setRtcResultText] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
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
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const speechRecordingText = useMemo(() => {
    return speechRecording ? '停止录音' : '开始录音';
  }, [speechRecording]);
  const rtcRecordingText = useMemo(() => {
    return rtcRecording ? '停止录音' : '开始录音';
  }, [rtcRecording]);

  const handleSpeechSynthesizer = () => {
    ttsService.speak({
      text: speakText,
      // voc: TTSVoice.man,
      voc: TTSVoice.woman
    });
  };
  const handleStopSpeechSynthesizer = () => {
    ttsService.speechSynthesizerService?.abortSpeak();
  };

  const handleTTS = () => {
    ttsService.tts({
      text: speakText,
      // voc: TTSVoice.man,
      voc: TTSVoice.woman
    });
  };
  const handleCombineTTS = () => {
    ttsService.combineTTS(
      {
        text: speakText,
        // voc: TTSVoice.man,
        voc: TTSVoice.woman
      },
      CombTTSExecStrategy.TTS
    );
  };

  const handleSpeechRecognizer = async () => {
    if (!speechRecognizerService.recognition) return;
    if (speechRecognizerService.isListening) {
      speechRecognizerService.stop();
      setSpeechRecording(false);
      return;
    }
    try {
      setSpeechResult({
        interimContent: '',
        finalContent: '',
        confidence: 0
      });
      setSpeechErr('');
      speechRecognizerService.start();
      setSpeechRecording(true);
      const data = await speechRecognizerService.onResult();
      setSpeechResult(data);
    } catch (err: any) {
      setSpeechErr(err);
    } finally {
      speechRecognizerService.stop();
      setSpeechRecording(false);
    }
  };
  const handleSTT = async () => {
    try {
      setRtcResultText('');
      if (webRTCService.isListening) {
        webRTCService.stop();
        setRtcRecording(false);
        return;
      }
      const success = await webRTCService.start({ threshold: 5, maxSilenceDuration: 6000 });
      if (!success) return;
      setRtcRecording(true);
      setRecordedAudio(null);
      setTimeout(() => {
        // webRTCService.delAudioTracks();
      }, 1000 * 3);
      const wavblob = await webRTCService.onResult();
      if (!wavblob) return;
      setRecordedAudio(wavblob);
      const formData = new FormData();
      formData.append('file', wavblob, `${Date.now()}.wav`);
      const data: any = await voiceFusionRequestService.stt(formData);
      setRtcResultText(data);
    } catch (err) {
      webRTCService.stop();
      console.error(err);
      setRtcResultText(`speechErr: ${err}`);
    } finally {
      setRtcRecording(false);
    }
  };

  const handleDownload = () => {
    if (recordedAudio) {
      webRTCService.downloadAudio(recordedAudio);
    }
  };
  const initWebSpeechRecognizer = () => {
    const webSpeechReady = speechRecognizerService.initialize();
    if (webSpeechReady) {
    } else {
      console.log('Your Browser is not supported. Please try Google Chrome.');
    }
  };
  useEffect(() => {
    initWebSpeechRecognizer();
  }, []);

  const handleSTTS = async () => {
    await ttsService.combineTTS({ text }, CombTTSExecStrategy.TTS);
    await handleSTT();
  };

  const handleStopSTT = async () => {
    webRTCService.stopAndDiscard();
  };
  const handleStopCombineTTS = async () => {
    ttsService.abortCombineTTS();
    ttsService.speechSynthesizerService?.abortSpeak();
  };
  const handleStopSTTS = async () => {
    handleStopCombineTTS();
    handleStopSTT();
  };
  const handleToggleMuted = React.useCallback(() => {
    if (!isMuted) {
      const result = webRTCService.mute('静音无法操作');
      if (result) {
        message.warning(result.message);
        return;
      }
      setIsMuted(true);
    } else {
      const result = webRTCService.unmute('取消静音无法操作');
      if (result) {
        message.warning(result.message);
        return;
      }
      setIsMuted(false);
    }
  }, [isMuted]);

  return (
    <>
      <h3>Web SpeechSynthesize API 语音测试 （底层基于浏览器语音合成引擎，无需科学上网）</h3>
      <Input placeholder="请输入语音内容" defaultValue={speakText} onChange={(e) => setSpeakText(e.target.value)} />
      <Space style={{ marginTop: 12 }}>
        <Button onClick={handleSpeechSynthesizer}>Web SpeechSynthesize 播放语音</Button>
        <Button onClick={handleStopSpeechSynthesizer}>Stop Web SpeechSynthesize 播放语音</Button>
      </Space>
      <h3>TTS API 语音测试 （xunfeiTTS）</h3>
      <Button onClick={handleTTS}>TTS API播放语音</Button>
      <h3>
        Combine TTS 语音测试（有服务端audioBase64缓存先执行缓存播放,没有的话执行xunfeiTTS
        捕获错误后执行浏览器语音合成引擎 提高成功率）
      </h3>
      <Space>
        <Button onClick={handleCombineTTS}>Combine TTS 播放语音</Button>
        <Button onClick={handleStopCombineTTS}>Stop Combine TTS 播放语音</Button>
      </Space>
      <h3>Web SpeechRecognizer API 语音测试（底层依赖于Google的云服务器，需要科学上网）</h3>
      <Button onClick={handleSpeechRecognizer}>{speechRecordingText}</Button>
      <Input.TextArea value={speechResultText} style={{ marginTop: 12 }} autoSize={{ minRows: 2, maxRows: 6 }} />
      <h3>STT API 语音测试 （xunfeiSTT）</h3>
      <Space>
        <Button onClick={handleSTT}>{rtcRecordingText}</Button>
        <Button onClick={handleStopSTT}>StopAndDiscard 录音</Button>
        <Button icon={!isMuted ? <AudioOutlined /> : <AudioMutedOutlined />} onClick={handleToggleMuted}></Button>
      </Space>

      <Input.TextArea value={rtcResultText} style={{ marginTop: 12 }} autoSize={{ minRows: 2, maxRows: 6 }} />
      {recordedAudio && (
        <Space style={{ marginTop: '12px' }}>
          <Button onClick={handleDownload}>下载录音</Button>
          <audio controls src={URL.createObjectURL(recordedAudio)} />
        </Space>
      )}
      <h3>TTS&&STT先播报再录音</h3>
      <Space>
        <Button onClick={handleSTTS}>播报录音</Button>
        <Button onClick={handleStopSTTS}>Stop 播报录音</Button>
      </Space>
    </>
  );
};
export default SpeechButton;
