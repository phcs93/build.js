// reference: https://moddingwiki.shikadi.net/wiki/Duke_Nukem_3D_Palette_Format
Build.Models.Lookup.DAT = class DAT extends Build.Models.Lookup {

    constructor() {
        super();
        this.Swaps = new Array(0).fill({
            number: 0, 
            table:  new Array(256).fill(0)
        });
        this.AlternativePalettes = new Array(0).fill(new Array(256).fill({r: 0, g: 0, b: 0}));
    }

    static Unserialize(bytes) {

        const reader = new Build.Scripts.ByteReader(bytes);

        const dat = new Build.Models.Lookup.DAT();

        dat.Swaps = new Array(reader.uint8());

        for (let i = 0; i < dat.Swaps.length; i++) {        
            dat.Swaps[i] = {
                number: reader.uint8(),
                table: new Array(256).fill(0).map(() => reader.uint8())
            };
        }

        dat.AlternativePalettes = new Array((bytes.length - reader.index) / (256*3));

        for (let i = 0; i < dat.AlternativePalettes.length; i++) {        
            dat.AlternativePalettes[i] = new Array(256).fill(0).map(() => ({
                // scale from 0...64 to 0...256 (DOS limitation)
                r: (reader.uint8() * 255) / 64,
                g: (reader.uint8() * 255) / 64,
                b: (reader.uint8() * 255) / 64
            }));   
        }

        return dat;

    }

    static Serialize(dat) {

        const writer = new Build.Scripts.ByteWriter();

        writer.int8(dat.Swaps.length);

        for (const swap of dat.Swaps) {
            writer.int8(swap.number);
            for (const value of swap.table) {
                writer.int8(value);
            }
        }

        for (const alternativePalette of dat.AlternativePalettes) {
            for (const color of alternativePalette) {
                // scale from 0...256 to 0...64 (DOS limitation)
                writer.int8(Math.round((color.r * 64) / 255));
                writer.int8(Math.round((color.g * 64) / 255));
                writer.int8(Math.round((color.b * 64) / 255));
            }
        }

        return writer.bytes;

    };

}