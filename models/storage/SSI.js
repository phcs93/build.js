// reference: http://dukertcm.com/knowledge-base/downloads-rtcm/general-tools/unpackssi.zip
Build.Models.Storage.SSI = class SSI {

    constructor (bytes) {

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);

        // read file version (1 or 2)
        this.Version = reader.uint32();

        // read number of files
        this.Files = new Array(reader.uint32());

        // title
        const numcharsTitle = reader.uint8();
        this.Title = reader.string(32).slice(0, numcharsTitle);

        // runfile
        if (this.Version === 2) {
            const numcharsRunFile = reader.uint8();
            this.RunFile = reader.string(12).slice(0, numcharsRunFile);
        }

        // description
        this.Description = [];

        for (let i = 0; i < 3; i++) {
            const numcharsDescription = reader.uint8();
            this.Description[i] = reader.string(70).slice(0, numcharsDescription);
        }

        // read file names and sizes
        for (let i = 0; i < this.Files.length; i++) {
            const numchars = reader.uint8();
            this.Files[i] = {
                name: reader.string(12).slice(0, numchars),
                size: reader.uint32(),
                fill: reader.read(34+1+69), // unknown
                bytes: null
            }
        }

        // read file bytes
        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i].bytes = reader.read(this.Files[i].size);
        }

    }

    // serialize function
    Serialize () {

        // create byte writer
        const writer = new Build.Scripts.ByteWriter(4 + 4 + 1 + 32 + (this.Version === 2 ? 1 + 12 : 0) + 1 + 70 +1 + 70 + 1 + 70 + this.Files.length * (1+12+4+34+1+69) + this.Files.reduce((sum, f) => sum + f.bytes.length, 0));

        // write version
        writer.int32(this.Version);

        // write number of files
        writer.int32(this.Files.length);

        // title length
        writer.int8(this.Title.length);

        // title
        writer.string(this.Title, 32);

        // runfile
        if (this.Version === 2) {
            writer.int8(this.RunFile.length);
            writer.string(this.RunFile, 12);
        }

        // description
        for (let i = 0; i < 3; i++) {
            writer.int8(this.Description[i].length);
            writer.string(this.Description[i], 70);
        }

        // write file names and sizes
        for (let i = 0; i < this.Files.length; i++) {
            writer.int8(this.Files[i].name.length);
            writer.string(this.Files[i].name, 12);
            writer.int32(this.Files[i].bytes.length);
            writer.write(this.Files[i].fill || new Array(34+1+69).fill(0));
        }

        // write file bytes
        for (let i = 0; i < this.Files.length; i++) {            
            writer.write(this.Files[i].bytes);
        }

        // return array of bytes
        return writer.bytes;

    };

}