import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/volc-asr-batch";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/interview/transcribe
// Input: FormData with:
//   audio: Blob (audio/webm, audio/mp4, audio/wav, etc)
//   mimeType: string (optional, for logging)
// Output: { text: string }
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const mimeType = formData.get("mimeType") as string | null;

    if (!audio) {
      return NextResponse.json({ error: "audio required" }, { status: 400 });
    }

    // audio can be File (extends Blob) or Blob
    if (!(audio instanceof Blob)) {
      return NextResponse.json({ error: "audio required" }, { status: 400 });
    }

    if (mimeType) {
      console.log("[transcribe] mimeType:", mimeType, "size:", audio.size);
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());

    // Too short to recognize (~0.1s threshold)
    if (audioBuffer.byteLength < 3000) {
      return NextResponse.json({ text: "" });
    }

    const text = await transcribeAudio(audioBuffer, mimeType ?? undefined);
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[transcribe] error:", err);
    return NextResponse.json(
      { error: "transcription failed" },
      { status: 500 }
    );
  }
}
