import { StartStreamTranscriptionCommand, TranscribeStreamingClient } from "@aws-sdk/client-transcribe-streaming";
import { Readable } from "stream";

export class AWSASR {
    private transcribeClient: TranscribeStreamingClient;

    constructor() {
        this.transcribeClient = new TranscribeStreamingClient({
            region: "us-east-1", // Specify your region here
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,  // Ensure AWS credentials are in the environment variables
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });
    }

    // Method to start the transcription process
    async transcribeStream(audioStream: Readable): Promise<string | undefined> {
        const command = new StartStreamTranscriptionCommand({
            LanguageCode: "en-US", // Language of the audio stream
            MediaEncoding: "pcm", // Audio format: pcm (Pulse Code Modulation)
            MediaSampleRateHertz: 8000, // Sample rate (8kHz for low-bitrate audio)
            AudioStream: this.getAudioStream(audioStream), // Get the audio stream
        });

        const response = await this.transcribeClient.send(command);
        let transcript:string|undefined ;

        // Listen for transcription results
        for await (const event of response.TranscriptResultStream ?? []) {
            if ("TranscriptEvent" in event) {
                transcript = event.TranscriptEvent?.Transcript?.Results?.[0]?.Alternatives?.[0]?.Transcript;
                if (transcript) {
                    console.log("AWS Transcribe:", transcript);
                }
            }
        }

        return transcript;
    }

    // Convert the Readable audio stream into an async generator to be compatible with AWS Transcribe
    private getAudioStream(audioStream: Readable): AsyncGenerator<{ AudioEvent: { AudioChunk: Uint8Array } }> {
        return (async function* () {
            for await (const chunk of audioStream) {
                yield { AudioEvent: { AudioChunk: chunk } };
            }
        })();
    }
}
