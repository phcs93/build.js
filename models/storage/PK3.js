Build.Models.Storage.PK3 = class PK3 extends Build.Models.Storage {

    // create crc32 table
    static CRC32_TABLE = (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c >>> 0;
        }
        return table;
    })();

    // calculate crc32
    static CRC32(data) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc = PK3.CRC32_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    // create empty pk3 object
    constructor() {
        super();    
    }

    // static async zip(bytes) {
    //     const cs = new CompressionStream("deflate-raw");
    //     const writer = cs.writable.getWriter();
    //     writer.write(bytes);
    //     writer.close();

    //     const buffer = await new Response(cs.readable).arrayBuffer();
    //     return new Uint8Array(buffer);
    // }

    // static async unzip(bytes) {
    //     const ds = new DecompressionStream("deflate-raw");
    //     const writer = ds.writable.getWriter();
    //     writer.write(bytes);
    //     writer.close();

    //     const buffer = await new Response(ds.readable).arrayBuffer();
    //     return new Uint8Array(buffer);
    // }

    // transform byte array into pk3 object
    static Unserialize (bytes) {

        // create empty pk3 object
        const pk3 = new Build.Models.Storage.PK3();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);
        
        pk3.Signature = "PK\x03\x04"; //reader.string(4); // PK\x03\x04
        pk3.Files = [];

        while (reader.index < bytes.length) {

            const sig = reader.uint32();

            if (sig !== 0x04034b50) break;

            const version = reader.uint16();
            const flags = reader.uint16();
            const compression = reader.uint16();
            const time = reader.uint16();
            const date = reader.uint16();
            const crc32 = reader.uint32();
            const compressedSize = reader.uint32();
            const uncompressedSize = reader.uint32();
            const nameLength = reader.uint16();
            const extraLength = reader.uint16();

            const name = reader.string(nameLength);
            reader.index += extraLength;

            let fileBytes = reader.read(compressedSize);            

            if (compression === 8) {
                console.log(`uncompressing ${name} [${compressedSize} bytes]...`);
                fileBytes = (new Build.Scripts.ZLIB.RawInflate(fileBytes)).decompress();
                //fileBytes = await PK3.unzip(fileBytes);
            }

            pk3.Files.push({
                name: name,
                size: fileBytes.length,
                bytes: fileBytes,
                compression: compression
            });

        }

        // return filled pk3 object
        return pk3;

    }

    // transform pk3 into byte array
    static Serialize (pk3) {

        const writer = new Build.Scripts.ByteWriter();
        const centralDirectory = new Build.Scripts.ByteWriter();

        const localOffsets = [];
        let offset = 0;

        for (const i in pk3.Files) {

            const file = pk3.Files[i];

            const nameBytes = new TextEncoder().encode(file.name);

            // CRC32 should be calculated on UNCOMPRESSED bytes
            const crc32 = PK3.CRC32(file.bytes);

            let compressedBytes = file.bytes;

            if (file.compression === 8) {
                console.log(`compressing ${file.name} [${file.bytes.length} bytes]...`);
                compressedBytes = (new Build.Scripts.ZLIB.RawDeflate(compressedBytes)).compress();
                //compressedBytes = await PK3.zip(compressedBytes);
            }

            localOffsets.push(offset);

            // local file header
            writer.int32(pk3.Signature); // signature
            writer.int16(20); // version needed
            writer.int16(0);  // general purpose bit flag
            writer.int16(file.compression); // compression method
            writer.int16(0); // mod time
            writer.int16(0); // mod date
            writer.int32(crc32); 
            writer.int32(compressedBytes.length);
            writer.int32(file.bytes.length);
            writer.int16(nameBytes.length);
            writer.int16(0); // extra field length
            writer.write(nameBytes);
            writer.write(compressedBytes);

            offset = writer.bytes.length;

            // central directory
            centralDirectory.int32(0x02014b50); // central dir sig
            centralDirectory.int16(0x0317); // made by
            centralDirectory.int16(20); // version needed
            centralDirectory.int16(0);  // flags
            centralDirectory.int16(file.compression);
            centralDirectory.int16(0); // mod time
            centralDirectory.int16(0); // mod date
            centralDirectory.int32(crc32); // CRC32 should be calculated on UNCOMPRESSED bytes
            centralDirectory.int32(compressedBytes.length);
            centralDirectory.int32(file.bytes.length);
            centralDirectory.int16(nameBytes.length);
            centralDirectory.int16(0); // extra length
            centralDirectory.int16(0); // comment length
            centralDirectory.int16(0); // disk number start
            centralDirectory.int16(0); // internal attrs
            centralDirectory.int32(0); // external attrs
            centralDirectory.int32(localOffsets[localOffsets.length - 1]); // offset
            centralDirectory.write(nameBytes);

        }

        const centralOffset = writer.bytes.length;
        writer.write(centralDirectory.bytes);
        const centralSize = writer.bytes.length - centralOffset;

        // end of central directory
        writer.int32(0x06054b50);
        writer.int16(0); // disk number
        writer.int16(0); // start disk
        writer.int16(pk3.Files.length);
        writer.int16(pk3.Files.length);
        writer.int32(centralSize);
        writer.int32(centralOffset);
        writer.int16(0); // comment length

        return writer.bytes;

    }

}