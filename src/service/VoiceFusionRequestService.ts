import { axios } from 'src/utils/request';
import { TTSData } from 'src/shared';

class VoiceFusionRequestService {
  async tts(data: TTSData): Promise<string> {
    return axios.post('/dev/text2voice', data);
  }
  async stt(data: FormData) {
    return axios.post('/dev/voice2text', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
}

export const voiceFusionRequestService = new VoiceFusionRequestService();
