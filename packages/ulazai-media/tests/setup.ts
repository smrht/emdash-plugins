import process from 'node:process';
// @ts-expect-error cloudflare:test is a virtual module provided by the test pool.
import {env} from 'cloudflare:test';
// Public fixture key; the database and runner are isolated to this test suite.
const key='emdash_enc_v1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
process.env.EMDASH_ENCRYPTION_KEY=key;
(env as unknown as Record<string,unknown>).EMDASH_ENCRYPTION_KEY=key;
