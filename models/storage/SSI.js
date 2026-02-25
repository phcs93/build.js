// reference: http://dukertcm.com/knowledge-base/downloads-rtcm/general-tools/unpackssi.zip
Build.Models.Storage.SSI = class SSI extends Build.Models.Storage {

    constructor() {
        super();
        this.Version = 0;
        this.Files = [];
        this.Title = "";
        this.RunFile = "";
        this.Description = [];
    }

    // transform byte array into ssi object
    static Unserialize(bytes) {

        // create empty ssi object
        const ssi = new SSI();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);

        // read file version (1 or 2)
        ssi.Version = reader.uint32();

        // read number of files
        ssi.Files = new Array(reader.uint32());

        // title
        const numcharsTitle = reader.uint8();
        ssi.Title = reader.string(32).slice(0, numcharsTitle);

        // runfile
        if (ssi.Version === 2) {
            const numcharsRunFile = reader.uint8();
            ssi.RunFile = reader.string(12).slice(0, numcharsRunFile);
        }

        // description
        ssi.Description = [];

        for (let i = 0; i < 3; i++) {
            const numcharsDescription = reader.uint8();
            ssi.Description[i] = reader.string(70).slice(0, numcharsDescription);
        }

        // read file names and sizes
        for (let i = 0; i < ssi.Files.length; i++) {
            const numchars = reader.uint8();
            ssi.Files[i] = {
                name: reader.string(12).slice(0, numchars),
                size: reader.uint32(),
                fill: reader.read(34+1+69), // unknown
                bytes: null
            }
        }

        // read file bytes
        for (let i = 0; i < ssi.Files.length; i++) {
            ssi.Files[i].bytes = reader.read(ssi.Files[i].size);
        }

        // return filled object
        return ssi;

    }

    // transform ssi object into byte array
    static Serialize(ssi) {

        // create byte writer
        const writer = new Build.Scripts.ByteWriter(4 +
            4 +
            1 +
            32 +
            (ssi.Version === 2 ? 1 + 12 : 0) + 
            1 + 
            70 +
            1 + 
            70 + 
            1 + 
            70 + 
            ssi.Files.length * (1+12+4+34+1+69) + 
            ssi.Files.reduce((sum, f) => sum + f.bytes.length, 0)
        );

        // write version
        writer.int32(ssi.Version);

        // write number of files
        writer.int32(ssi.Files.length);

        // title length
        writer.int8(ssi.Title.length);

        // title
        writer.string(ssi.Title, 32);

        // runfile
        if (ssi.Version === 2) {
            writer.int8(ssi.RunFile.length);
            writer.string(ssi.RunFile, 12);
        }

        // description
        for (let i = 0; i < 3; i++) {
            writer.int8(ssi.Description[i].length);
            writer.string(ssi.Description[i], 70);
        }

        // write file names and sizes
        for (let i = 0; i < ssi.Files.length; i++) {
            writer.int8(ssi.Files[i].name.length);
            writer.string(ssi.Files[i].name, 12);
            writer.int32(ssi.Files[i].bytes.length);
            writer.write(ssi.Files[i].fill || new Array(34+1+69).fill(0));
        }

        // write file bytes
        for (let i = 0; i < ssi.Files.length; i++) {            
            writer.write(ssi.Files[i].bytes);
        }

        // return array of bytes
        return writer.bytes;

    };

}