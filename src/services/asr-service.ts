import EventEmitter from 'events';
import { Readable } from 'stream';
import { AWSASR } from './aws-asr';

export class ASRService {
    private emitter = new EventEmitter();
    private state = 'None';
    private byteCount = 0;
    private awsASR = new AWSASR(); // Instance of AWSASR for transcription
    private audioStream: Readable  = new Readable({
        read() {},
    });;

    on(event: string, listener: (...args: any[]) => void): ASRService {
        this.emitter?.addListener(event, listener);
        return this;
    }

    getState(): string {
        return this.state;
    }

    async processAudio(data: Uint8Array): Promise<ASRService> {
        if (this.state === 'Complete') {
            this.emitter.emit('error', 'Speech recognition has already completed.');
            return this;
        }

        console.log(`Receiving Uint8Array audio data...`, JSON.stringify({ data }));
        this.byteCount += data.length;

        if (this.byteCount >= 40000) { // If enough data has been accumulated
            this.state = 'Complete';

            // Initialize a Readable stream for the audio data
            // Push the incoming audio data into the stream
            this.audioStream.push(data);
            this.audioStream.push(null); // End the stream

            // Call AWS Transcribe to process the audio stream and get the result
            const transcript = await this.awsASR.transcribeStream(this.audioStream);
            console.log(`Received Tarasncript from  AWS ${transcript}`)
            // Emit the transcription result only after it is processed by AWS Transcribe
            if (transcript) {
                this.emitter.emit('final-transcript', {
                    text: transcript,
                    confidence: 1.0, // You can adjust this based on AWS Transcribe's response
                });
            }

            this.byteCount = 0;
            return this;
        }

        this.state = 'Processing';
        return this;
    }
}

export class Transcript {
    text: string;
    confidence: number;

    constructor(text: string, confidence: number) {
        this.text = text;
        this.confidence = confidence;
    }
}
