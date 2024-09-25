import { TTSVoice } from 'src/shared';
export interface TTSData {
  text: string;
  voc: `${TTSVoice}`;
  lang?: string;
}
export interface SpeechResult {
  interimContent: string;
  finalContent: string;
  confidence: number;
}
export interface SpeakResultProps {
  code: number;
  message: string;
}
export type SpeakResult = SpeakResultProps | void;
