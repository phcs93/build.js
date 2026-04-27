// reference: https://moddingwiki.shikadi.net/wiki/ART_Format_(Build)
Build.Models.Art = class Art {
    
    constructor (bytes) {

        const reader = new Build.Scripts.ByteReader(bytes);

        // check for ion fury signature
        if (String.fromCharCode(...bytes.slice(0, 8)) === "BUILDART") {
            this.Signature = reader.string(8);
            console.log("Reading Ion Fury ART, this may take a while...");
        }

        this.Version = reader.uint32();
        this.Length = reader.uint32();
        this.Start = reader.uint32();
        this.End = reader.uint32();

        const numtiles = this.End - this.Start + 1;

        this.Tiles = new Array(numtiles);

        for (let i = 0; i < numtiles; i++) this.Tiles[i] = {};

        const sizex = [];

        for (let i = 0; i < numtiles; i++) sizex.push(reader.uint16()); 

        const sizey = [];
        
        for (let i = 0; i < numtiles; i++) sizey.push(reader.uint16());
    
        for (let i = 0; i < numtiles; i++) {
            const bitreader = new Build.Scripts.BitReader(reader.uint32());
            this.Tiles[i].animation = {
                frames: bitreader.uint(6),
                type: bitreader.uint(2),
                offsetX: bitreader.int(8),
                offsetY: bitreader.int(8),
                speed: bitreader.uint(4),
                unused: bitreader.uint(4)
            };
        }

        for (let i = 0; i < numtiles; i++) {
            this.Tiles[i].pixels = [];
            for (let x = 0; x < sizex[i] ; x++) {
                this.Tiles[i].pixels[x] = [];
                for (let y = 0; y < sizey[i]; y++) {
                    this.Tiles[i].pixels[x][y] = reader.uint8();
                }
            }
        }

    }

    Serialize() {

        const numtiles = this.End - this.Start + 1

        const writer = new Build.Scripts.ByteWriter();

        // check for ion fury signature
        if (this.Signature) {
            writer.string(this.Signature, this.Signature.length);
            console.log("Writing Ion Fury ART, this may take a while...");
        }

        writer.int32(this.Version);
        writer.int32(this.Length);
        writer.int32(this.Start);
        writer.int32(this.End);
        
        for (let i = 0; i < this.Tiles.length; i++) {
            writer.int16(this.Tiles[i].pixels.length);
        }

        for (let i = 0; i < this.Tiles.length; i++) {
            writer.int16(this.Tiles[i].pixels.length > 0 ? this.Tiles[i].pixels[0].length : 0);
        }        

        for (let i = 0; i < this.Tiles.length; i++) {
            const bitwriter = new Build.Scripts.BitWriter();
            bitwriter.uint(6, this.Tiles[i].animation.frames);
            bitwriter.uint(2, this.Tiles[i].animation.type);
            bitwriter.int(8, this.Tiles[i].animation.offsetX);
            bitwriter.int(8, this.Tiles[i].animation.offsetY);
            bitwriter.uint(4, this.Tiles[i].animation.speed);
            bitwriter.uint(4, this.Tiles[i].animation.unused);
            writer.int32(bitwriter.value);
        }

        for (let i = 0; i < this.Tiles.length; i++) {
            for (let x = 0; x < this.Tiles[i].pixels.length ; x++) {
                for (let y = 0; y < this.Tiles[i].pixels[x].length; y++) {
                    writer.int8(this.Tiles[i].pixels[x][y]);
                }
            }
        }

        return writer.bytes;

    }

}