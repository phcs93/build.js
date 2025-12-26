ByteReader = (() => { try { return require("../../scripts/ByteReader.js"); } catch {} } )() ?? ByteReader;
ByteWriter = (() => { try { return require("../../scripts/ByteWriter.js"); } catch {} } )() ?? ByteWriter;

// reference: https://moddingwiki.shikadi.net/wiki/GRP_Format
class GRP {

    // sizes
    static HeaderSize = 16;
    static FileHeaderSize = 16;

    constructor (bytes) {

        // create byte reader
        const reader = new ByteReader(bytes);

        // read ken silverman signature
        this.Signature = reader.string(12);

        // read number of files
        this.Files = new Array(reader.uint32());

        // read file names and sizes
        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i] = {
                name: reader.string(12),
                size: reader.uint32(),
                bytes: null
            }
        }

        // read file bytes
        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i].bytes = reader.read(this.Files[i].size);
        }

    }

    Serialize () {

        // create byte writer
        const writer = new ByteWriter(
            GRP.HeaderSize + 
            this.Files.length * GRP.FileHeaderSize + 
            this.Files.reduce((sum, f) => sum + f.bytes.length, 0)
        );

        // write ken silverman string
        writer.string(this.Signature, 12);

        // write number of files
        writer.int32(this.Files.length);
        
        // write file names and sizes
        for (let i = 0; i < this.Files.length; i++) {

            // name
            writer.string(this.Files[i].name, 12);

            // size
            writer.int32(this.Files[i].bytes.length);
            
        }

        // write file bytes
        for (let i = 0; i < this.Files.length; i++) {            
            writer.write(this.Files[i].bytes);
        }

        // return array of bytes
        return writer.bytes;

    }

}

try { module.exports = GRP; } catch {}