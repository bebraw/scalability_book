import { Buffer } from "node:buffer";

type ZipEntry = {
  data: Uint8Array;
  name: string;
};

const crc32Table = createCrc32Table();
const utf8Flag = 0x0800;
const minimumDosDate = 0x0021;

export function createStoredZip(entries: readonly ZipEntry[]): Buffer {
  const localRecords: Buffer[] = [];
  const centralRecords: Buffer[] = [];
  const names = new Set<string>();
  let localOffset = 0;

  for (const entry of [...entries].sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const normalizedName = normalizeEntryName(entry.name);

    if (!normalizedName || names.has(normalizedName)) {
      throw new Error(`Invalid or duplicate ZIP entry: ${entry.name}`);
    }

    names.add(normalizedName);
    const name = Buffer.from(normalizedName, "utf8");
    const data = Buffer.from(entry.data);
    const checksum = crc32(data);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(utf8Flag, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(minimumDosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const centralHeader = Buffer.alloc(46);

    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(utf8Flag, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(minimumDosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(localOffset, 42);

    localRecords.push(localHeader, name, data);
    centralRecords.push(centralHeader, name);
    localOffset += localHeader.length + name.length + data.length;
  }

  if (entries.length > 0xffff) {
    throw new Error("ZIP64 archives are not supported");
  }

  const centralDirectory = Buffer.concat(centralRecords);
  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localRecords, centralDirectory, end]);
}

function normalizeEntryName(name: string): string {
  return name.replaceAll("\\", "/").replace(/^\/+/, "");
}

function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
}

function crc32(data: Uint8Array): number {
  let checksum = 0xffffffff;

  for (const byte of data) {
    checksum = (crc32Table[(checksum ^ byte) & 0xff] ?? 0) ^ (checksum >>> 8);
  }

  return (checksum ^ 0xffffffff) >>> 0;
}
