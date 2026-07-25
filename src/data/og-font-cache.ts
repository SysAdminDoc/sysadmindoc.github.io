import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join } from 'node:path';

export const MIN_FONT_BYTES = 16 * 1024;
export const MAX_FONT_BYTES = 10 * 1024 * 1024;

const fontSignatures = [
  Buffer.from([0x00, 0x01, 0x00, 0x00]),
  Buffer.from('OTTO'),
  Buffer.from('wOFF'),
  Buffer.from('wOF2'),
];

type FontFetchResponse = {
  ok: boolean;
  status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type FontFetcher = (url: string) => Promise<FontFetchResponse>;

export function bufferToExactArrayBuffer(buffer: Buffer): ArrayBuffer {
  return new Uint8Array(buffer).buffer;
}

export function validateFontBuffer(buffer: Buffer, label = 'font'): void {
  if (buffer.byteLength < MIN_FONT_BYTES || buffer.byteLength > MAX_FONT_BYTES) {
    throw new Error(
      `Invalid ${label}: ${buffer.byteLength} bytes is outside ${MIN_FONT_BYTES}-${MAX_FONT_BYTES}.`,
    );
  }
  if (!fontSignatures.some((signature) => buffer.subarray(0, signature.length).equals(signature))) {
    throw new Error(`Invalid ${label}: unsupported font signature.`);
  }
}

export function readValidCachedFont(cachePath: string): Buffer | null {
  if (!existsSync(cachePath)) return null;
  const buffer = readFileSync(cachePath);
  try {
    validateFontBuffer(buffer, `cached OG font ${basename(cachePath)}`);
    return buffer;
  } catch {
    unlinkSync(cachePath);
    return null;
  }
}

export function writeFontAtomically(cachePath: string, buffer: Buffer): Buffer {
  validateFontBuffer(buffer, `downloaded OG font ${basename(cachePath)}`);
  mkdirSync(dirname(cachePath), { recursive: true });
  const tempPath = join(
    dirname(cachePath),
    `.${basename(cachePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let descriptor: number | null = null;

  try {
    descriptor = openSync(tempPath, 'wx');
    writeFileSync(descriptor, buffer);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;
    renameSync(tempPath, cachePath);
    return buffer;
  } catch (error) {
    if (descriptor !== null) {
      closeSync(descriptor);
      descriptor = null;
    }
    const concurrentWinner = readValidCachedFont(cachePath);
    if (concurrentWinner) return concurrentWinner;
    throw error;
  } finally {
    if (descriptor !== null) closeSync(descriptor);
    if (existsSync(tempPath)) unlinkSync(tempPath);
  }
}

export async function loadCachedFont(
  cachePath: string,
  url: string,
  fetcher: FontFetcher = fetch,
): Promise<ArrayBuffer> {
  const cached = readValidCachedFont(cachePath);
  if (cached) return bufferToExactArrayBuffer(cached);

  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Font fetch failed: ${response.status}`);
  const downloaded = Buffer.from(await response.arrayBuffer());
  const stored = writeFontAtomically(cachePath, downloaded);
  return bufferToExactArrayBuffer(stored);
}
