Build.Models.Storage.PK3 = class PK3 extends Build.Models.Storage {

    // private crc32 dictionary to compressed file bytes
    // this is an optimization both for performance 
    // and to preserve roundtrip equality for unit testing
    #OriginalCompressedBytes = {};

    constructor(bytes) {

        super([]);

        const reader = new Build.Scripts.ByteReader(bytes);    

        this.Files = [];

        console.log("Reading PK3 file, this may take a while...");

        while (bytes && reader.index < bytes.length) {

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

        // keep "garbage" at the end of file (central directory?)
        this.Garbage = bytes ? reader.read(bytes.length - reader.index) : [];

    }

    AddFile(name, bytes) {
        this.Files.push({
            signature: "PK\x03\x04",
            version: 20,
            flags: 0,
            compression: 8, // always compress? sounds good to me...
            time: 0, // will se set in Serialize
            date: 0, // will be set in Serialize
            crc32: 0, // will be set in Serialize
            compressedSize: 0, // will be set in Serialize
            uncompressedSize: bytes.length,
            nameLength: name.length,
            extraLength: 0,
            name: name,
            extra: [],
            bytes: bytes
        });
    }

    Serialize () {

        const writer = new Build.Scripts.ByteWriter();

        console.log("Writing PK3 file, this may take a while...");

        for (const i in this.Files) {

            const file = this.Files[i];

            const crc32 = Build.Scripts.CRC32.Compute(file.bytes);

            let date = 0;
            let time = 0;
            let compressedBytes = file.bytes;            

            if (file.compression === 8) {
                // check if crc is not present in dictionary
                if (!this.#OriginalCompressedBytes[crc32]) {
                    // if crc is not present in original bytes dictionary -> compress file bytes
                    compressedBytes = new Uint8Array(Build.Scripts.FFlate.deflateSync(compressedBytes));
                    // also set new date and time
                    ({ date, time } = Build.Scripts.DateTime.EncodeDosDateTime(new Date()));
                } else {
                    // if crc is present -> just reuse original compressed file bytes
                    compressedBytes = this.#OriginalCompressedBytes[crc32];
                }
            }

            writer.string(file.signature, 4);
            writer.int16(file.version);
            writer.int16(file.flags);
            writer.int16(file.compression);
            writer.int16(file.time);
            writer.int16(file.date);
            writer.int32(crc32);
            writer.int32(compressedBytes.length);
            writer.int32(file.bytes.length);
            writer.int16(file.name.length);
            writer.int16(file.extra.length);
            writer.string(file.name, file.name.length);
            writer.write(file.extra);
            writer.write(compressedBytes);

        }

        // write back "garbage" at the end (central directory?)
        writer.write(this.Garbage);

        return writer.bytes;

    }

}