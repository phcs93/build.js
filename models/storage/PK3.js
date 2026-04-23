Build.Models.Storage.PK3 = class PK3 extends Build.Models.Storage {

    // private crc32 dictionary to compressed file bytes
    // this is an optimization both for performance 
    // and for unit testing roundtrip equality
    #OriginalCompressedBytes = {};

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

    // static async zipRaw (data) {
    //     const cs = new CompressionStream("deflate-raw");
    //     const writer = cs.writable.getWriter();
    //     await writer.write(data);
    //     await writer.close();
    //     const buffer = await new Response(cs.readable).arrayBuffer();
    //     return new Uint8Array(buffer);
    // }

    // static async unzipRaw (data) {
    //     const ds = new DecompressionStream("deflate-raw");
    //     const writer = ds.writable.getWriter();
    //     await writer.write(data);
    //     await writer.close();
    //     const buffer = await new Response(ds.readable).arrayBuffer();
    //     return new Uint8Array(buffer);
    // }

    static async unzipRaw(bytes) {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    static async zipRaw(bytes) {
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    // create empty pk3 object
    constructor() {
        super();    
        this.Files = [];
    }

    // transform byte array into pk3 object
    static async Unserialize (bytes) {

        // create empty pk3 object
        const pk3 = new Build.Models.Storage.PK3();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);

        console.log(`reading pk3 files, this may take a minute...`);

        while (reader.index < bytes.length) {

            // if next 4 bytes aren't a pk3 signature -> exit
            if (String.fromCharCode(...bytes.slice(reader.index, reader.index + 4)) !== "PK\x03\x04") break;

            pk3.Files.push({
                signature: reader.string(4),
                version: reader.uint16(),
                flags: reader.uint16(),
                compression: reader.uint16(),
                time: reader.uint16(),
                date: reader.uint16(),
                crc32: reader.uint32(),
                compressedSize: reader.uint32(),
                uncompressedSize: reader.uint32(),
                nameLength: reader.uint16(),
                extraLength: reader.uint16(),
                name: "",
                extra: [],
                bytes: []
            });

            const i = pk3.Files.length - 1;

            pk3.Files[i].name = reader.string(pk3.Files[i].nameLength);
            pk3.Files[i].extra = reader.read(pk3.Files[i].extraLength);
            pk3.Files[i].bytes = reader.read(pk3.Files[i].compressedSize);

            // check if file needs to be uncompressed
            if (pk3.Files[i].compression === 8) {                
                // backup original compressed bytes for reuse latter if needed
                pk3.#OriginalCompressedBytes[pk3.Files[i].crc32] = pk3.Files[i].bytes;
                // uncompress file bytes
                pk3.Files[i].bytes = await PK3.unzipRaw(pk3.Files[i].bytes);
            }

        }

        console.log(`done reading pk3 files!`);

        // keep "garbage" at the end of file (central directory?)
        pk3.Garbage = reader.read(bytes.length - reader.index);

        // return filled pk3 object
        return pk3;

    }

    // transform pk3 into byte array
    static async Serialize (pk3) {

        const writer = new Build.Scripts.ByteWriter();

        console.log(`writing pk3 files, this may take a minute...`);

        for (const i in pk3.Files) {

            const file = pk3.Files[i];

            let compressedBytes = file.bytes;

            if (file.compression === 8) {
                // generate crc32 for current uncompressed file bytes
                const newcrc = PK3.CRC32(file.bytes);
                // compare crc32 of original file with new file
                if (newcrc !== file.crc32) {
                    // log
                    console.log(`compressing ${file.name} [${file.bytes.length} bytes]...`);
                    // if crc is different -> compress new file
                    compressedBytes = await PK3.zipRaw(compressedBytes);
                    // update crc
                    file.crc32 = newcrc;
                    // update compressedSize
                    file.compressedSize = compressedBytes.length;
                } else {
                    // if crc is equal -> just reuse original compressed file bytes both for performance and for unit testing roundtrip equality
                    compressedBytes = pk3.#OriginalCompressedBytes[file.crc32];
                }
            }

            writer.string(file.signature, 4);
            writer.int16(file.version);
            writer.int16(file.flags);
            writer.int16(file.compression);
            writer.int16(file.time);
            writer.int16(file.date);
            writer.int32(file.crc32);
            writer.int32(file.compressedSize);
            writer.int32(file.bytes.length);
            writer.int16(file.name.length);
            writer.int16(file.extra.length);
            writer.string(file.name, file.name.length);
            writer.write(file.extra);
            writer.write(compressedBytes);

        }

        console.log(`done writing pk3 files!`);

        // write back "garbage" at the end (central directory?)
        writer.write(pk3.Garbage);

        return writer.bytes;

    }

}