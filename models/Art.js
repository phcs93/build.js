// reference: https://moddingwiki.shikadi.net/wiki/ART_Format_(Build)
Build.Models.Art = class Art {

    // TO-DO => figure out if there is a simpler way to do this (check xduke source code)
    static isolate = (v, s, e) => (v >> s) & (1 << e - s + 1) - 1;
    static attach = (v, s, e, n) => (v & ~(((1 << (e - s + 1)) - 1) << s)) | ((n & ((1 << (e - s + 1)) - 1)) << s);
    
    constructor () {
        this.Version = 1;
        this.Length = 0;
        this.Start = 0;
        this.End = 0;
        this.Tiles = [];
    }

    static Unserialize (bytes) {

        const art = new Art();

        const reader = new Build.Scripts.ByteReader(bytes);

        art.Version = reader.uint32();
        art.Length = reader.uint32();
        art.Start = reader.uint32();
        art.End = reader.uint32();

        const numtiles = art.End - art.Start + 1;

        art.Tiles = new Array(numtiles);

        for (let i = 0; i < numtiles; i++) art.Tiles[i] = {};

        const sizex = [];

        for (let i = 0; i < numtiles; i++) sizex.push(reader.uint16()); 

        const sizey = [];
        
        for (let i = 0; i < numtiles; i++) sizey.push(reader.uint16());
    
        for (let i = 0; i < numtiles; i++) {
            const animation = reader.uint32();
            art.Tiles[i].animation = {
                frames: Art.isolate(animation, 0, 5) & 0x3F, // uint6
                type: Art.isolate(animation, 6, 7), // int2
                offsetX: (Art.isolate(animation, 8, 15) << 24) >> 24, // int8
                offsetY: (Art.isolate(animation, 16, 23) << 24) >> 24, // int8
                speed: Art.isolate(animation, 24, 27) & 0x0F, // uint4
                unused: Art.isolate(animation, 28, 31) // int4
            };
        }

        for (let i = 0; i < numtiles; i++) {
            art.Tiles[i].pixels = [];
            for (let x = 0; x < sizex[i] ; x++) {
                art.Tiles[i].pixels[x] = [];
                for (let y = 0; y < sizey[i]; y++) {
                    art.Tiles[i].pixels[x][y] = reader.uint8();
                }
            }
        }

        return art;

    }

    static Serialize(art) {

        const numtiles = art.End - art.Start + 1

        const writer = new Build.Scripts.ByteWriter(
            4 + // version
            4 + // length (numtiles)
            4 + // start
            4 + // end
            numtiles * 2 + // sizex
            numtiles * 2 + // sizey
            numtiles * 4 + // animations
            art.Tiles.reduce((a, t) => a + (t.pixels && t.pixels.length > 0 ? t.pixels.length * t.pixels[0].length : 0), 0) * 1 // pixels
        );

        writer.int32(art.Version);
        writer.int32(art.End - art.Start + 1);
        writer.int32(art.Start);
        writer.int32(art.End);
        
        for (let i = 0; i < art.Tiles.length; i++) {
            writer.int16(art.Tiles[i].pixels.length);
        }

        for (let i = 0; i < art.Tiles.length; i++) {
            writer.int16(art.Tiles[i].pixels.length > 0 ? art.Tiles[i].pixels[0].length : 0);
        }        

        for (let i = 0; i < art.Tiles.length; i++) {
            let animation = 0;
            animation = Art.attach(animation, 0, 5, art.Tiles[i].animation.frames);
            animation = Art.attach(animation, 6, 7, art.Tiles[i].animation.type);
            animation = Art.attach(animation, 8, 15, art.Tiles[i].animation.offsetX);
            animation = Art.attach(animation, 16, 23, art.Tiles[i].animation.offsetY);
            animation = Art.attach(animation, 24, 27, art.Tiles[i].animation.speed);
            animation = Art.attach(animation, 28, 31, art.Tiles[i].animation.unused);
            writer.int32(animation);
        }

        for (let i = 0; i < art.Tiles.length; i++) {
            for (let x = 0; x < art.Tiles[i].pixels.length ; x++) {
                for (let y = 0; y < art.Tiles[i].pixels[x].length; y++) {
                    writer.int8(art.Tiles[i].pixels[x][y]);
                }
            }
        }

        return writer.bytes;

    };

}