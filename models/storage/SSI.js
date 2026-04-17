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
        const ssi = new Build.Models.Storage.SSI();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);

        // read file version (1 or 2)
        ssi.Version = reader.uint32();

        // read number of files
        ssi.Files = new Array(reader.uint32());

        // title
        ssi.Title = {
            length: reader.uint8(),
            text: reader.string(32)
        };

        // runfile
        if (ssi.Version === 2) {
            ssi.RunFile = {
                length: reader.uint8(),
                text: reader.string(12)
            };
        }

        // description
        ssi.Description = [];

        for (let i = 0; i < 3; i++) {
            ssi.Description[i] = {
                length: reader.uint8(),
                text: reader.string(70)
            };
        }

        // file names and sizes
        for (let i = 0; i < ssi.Files.length; i++) {
            ssi.Files[i] = {
                length: reader.uint8(),
                name: reader.string(12),
                size: reader.uint32(),
                fill: reader.read(34+1+69), // unknown
                bytes: null
            }
        }

        // file bytes
        for (let i = 0; i < ssi.Files.length; i++) {
            ssi.Files[i].bytes = reader.read(ssi.Files[i].size);
        }

        // return filled object
        return ssi;

    }

    // transform ssi object into byte array
    static Serialize(ssi) {

        // create byte writer
        const writer = new Build.Scripts.ByteWriter();

        // version
        writer.int32(ssi.Version);

        // number of files
        writer.int32(ssi.Files.length);

        // title
        writer.int8(ssi.Title.length);

        // title
        writer.string(ssi.Title.text, 32);

        // runfile
        if (ssi.Version === 2) {
            writer.int8(ssi.RunFile.length);
            writer.string(ssi.RunFile.text, 12);
        }

        // description
        for (let i = 0; i < 3; i++) {
            writer.int8(ssi.Description[i].length);
            writer.string(ssi.Description[i].text, 70);
        }

        // write file names and sizes
        for (let i = 0; i < ssi.Files.length; i++) {
            writer.int8(ssi.Files[i].length);
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