import { Request } from 'express';
import { SecretService } from '../services/secret-service';
import {
    queryCanonicalizedHeaderField, VerifyResult,
    verifySignature,
    withFailure
} from './signature-verifier';

export function verifyRequestSignature(request: Request, secretService: SecretService): Promise<VerifyResult> {
    return verifyRequestSignatureImpl(request, secretService);
}

async function verifyRequestSignatureImpl(request: Request, secretService: SecretService): Promise<VerifyResult> {
    console.log(`Headers are ${JSON.stringify(request.headers)}`)
    const apiKey = queryCanonicalizedHeaderField(request.headers, 'x-api-key');

    if (!apiKey) {
        return withFailure('PRECONDITION', 'Missing "X-API-KEY" header field');
    }
    console.log(`apiKey is valid!!!`)
    const result = await verifySignature({
        headerFields: request.headers,
        requiredComponents: [
            '@request-target',
            '@authority',
            'audiohook-organization-id',
            'audiohook-session-id',
            'audiohook-correlation-id',
            'x-api-key'
        ],
        maxSignatureAge: 10,
        derivedComponentLookup: (name) => {
            if (name === '@request-target') {
                return request.url ?? null;
            }
            return null;
        },
        keyResolver: async (parameters) => {
            if (!parameters.nonce) {
                return withFailure('PRECONDITION', 'Missing "nonce" signature parameter');
            } else if (parameters.nonce.length < 22) {
                return withFailure('PRECONDITION', 'Provided "nonce" signature parameter is too small');
            }

            const keyId = parameters.keyid;
            console.log(`Key Id is ----`,keyId)
            console.log(`API KEy Id is ----`,apiKey)
            if (keyId !== apiKey) {
                return withFailure('PRECONDITION', 'X-API-KEY header field and signature keyid mismatch');
            }

            const secret = secretService.getSecretForKey(keyId);
            const code = secret ? 'GOODKEY' : 'BADKEY';
            console.log(`secret is ${secret} and code is ${code}` );
            return {
                code: code,
                key: secret
            };
        }
    });

    if (result.code === 'UNSIGNED') {
        return { code: 'VERIFIED' };
    }

    return result;
}