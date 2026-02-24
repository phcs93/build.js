// reference: https://moddingwiki.shikadi.net/wiki/GRP_Format
Build.Models.Storage.GRP = class GRP extends Build.Models.Storage {

    // header sizes
    static HeaderSize = 16;
    static FileHeaderSize = 16;

    // create empty grp object
    constructor () {
        super();
        this.Signature = "KenSilverman";
        this.Files = [];
    }

    // transforms byte array into grp object
    static Unserialize (bytes) {

        // create empty grp object
        const grp = new GRP();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);

        // read ken silverman signature
        grp.Signature = reader.string(12);

        // read number of files
        grp.Files = new Array(reader.uint32());

        // read file names and sizes
        for (let i = 0; i < grp.Files.length; i++) {
            grp.Files[i] = {
                name: reader.string(12),
                size: reader.uint32(),
                bytes: null
            };
        }

        // read file bytes
        for (let i = 0; i < grp.Files.length; i++) {
            grp.Files[i].bytes = reader.read(grp.Files[i].size);
        }

        // return filled grp object
        return grp;

    }

    // transforms grp object into byte array
    static Serialize (grp) {

        // create byte writer
        const writer = new Build.Scripts.ByteWriter(
            GRP.HeaderSize + 
            grp.Files.length * GRP.FileHeaderSize + 
            grp.Files.reduce((sum, f) => sum + f.bytes.length, 0)
        );

        // write ken silverman string
        writer.string(grp.Signature, 12);

        // write number of files
        writer.int32(grp.Files.length);
        
        // write file names and sizes
        for (let i = 0; i < grp.Files.length; i++) {

            // name
            writer.string(grp.Files[i].name, 12);

            // size
            writer.int32(grp.Files[i].bytes.length);
            
        }

        // write file bytes
        for (let i = 0; i < grp.Files.length; i++) {            
            writer.write(grp.Files[i].bytes);
        }

        // return array of bytes
        return writer.bytes;

    }

}