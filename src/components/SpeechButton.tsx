import React, { FC, useEffect, useMemo, useState } from 'react';
import { Button, Divider, Input, Space, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined } from '@ant-design/icons';
import { TTSVoice, SpeechResult, CombTTSExecStrategy } from 'src/shared';
import { ttsService, speechRecognizerService, webRTCService, voiceFusionRequestService } from 'src/service';
import { audioBase64 } from 'src/components/constants';

const text = `《庄子》是中国道家思想的重要经典，书中通过寓言和对话探讨了自然、自由、生命和死亡的哲学。以下是《庄子》的一些核心思想：
     无为而治：强调顺应自然，不强求而为，主张自然发展的一种智慧。`;

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
  const intervalRef = React.useRef<ReturnType<typeof setInterval>>();
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

  const [average, setAverage] = useState(0);

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
        voc: TTSVoice.woman,
        audioBase64
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
      const success = await webRTCService.start({ threshold: 25, maxSilenceDuration: 1000 * 3 });
      if (!success) return;
      intervalRef.current = setInterval(() => {
        setAverage(Number(webRTCService.average.toFixed(1)));
      }, 100);
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
      setAverage(0);
      setIsMuted(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
    webRTCService.abortRecording();
  };
  const handleStopCombineTTS = async () => {
    ttsService.abortPlayAudio();
  };
  const handleStopSTTS = async () => {
    handleStopCombineTTS();
    handleStopSTT();
  };

  // const handleToggleMuted = React.useCallback(() => {
  //   if (!isMuted) {
  //     const result = webRTCService.mute('静音无法操作');
  //     if (result) {
  //       message.warning(result.message);
  //       return;
  //     }
  //     setIsMuted(true);
  //   } else {
  //     const result = webRTCService.unmute('取消静音无法操作');
  //     if (result) {
  //       message.warning(result.message);
  //       return;
  //     }
  //     setIsMuted(false);
  //   }
  // }, [isMuted]);

  const handleMuted = () => {
    const result = webRTCService.mute('静音无法操作');
    if (result) {
      message.warning(result.message);
      return;
    }
  };
  const handleUnMuted = () => {
    const result = webRTCService.unmute('取消静音无法操作');
    if (result) {
      message.warning(result.message);
      return;
    }
  };

  React.useEffect(() => {
    const controller = new AbortController();
    const handleMute = (event: Event) => {
      const customEvent = event as CustomEvent<{ status: boolean }>;
      const status = customEvent.detail.status;
      setIsMuted(status);
      console.log('静音事件被触发:', status);
    };

    const handleUnMute = (event: Event) => {
      const customEvent = event as CustomEvent<{ status: boolean }>;
      const status = customEvent.detail.status;
      setIsMuted(status);
      console.log('取消静音事件被触发:', status);
    };

    document.addEventListener('mute', handleMute, { signal: controller.signal });
    document.addEventListener('unmute', handleUnMute, { signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, []);

  const handleAddMuteCustomEvent = () => {
    const controller = new AbortController();
    const handleMute = (event: Event) => {
      controller.abort();
      const customEvent = event as CustomEvent<{ status: boolean }>;
      const status = customEvent.detail.status;
      console.log('静音事件handleAddMuteCustomEvent被触发:', status);
    };
    document.addEventListener('mute', handleMute, { signal: controller.signal });
  };

  React.useEffect(() => {
    // const handleBeforeUnload = (event: Event) => {
    //   event.preventDefault();
    //   console.log('页面重载和关闭触发');
    // };
    // window.addEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
        <Button type="text">{average}</Button>
        <Button onClick={handleStopSTT}>StopAndDiscard 录音</Button>
        {/* <Button icon={!isMuted ? <AudioOutlined /> : <AudioMutedOutlined />} onClick={handleToggleMuted}></Button> */}
        <Button
          icon={!isMuted ? <AudioOutlined onClick={handleMuted} /> : <AudioMutedOutlined onClick={handleUnMuted} />}
        ></Button>
        <Button onClick={handleAddMuteCustomEvent}>添加静音事件</Button>
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
      <Divider />
    </>
  );
};
export default SpeechButton;
