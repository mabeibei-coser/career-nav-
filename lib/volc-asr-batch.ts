import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * 将非 WAV 音频（webm/mp4 等）通过 ffmpeg 转为 16kHz 单声道 WAV。
 * 火山 ASR flash 端点只稳定支持 wav/mp3 等格式，不支持 webm/opus。
 */
async function convertToWav(inputBuffer: Buffer, ext: string): Promise<Buffer> {
  const id = randomUUID().slice(0, 8);
  const inputPath = join(tmpdir(), `asr-in-${id}.${ext}`);
  const outputPath = join(tmpdir(), `asr-out-${id}.wav`);

  await writeFile(inputPath, inputBuffer);

  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        'ffmpeg',
        ['-i', inputPath, '-ar', '16000', '-ac', '1', '-f', 'wav', '-y', outputPath],
        { timeout: 15_000 },
        (error, _stdout, stderr) => {
          if (error) {
            console.error('[volc-asr] ffmpeg error:', stderr?.slice(-200));
            reject(error);
          } else {
            resolve();
          }
        },
      );
    });
    return await readFile(outputPath);
  } finally {
    unlink(inputPath).catch(() => {});
    unlink(outputPath).catch(() => {});
  }
}

/**
 * 根据 mimeType 推断文件扩展名
 */
function extFromMime(mime: string): string {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'mp4';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mp3') || mime.includes('mpeg')) return 'mp3';
  return 'webm'; // 默认按 webm 处理
}

/**
 * Transcribe audio using Volcano batch ASR flash endpoint.
 * Non-WAV audio (webm, mp4, etc.) is auto-converted to WAV via ffmpeg.
 *
 * @param audioBuffer - raw audio bytes
 * @param mimeType    - e.g. "audio/webm;codecs=opus", "audio/mp4"
 * @returns recognized text string, or "" if transcription fails
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType?: string,
): Promise<string> {
  const appKey = process.env.VOLC_TTS_APP_KEY;
  const accessKey = process.env.VOLC_TTS_ACCESS_KEY;
  const resourceId = process.env.VOLC_ASR_RESOURCE_ID || 'volc.bigasr.auc_turbo';

  if (!appKey || !accessKey) {
    console.error('[volc-asr-batch] Missing VOLC_TTS_APP_KEY or VOLC_TTS_ACCESS_KEY');
    return '';
  }

  // 非 WAV/MP3 格式需要先转码
  const mime = (mimeType ?? '').toLowerCase();
  let finalBuffer = audioBuffer;

  if (mime && !mime.includes('wav') && !mime.includes('mp3')) {
    const ext = extFromMime(mime);
    console.log(`[volc-asr] converting ${ext} (${audioBuffer.length} bytes) → wav via ffmpeg`);
    try {
      finalBuffer = await convertToWav(audioBuffer, ext);
      console.log(`[volc-asr] converted to wav: ${finalBuffer.length} bytes`);
    } catch (e) {
      console.error('[volc-asr] ffmpeg conversion failed:', e);
      return '';
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(
      'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-App-Key': appKey,
          'X-Api-Access-Key': accessKey,
          'X-Api-Resource-Id': resourceId,
          'X-Api-Request-Id': randomUUID(),
          'X-Api-Sequence': '-1',
        },
        body: JSON.stringify({
          user: { uid: randomUUID() },
          audio: { data: finalBuffer.toString('base64') },
          request: { model_name: 'bigmodel' },
        }),
        signal: controller.signal,
      },
    );

    const data = await response.json();

    if (data?.result?.text) {
      return data.result.text as string;
    }

    if (data?.header?.code !== undefined) {
      console.error('[volc-asr-batch] API error:', data.header.code, data.header.message);
    } else {
      console.error('[volc-asr-batch] Unexpected response:', JSON.stringify(data).slice(0, 300));
    }

    return '';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[volc-asr-batch] Request timed out after 20s');
    } else {
      console.error('[volc-asr-batch] Request failed:', err);
    }
    return '';
  } finally {
    clearTimeout(timeoutId);
  }
}
