// Pure JS UTF-8 encoding for Hermes/Expo as well as web. No Blob, File,
// FormData, Node Buffer, or optional TextEncoder polyfill is required.
export function encodeUtf8(text) {
  const bytes = new Uint8Array(text.length * 3);
  let offset = 0;
  for (const character of text) {
    let point = character.codePointAt(0);
    if (point >= 0xD800 && point <= 0xDFFF) point = 0xFFFD;
    if (point < 0x80) bytes[offset++] = point;
    else if (point < 0x800) {
      bytes[offset++] = 0xC0 | (point >> 6);
      bytes[offset++] = 0x80 | (point & 0x3F);
    } else if (point < 0x10000) {
      bytes[offset++] = 0xE0 | (point >> 12);
      bytes[offset++] = 0x80 | ((point >> 6) & 0x3F);
      bytes[offset++] = 0x80 | (point & 0x3F);
    } else {
      bytes[offset++] = 0xF0 | (point >> 18);
      bytes[offset++] = 0x80 | ((point >> 12) & 0x3F);
      bytes[offset++] = 0x80 | ((point >> 6) & 0x3F);
      bytes[offset++] = 0x80 | (point & 0x3F);
    }
  }
  return bytes.slice(0, offset).buffer;
}
