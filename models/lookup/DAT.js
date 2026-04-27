// reference: https://moddingwiki.shikadi.net/wiki/Duke_Nukem_3D_Palette_Format
Build.Models.Lookup.DAT = class DAT extends Build.Models.Lookup {

    constructor(bytes) {

        super();

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Swaps = new Array(bytes ? reader.uint8() : 0);

        for (let i = 0; i < this.Swaps.length; i++) {
            this.Swaps[i] = {
                number: reader.uint8(),
                table: new Array(256).fill(0).map(() => reader.uint8())
            };
        }

        this.AlternativePalettes = new Array(bytes ? (bytes.length - reader.index) / (256*3) : 0);

        for (let i = 0; i < this.AlternativePalettes.length; i++) {        
            this.AlternativePalettes[i] = new Array(256).fill(0).map(() => ({
                // scale from 0...64 to 0...256 (DOS limitation)
                r: (reader.uint8() * 255) / 64,
                g: (reader.uint8() * 255) / 64,
                b: (reader.uint8() * 255) / 64
            }));   
        }

    }

    Serialize() {

        const writer = new Build.Scripts.ByteWriter();

        writer.int8(this.Swaps.length);

        for (const swap of this.Swaps) {
            writer.int8(swap.number);
            for (const value of swap.table) {
                writer.int8(value);
            }
        }

        for (const alternativePalette of this.AlternativePalettes) {
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