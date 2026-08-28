// reference: https://moddingwiki.shikadi.net/wiki/WAD_Format
Build.Models.Storage.WAD = class WAD extends Build.Models.Storage {

    constructor (bytes) {

        super([]);

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Signature = bytes ? reader.string(4) : "";
        this.Files = new Array(bytes ? reader.int32() : 0);
        this.Offset = bytes ? reader.int32() : 0;

        const headerReader = new Build.Scripts.ByteReader(bytes ? bytes.slice(this.Offset, this.Offset + this.Files.length * 16) : []);

        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i] = {
                offset: headerReader.int32(),
                size: headerReader.int32(),
                name: headerReader.string(8),
                bytes: []
            };
        }

        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i].bytes = bytes.slice(
                this.Files[i].offset, 
                this.Files[i].offset + this.Files[i].size
            );
        }

        // check if this WAD is a RTS so we can convert it to the correct model
        if (bytes && this.Signature === "IWAD" && this.Files.length && this.Files[0].name === "REMOSTRT" && this.Files[this.Files.length-1].name === "REMOSTOP") {
            return new Build.Models.Storage.WAD.RTS(this);
        }

    }

    Serialize () {

        /*

        const writer = new Build.Scripts.ByteWriter();

        writer.string(this.Signature, 4);
        writer.int32(this.Files.length);
        writer.int32(this.Files.reduce((offset, file) => offset + file.bytes.length, 12));

        for (let i = 0; i < this.Files.length; i++) {
            writer.write(this.Files[i].bytes);
        }

        let offset = 12;

        for (let i = 0; i < this.Files.length; i++) {
            writer.int32(offset);
            writer.int32(this.Files[i].bytes.length);
            writer.string(this.Files[i].name, 8);
            offset += this.Files[i].bytes.length;
        }

        return writer.bytes;

        */

        // AI solution (not a fan)
        
        const writer = new Build.Scripts.ByteWriter();

        const directorySize = this.Files.length * 16;
        const dataSize = this.Files.reduce((size, file) => size + file.bytes.length, 0);
        const firstDataOffset = this.Files.filter(file => file.bytes.length).reduce((offset, file) => Math.min(offset, file.offset), Infinity);
        const directoryFirst = this.Files.length === 0 || this.Offset <= firstDataOffset;
        const directoryOffset = directoryFirst ? 12 : 12 + dataSize;
        const dataOffset = directoryFirst ? 12 + directorySize : 12;

        writer.string(this.Signature, 4);
        writer.int32(this.Files.length);
        writer.int32(directoryOffset);

        const writeDirectory = () => {
            let offset = dataOffset;
            for (const file of this.Files) {
                writer.int32(file.bytes.length ? offset : file.offset);
                writer.int32(file.bytes.length);
                writer.string(file.name, 8);
                offset += file.bytes.length;
            }
        };

        if (directoryFirst) writeDirectory();
        for (const file of this.Files) writer.write(file.bytes);
        if (!directoryFirst) writeDirectory();

        return writer.bytes;

    }

}