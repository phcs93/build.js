// reference: http://dukertcm.com/knowledge-base/downloads-rtcm/general-tools/unpackssi.zip
Build.Models.Storage.SSI = class SSI extends Build.Models.Storage {

    constructor(bytes) {

        super([]);
        
        const reader = new Build.Scripts.ByteReader(bytes);

        this.Version = bytes ? reader.uint32() : 1;
        this.Files = new Array(bytes ? reader.uint32() : 0);

        this.Title = {
            length: bytes ? reader.uint8() : 0,
            text: bytes ? reader.string(32) : ""
        };

        if (this.Version === 2) {
            this.RunFile = {
                length: bytes ? reader.uint8() : 0,
                text: bytes ? reader.string(12) : ""
            };
        }

        this.Description = [];

        for (let i = 0; i < 3; i++) {
            this.Description[i] = {
                length: bytes ? reader.uint8() : 0,
                text: bytes ? reader.string(70) : ""
            };
        }

        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i] = {
                length: reader.uint8(),
                name: reader.string(12),
                size: reader.uint32(),
                fill: reader.read(34+1+69),
                bytes: null
            }
        }

        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i].bytes = reader.read(this.Files[i].size);
        }
        
    }

    AddFile(name, bytes) {
        this.Files.push({
            length: name.length,
            name: name,
            size: bytes.length,
            fill: new Array(34+1+69).fill(0),
            bytes: bytes
        });
    }

    Serialize() {

        const writer = new Build.Scripts.ByteWriter();

        writer.int32(this.Version);
        writer.int32(this.Files.length);
        writer.int8(this.Title.length);
        writer.string(this.Title.text, 32);

        if (this.Version === 2) {
            writer.int8(this.RunFile.length);
            writer.string(this.RunFile.text, 12);
        }

        for (let i = 0; i < 3; i++) {
            writer.int8(this.Description[i].length);
            writer.string(this.Description[i].text, 70);
        }

        for (let i = 0; i < this.Files.length; i++) {
            writer.int8(this.Files[i].length);
            writer.string(this.Files[i].name, 12);
            writer.int32(this.Files[i].bytes.length);
            writer.write(this.Files[i].fill || new Array(34+1+69).fill(0));
        }

        for (let i = 0; i < this.Files.length; i++) {            
            writer.write(this.Files[i].bytes);
        }

        return writer.bytes;

    }

}