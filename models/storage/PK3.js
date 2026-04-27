Build.Models.Storage.PK3 = class PK3 extends Build.Models.Storage {

    // private crc32 dictionary to compressed file bytes
    // this is an optimization both for performance 
    // and to preserve roundtrip equality for unit testing
    #OriginalCompressedBytes = {};

    constructor(bytes) {

        super([]);

        const reader = new Build.Scripts.ByteReader(bytes);

        console.log(`reading pk3 files, this may take a minute...`);        

        this.Files = [];

        while (!bytes && reader.index < bytes.length) {

            // if next 4 bytes aren't a pk3 signature -> exit
            if (String.fromCharCode(...bytes.slice(reader.index, reader.index + 4)) !== "PK\x03\x04") break;

            this.Files.push({
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

            const i = this.Files.length - 1;

            this.Files[i].name = reader.string(this.Files[i].nameLength);
            this.Files[i].extra = reader.read(this.Files[i].extraLength);
            this.Files[i].bytes = reader.read(this.Files[i].compressedSize);

            // check if file needs to be uncompressed
            if (this.Files[i].compression === 8) {                
                // backup original compressed bytes for reuse latter if needed
                this.#OriginalCompressedBytes[this.Files[i].crc32] = this.Files[i].bytes;
                // uncompress file bytes
                this.Files[i].bytes = new Uint8Array(Build.Scripts.FFlate.inflateSync(this.Files[i].bytes));
            }

        }

        console.log(`done reading pk3 files!`);

        // keep "garbage" at the end of file (central directory?)
        this.Garbage = bytes ? reader.read(bytes.length - reader.index) : [];

    }

    Serialize () {

        const writer = new Build.Scripts.ByteWriter();

        console.log(`writing pk3 files, this may take a minute...`);

        for (const i in this.Files) {

            const file = this.Files[i];

            let compressedBytes = file.bytes;

            if (file.compression === 8) {
                // generate crc32 for current uncompressed file bytes
                const newcrc = Build.Scripts.CRC32.Compute(file.bytes);
                // compare crc32 of original file with new file
                if (newcrc !== file.crc32) {
                    // log
                    console.log(`compressing ${file.name} [${file.bytes.length} bytes]...`);
                    // if crc is different -> compress new file
                    compressedBytes = new Uint8Array(Build.Scripts.FFlate.deflateSync(compressedBytes));
                    // update crc
                    file.crc32 = newcrc;
                    // update compressedSize
                    file.compressedSize = compressedBytes.length;
                } else {
                    // if crc is equal -> just reuse original compressed file bytes
                    compressedBytes = this.#OriginalCompressedBytes[file.crc32];
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
        writer.write(this.Garbage);

        return writer.bytes;

    }

}