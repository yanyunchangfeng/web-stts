import { axios } from 'src/utils/request';
import { TTSData } from 'src/shared';

class VoiceFusionRequestService {
  async supconTTS(data: TTSData): Promise<string> {
    return axios.post('/dev/text2voice', data);
  }
  async supconSTT(data: FormData) {
    return axios.post('/dev/voice2text', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
  async tts(data: TTSData): Promise<string> {
    return axios.post(
      '/msService/chatcustomer/audio/web/tts',
      // '/dev/text2voice',
      data
    );
  }
  async stt(data: FormData) {
    return axios.post(
      // '/msService/chatcustomer/audio/web/stt',
      '/msService/chatcustomer/audio/web/audio2Text',
      data,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
  }
}

export const voiceFusionRequestService = new VoiceFusionRequestService();
