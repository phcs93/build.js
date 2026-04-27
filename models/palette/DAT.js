// reference: https://moddingwiki.shikadi.net/wiki/Duke_Nukem_3D_Palette_Format
Build.Models.Palette.DAT = class DAT extends Build.Models.Palette {

    constructor(bytes) {

        super();

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Colors = new Array(256).fill({ r: 0, g: 0, b: 0 });

        if (bytes) {
            for (let i = 0; i < this.Colors.length; i++) {
                this.Colors[i] = {
                    // scale from 0...64 to 0...256 (DOS limitation)
                    r: (reader.uint8() * 255) / 64,
                    g: (reader.uint8() * 255) / 64,
                    b: (reader.uint8() * 255) / 64
                };
            }
        }

        this.Shades = new Array(bytes ? reader.uint16() : 0).fill(new Array(256).fill(0));

        for (let i = 0; i < this.Shades.length; i++) {
            this.Shades[i] = new Array(256).fill(0).map(() => reader.uint8());
        }
        
        this.Translucency = new Array(256).fill(new Array(256).fill(0));

        if (bytes) {
            for (let i = 0; i < this.Translucency.length; i++) {
                this.Translucency[i] = new Array(256).fill(0).map(() => reader.uint8());
            }
        }

        // if there is extra data at the end, it's gargabe from dn3d pallete.dat
        if (bytes && reader.index < bytes.length && bytes.length - reader.index >= 32 * 256) {
            this.Garbage = new Array(32).fill(null).map(() => new Array(256).fill(0).map(() => reader.uint8()));
        }

    }

    Serialize() {

        const writer = new Build.Scripts.ByteWriter();

        for (const color of this.Colors) {
            // scale from 0...256 to 0...64 (DOS limitation)
            writer.int8(Math.round((color.r * 64) / 255));
            writer.int8(Math.round((color.g * 64) / 255));
            writer.int8(Math.round((color.b * 64) / 255));
        }

        writer.int16(this.Shades.length);

        for (const shade of this.Shades) {
            for (const value of shade) {
                writer.int8(value);
            }
        }

        for (const translucency of this.Translucency) {
            for (const value of translucency) {
                writer.int8(value);
            }
        }

        // write garbage back if it is there
        if (this.Garbage) {
            for (const garbage of this.Garbage) {
                for (const value of garbage) {
                    writer.int8(value);
                }
            }
        }

        return writer.bytes;

    }

}