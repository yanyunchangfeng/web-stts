import { axios } from "src/utils/request";
import { TTSData } from "src/shared";

export const tts = async (data: TTSData): Promise<string> => {
  return axios.post("/dev/text2voice", data);
};
