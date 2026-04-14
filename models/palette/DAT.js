// reference: https://moddingwiki.shikadi.net/wiki/Duke_Nukem_3D_Palette_Format
Build.Models.Palette.DAT = class DAT {

    constructor() {
        this.Colors = new Array(256).fill({ r: 0, g: 0, b: 0 });
        this.Shades = new Array(0).fill(new Array(256).fill(0));
        this.Translucency = new Array(256).fill(new Array(256).fill(0));
    }

    static Unserialize(bytes) {

        const reader = new Build.Scripts.ByteReader(bytes);

        const dat = new Build.Models.Palette.DAT();

        for (let i = 0; i < dat.Colors.length; i++) {
            dat.Colors[i] = {
                // scale from 0...64 to 0...256 (DOS limitation)
                r: (reader.uint8() * 255) / 64,
                g: (reader.uint8() * 255) / 64,
                b: (reader.uint8() * 255) / 64
            };
        }

        dat.Shades = new Array(reader.uint16());

        for (let i = 0; i < dat.Shades.length; i++) {
            dat.Shades[i] = new Array(256).fill(0).map(() => reader.uint8());
        }

        for (let i = 0; i < dat.Translucency.length; i++) {
            dat.Translucency[i] = new Array(256).fill(0).map(() => reader.uint8());
        }

        // if there is extra data at the end, it's gargabe from dn3d pallete.dat
        if (reader.index < bytes.length && bytes.length - reader.index >= 32 * 256) {
            dat.Garbage = new Array(32).fill(null).map(() => new Array(256).fill(0).map(() => reader.uint8()));
        }

        return dat;

    }

    static Serialize(dat) {

        const writer = new Build.Scripts.ByteWriter();

        for (const color of dat.Colors) {
            // scale from 0...256 to 0...64 (DOS limitation)
            writer.int8(Math.round((color.r * 64) / 255));
            writer.int8(Math.round((color.g * 64) / 255));
            writer.int8(Math.round((color.b * 64) / 255));
        }

        writer.int16(dat.Shades.length);

        for (const shade of dat.Shades) {
            for (const value of shade) {
                writer.int8(value);
            }
        }

        for (const translucency of dat.Translucency) {
            for (const value of translucency) {
                writer.int8(value);
            }
        }

        // write garbage back if it is there
        if (dat.Garbage) {
            for (const garbage of dat.Garbage) {
                for (const value of garbage) {
                    writer.int8(value);
                }
            }
        }

        return writer.bytes;

    };

}