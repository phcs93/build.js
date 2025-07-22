ByteReader = (() => { try { return require("../../scripts/ByteReader.js"); } catch {} } )() ?? ByteReader;
ByteWriter = (() => { try { return require("../../scripts/ByteWriter.js"); } catch {} } )() ?? ByteWriter;

// reference: https://moddingwiki.shikadi.net/wiki/ART_Format_(Build)
class Art {

    // TO-DO => figure out if there is a simpler way to do this (check xduke source code)
    static isolate = (v, s, e) => (v >> s) & (1 << e - s + 1) - 1;
    static attach = (v, s, e, n) => (v & ~(((1 << (e - s + 1)) - 1) << s)) | ((n & ((1 << (e - s + 1)) - 1)) << s);
    
    constructor (bytes) {

        const reader = new ByteReader(bytes);

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
            const animation = reader.uint32();
            this.Tiles[i].animation = {
                frames: Art.isolate(animation, 0, 5) & 0x3F, // uint6
                type: Art.isolate(animation, 6, 7), // int2
                offsetX: (Art.isolate(animation, 8, 15) << 24) >> 24, // int8
                offsetY: (Art.isolate(animation, 16, 23) << 24) >> 24, // int8
                speed: Art.isolate(animation, 24, 27) & 0x0F, // uint4
                unused: Art.isolate(animation, 28, 31) // int4
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

        const writer = new ByteWriter();

        writer.int32(this.Version);
        writer.int32(this.Numtiles);
        writer.int32(this.Start);
        writer.int32(this.End);
        
        for (let i = 0; i < numtiles; i++) {
            writer.int16(this.Tiles[i].pixels.length);
        }

        for (let i = 0; i < numtiles; i++) {
            writer.int16(this.Tiles[i].pixels.length > 0 ? this.Tiles[i].pixels[0].length : 0);
        }        

        for (let i = 0; i < numtiles; i++) {
            let animation = 0;
            animation = Art.attach(animation, 0, 5, this.Tiles[i].animation.frames);
            animation = Art.attach(animation, 6, 7, this.Tiles[i].animation.type);
            animation = Art.attach(animation, 8, 15, this.Tiles[i].animation.offsetX);
            animation = Art.attach(animation, 16, 23, this.Tiles[i].animation.offsetY);
            animation = Art.attach(animation, 24, 27, this.Tiles[i].animation.speed);
            animation = Art.attach(animation, 28, 31, this.Tiles[i].animation.unused);
            writer.int32(animation);
        }

        for (let i = 0; i < numtiles; i++) {
            for (let x = 0; x < this.Tiles[i].pixels.length ; x++) {
                for (let y = 0; y < this.Tiles[i].pixels[x].length; y++) {
                    writer.int8(this.Tiles[i].pixels[x][y]);
                }
            }
        }

        return writer.bytes;

    };

}

try { module.exports = Art; } catch {}