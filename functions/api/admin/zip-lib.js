// Leitor mínimo de .zip (sem zip64) para o envio de e-mail: lista as entradas e extrai uma.
// Métodos aceitos: 0 (guardado) e 8 (deflate), este via DecompressionStream("deflate-raw").
export function listarZip(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error("zip inválido (fim do arquivo não encontrado)");
  const total = dv.getUint16(eocd + 10, true), offCD = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder("utf-8"), out = []; let p = offCD;
  for (let n = 0; n < total; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("zip inválido (diretório corrompido)");
    const flag = dv.getUint16(p + 8, true), metodo = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
    const ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const nome = dec.decode(u8.subarray(p + 46, p + 46 + ln));
    out.push({ nome, metodo, csize, usize, off, cifrado: !!(flag & 1), pasta: nome.endsWith("/") });
    p += 46 + ln + le + lc;
  }
  return out;
}
export async function extrairZip(u8, e) {
  if (e.cifrado) throw new Error("zip com senha não é suportado");
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(e.off, true) !== 0x04034b50) throw new Error("zip inválido (entrada corrompida)");
  const ini = e.off + 30 + dv.getUint16(e.off + 26, true) + dv.getUint16(e.off + 28, true);
  const dados = u8.subarray(ini, ini + e.csize);
  if (e.metodo === 0) return dados;
  if (e.metodo !== 8) throw new Error("método de compressão não suportado: " + e.metodo);
  const ds = new DecompressionStream("deflate-raw");
  const w = ds.writable.getWriter(); w.write(dados); w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}
