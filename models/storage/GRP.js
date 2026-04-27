// reference: https://moddingwiki.shikadi.net/wiki/GRP_Format
Build.Models.Storage.GRP = class GRP extends Build.Models.Storage {

    constructor (bytes) {
        super([]);
        const reader = new Build.Scripts.ByteReader(bytes);
        this.Signature = bytes ? reader.string(12) : "KenSilverman";
        this.Files = new Array(bytes ? reader.uint32() : 0);
        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i] = {
                name: reader.string(12),
                size: reader.uint32(),
                bytes: null
            };
        }
        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i].bytes = reader.read(this.Files[i].size);
        }
    }

    AddFile(name, bytes) {
        this.Files.push({
            name: name,
            size: bytes.length,
            bytes: bytes
        });
    }

    Serialize() {
        const writer = new Build.Scripts.ByteWriter();
        writer.string(this.Signature, 12);
        writer.int32(this.Files.length);        
        for (let i = 0; i < this.Files.length; i++) {
            writer.string(this.Files[i].name, 12);
            writer.int32(this.Files[i].bytes.length);            
        }
        for (let i = 0; i < this.Files.length; i++) {            
            writer.write(this.Files[i].bytes);
        }
        return writer.bytes;
    }

}