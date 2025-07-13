ByteReader = (() => { try { return require("../scripts/ByteReader.js"); } catch {} } )() ?? ByteReader;
ByteWriter = (() => { try { return require("../scripts/ByteWriter.js"); } catch {} } )() ?? ByteWriter;

// dn3d / sw / rr
function GRP (bytes) {

    // create byte reader
    const reader = new ByteReader(bytes);

    // read ken silverman signature
    this.Signature = reader.readString(12);

    // read number of files
    this.Files = new Array(reader.uint32());

    // read file names and sizes
    for (let i = 0; i < this.Files.length; i++) {
        this.Files[i] = {
            name: reader.readString(12),
            size: reader.uint32(),
            bytes: null
        }
    }

    // read file bytes
    for (let i = 0; i < this.Files.length; i++) {
        this.Files[i].bytes = reader.read(this.Files[i].size);
    }

    // serialize function
    this.Serialize = () => {

        // create byte writer
        const writer = new ByteWriter(12 + 4 + this.Files.length * 12 + this.Files.length * 4 + this.Files.reduce((sum, f) => sum + f.size, 0));

        // write ken silverman string
        writer.writeString(this.Signature);

        // write number of files
        writer.int32(this.Files.length);

        // write file names and sizes
        for (let i = 0; i < this.Files.length; i++) {

            // name
            writer.writeString(this.Files[i].name.padEnd(12, '\0').slice(0, 12));

            // size
            writer.int32(this.Files[i].size);
            
        }

        // write file bytes
        for (let i = 0; i < this.Files.length; i++) {            
            writer.write(this.Files[i].bytes);
        }

        // return array of bytes
        return writer.bytes;

    };

}

try { module.exports = GRP; } catch {}