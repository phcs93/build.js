// reference: https://moddingwiki.shikadi.net/wiki/WAD_Format
Build.Models.Storage.WAD = class WAD extends Build.Models.Storage {

    constructor (bytes) {

        super([]);

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Signature = bytes ? reader.string(4) : "";
        this.Files = new Array(bytes ? reader.int32() : 0);
        this.Offset = bytes ? reader.int32() : 0;

        const headerReader = new Build.Scripts.ByteReader(bytes.slice(this.Offset, this.Offset + this.Files.length * 16));

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
        if (bytes && this.Signature === "IWAD" && this.Files[0].name === "REMOSTRT" && this.Files[this.Files.length-1].name === "REMOSTOP") {
            return new Build.Models.Storage.WAD.RTS(this);
        }

    }

    Serialize () {
        
        const writer = new Build.Scripts.ByteWriter();

        writer.string(this.Signature, 4);
        writer.int32(this.Files.length);
        writer.int32(this.Files.reduce((offset, file) => offset + file.bytes.length, 12));

        for (let i = 0; i < this.Files.length; i++) {
            writer.write(this.Files[i].bytes);
        }

        for (let i = 0; i < this.Files.length; i++) {
            writer.int32(this.Files[i].offset);
            writer.int32(this.Files[i].size);
            writer.string(this.Files[i].name, 8);            
        }

        return writer.bytes;

    }

}