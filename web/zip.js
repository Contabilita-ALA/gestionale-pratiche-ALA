// Archivio .zip minimo nel browser (file memorizzati senza compressione: i PDF sono già compressi)
const TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (d) => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = TAB[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function creaZip(file) {
  const parti = []; const centrale = []; let offset = 0;
  const ora = new Date();
  const dosOra = (ora.getHours() << 11) | (ora.getMinutes() << 5) | Math.floor(ora.getSeconds() / 2);
  const dosData = ((ora.getFullYear() - 1980) << 9) | ((ora.getMonth() + 1) << 5) | ora.getDate();
  for (const f of file) {
    const nome = new TextEncoder().encode(f.nome);
    const dati = f.dati instanceof Uint8Array ? f.dati : new Uint8Array(f.dati);
    const crc = crc32(dati);
    const t = new DataView(new ArrayBuffer(30));
    t.setUint32(0, 0x04034b50, true); t.setUint16(4, 20, true); t.setUint16(6, 0x0800, true); t.setUint16(8, 0, true);
    t.setUint16(10, dosOra, true); t.setUint16(12, dosData, true); t.setUint32(14, crc, true);
    t.setUint32(18, dati.length, true); t.setUint32(22, dati.length, true); t.setUint16(26, nome.length, true);
    parti.push(new Uint8Array(t.buffer), nome, dati);
    const v = new DataView(new ArrayBuffer(46));
    v.setUint32(0, 0x02014b50, true); v.setUint16(4, 20, true); v.setUint16(6, 20, true); v.setUint16(8, 0x0800, true); v.setUint16(10, 0, true);
    v.setUint16(12, dosOra, true); v.setUint16(14, dosData, true); v.setUint32(16, crc, true);
    v.setUint32(20, dati.length, true); v.setUint32(24, dati.length, true); v.setUint16(28, nome.length, true); v.setUint32(42, offset, true);
    centrale.push(new Uint8Array(v.buffer), nome);
    offset += 30 + nome.length + dati.length;
  }
  const dim = centrale.reduce((n, b) => n + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, file.length, true); e.setUint16(10, file.length, true); e.setUint32(12, dim, true); e.setUint32(16, offset, true);
  return new Blob([...parti, ...centrale, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
