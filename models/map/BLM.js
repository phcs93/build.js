ByteReader = (() => { try { return require("../scripts/ByteReader.js"); } catch {} } )() ?? ByteReader;
ByteWriter = (() => { try { return require("../scripts/ByteWriter.js"); } catch {} } )() ?? ByteWriter;

// reference: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp
class BLM {

    static newKey = 0x7474614D; // 'ttaM' signature
    static oldKey = 0x4D617474; // 'Matt' signature

    static headerSize = 37;
    static extraHeaderSize = 128;

    static SectorSize = 40;
    static WallSize = 32;
    static SpriteSize = 44;

    static XSectorSize = 60;
    static XSpriteSize = 56;
    static XWallSize = 24;

    // reference: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L203
    static decrypt = (bytes, key) => {

        const output = Uint8Array.from(bytes);

        for (let i = 0; i < bytes.length; i++) {
            output[i] ^= key;
            key++;
        }

        return output;

    };

    // we can use the same algorithm since the encryption is symmetrical
    static encrypt = (bytes, key) => BLM.decrypt(bytes, key);

    constructor(bytes) {

        // create byte reader
        const reader = new ByteReader(bytes);

        // read BLM\x1a signature
        this.Signature = reader.string(4);
        
        // read map version
        this.Version = reader.int16();

        // version flag?
        this.byte1A76C8 = (this.Version & 0xff00) === 0x700;
        this.byte1A76C7 = false;
        this.byte1A76C6 = false;

        // read header bytes
        let headerBytes = reader.read(BLM.headerSize);

        // get int32 key (where the "song id" would be)
        this.at16 = (headerBytes[23] << 0) | (headerBytes[24] << 8) | (headerBytes[25] << 16) | (headerBytes[26] << 24);

        // check if decryption is needed
        if (this.at16 !== 0 && this.at16 !== BLM.newKey && this.at16 !== BLM.oldKey) {

            // decrypt header bytes
            headerBytes = BLM.decrypt(headerBytes, BLM.newKey);

            // ecryption flag?
            this.byte1A76C7 = true;

        }

        // create header reader
        const headerReader = new ByteReader(headerBytes);

        // read map header
        this.X = headerReader.int32();
        this.Y = headerReader.int32();
        this.Z = headerReader.int32();
        this.A = headerReader.int16();
        this.S = headerReader.int16();
        this.SkyBits = headerReader.int16();
        this.Visibility = headerReader.int32();
        this.Song = headerReader.int32();
        this.Parallax = headerReader.int8();
        this.Revision = headerReader.int32();

        // get number of structs
        this.Sectors = new Array(headerReader.uint16());
        this.Walls = new Array(headerReader.uint16());
        this.Sprites = new Array(headerReader.uint16());

        // another flag?
        if (this.byte1A76C8) {
            if (this.at16 === BLM.newKey || this.at16 === BLM.oldKey) {                
                this.byte1A76C6 = true;
            } else if (!this.at16) {
                this.byte1A76C6 = false;
            }
        }

        // read extra flags header
        if (this.byte1A76C8) {
            const extraReader = new ByteReader(BLM.decrypt(reader.read(BLM.extraHeaderSize), this.Walls.length));
            this.XPadStart = extraReader.read(64);
            this.XSectorSize = extraReader.uint32();
            this.XWallSize = extraReader.uint32();
            this.XSpriteSize = extraReader.uint32();
            this.XPadEnd = extraReader.read(52);
        }

        // sky offsets
        this.SkyOffsets = new Array((1 << this.SkyBits));

        // read sky bytes (read 2 bytes per offset because it is a int16 array)
        let skyBytes = reader.read(this.SkyOffsets.length * 2);

        // check if sky bytes needs to be decrypted
        if (this.byte1A76C8) {

            // decrypt sky bytes
            skyBytes = BLM.decrypt(skyBytes, this.SkyOffsets.length * 2);

        }

        // read sky offsets (int16 array)
        for (let i = 0; i < this.SkyOffsets.length; i++) {
            this.SkyOffsets[i] = skyBytes[i*2] << 0 | skyBytes[(i*2)+1] << 8;
        }

        // read sectors
        for (let i = 0; i < this.Sectors.length; i++) {

            // read sector bytes
            let sectorBytes = reader.read(BLM.SectorSize);

            // check if sector bytes needs to be decrypted
            if (this.byte1A76C8) {

                // decrypt sector bytes
                sectorBytes = BLM.decrypt(sectorBytes, this.Revision * BLM.SectorSize);

            }

            // creater sector reader
            const sectorReader = new ByteReader(sectorBytes);

            // read sector struct
            this.Sectors[i] = {
                wallptr: sectorReader.int16(),
                wallnum: sectorReader.int16(),
                ceilingz: sectorReader.int32(),
                floorz: sectorReader.int32(),
                ceilingstat: sectorReader.int16(),
                floorstat: sectorReader.int16(),
                ceilingpicnum: sectorReader.int16(),
                ceilingheinum: sectorReader.int16(),
                ceilingshade: sectorReader.int8(),
                ceilingpal: sectorReader.uint8(),
                ceilingxpanning: sectorReader.uint8(),
                ceilingypanning: sectorReader.uint8(),
                floorpicnum: sectorReader.int16(),
                floorheinum: sectorReader.int16(),
                floorshade: sectorReader.int8(),
                floorpal: sectorReader.uint8(),
                floorxpanning: sectorReader.uint8(),
                floorypanning: sectorReader.uint8(),
                visibility: sectorReader.uint8(),
                filler: sectorReader.uint8(),
                lotag: sectorReader.int16(),
                hitag: sectorReader.int16(),
                extra: sectorReader.int16()
            };

            // check if sector extra needs to be read
            if (this.Sectors[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                this.Sectors[i].xsector = reader.read(this.byte1A76C8 ? this.XSectorSize : BLM.XSectorSize);

            }

        }

        // read walls
        for (let i = 0; i < this.Walls.length; i++) {

            // read wall bytes
            let wallBytes = reader.read(BLM.WallSize);

            // check if wall bytes needs to be decrypted
            if (this.byte1A76C8) {

                // decrypt wall bytes
                wallBytes = BLM.decrypt(wallBytes, this.Revision * BLM.WallSize);

            }

            // creater wall reader
            const wallReader = new ByteReader(wallBytes);

            // read wall struct
            this.Walls[i] = {
                x: wallReader.int32(),
                y: wallReader.int32(),
                point2: wallReader.int16(),
                nextwall: wallReader.int16(),
                nextsector: wallReader.int16(),
                cstat: wallReader.int16(),
                picnum: wallReader.int16(),
                overpicnum: wallReader.int16(),
                shade: wallReader.int8(),
                pal: wallReader.uint8(),
                xrepeat: wallReader.uint8(),
                yrepeat: wallReader.uint8(),
                xpanning: wallReader.uint8(),
                ypanning: wallReader.uint8(),
                lotag: wallReader.int16(),
                hitag: wallReader.int16(),
                extra: wallReader.int16()
            };

            // check if wall extra needs to be read
            if (this.Walls[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1973
                this.Walls[i].xwall = reader.read(this.byte1A76C8 ? this.XWallSize : BLM.XWallSize);

            }

        }

        // read sprites
        for (let i = 0; i < this.Sprites.length; i++) {

            // read sprite bytes
            let spriteBytes = reader.read(BLM.SpriteSize);

            // check if sprite bytes needs to be decrypted
            if (this.byte1A76C8) {

                // decrypt sprite bytes
                spriteBytes = BLM.decrypt(spriteBytes, this.Revision * BLM.SpriteSize);

            }

            // creater sprite reader
            const spriteReader = new ByteReader(spriteBytes);

            // read wall struct
            this.Sprites[i] = {
                x: spriteReader.int32(),
                y: spriteReader.int32(),
                z: spriteReader.int32(),
                cstat: spriteReader.int16(),
                picnum: spriteReader.int16(),
                shade: spriteReader.int8(),
                pal: spriteReader.uint8(),
                clipdist: spriteReader.uint8(),
                filler: spriteReader.uint8(),
                xrepeat: spriteReader.uint8(),
                yrepeat: spriteReader.uint8(),
                xoffset: spriteReader.int8(),
                yoffset: spriteReader.int8(),
                sectnum: spriteReader.int16(),
                statnum: spriteReader.int16(),
                ang: spriteReader.int16(),
                owner: spriteReader.int16(),
                xvel: spriteReader.int16(),
                yvel: spriteReader.int16(),
                zvel: spriteReader.int16(),
                lotag: spriteReader.int16(),
                hitag: spriteReader.int16(),
                extra: spriteReader.int16()
            };

            // check if sprite extra needs to be read
            if (this.Sprites[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L2060
                this.Sprites[i].xsprite = reader.read(this.byte1A76C8 ? this.XSpriteSize : BLM.XSpriteSize);

            }

        }

    }

    Serialize () {

        // create byte writer
        const writer = new ByteWriter(
            4+2+
            BLM.headerSize+
            BLM.extraHeaderSize+
            this.SkyOffsets.length*2+
            this.Sectors.length*BLM.SectorSize+
            this.Sectors.filter(s => s.extra > 0).length*(this.byte1A76C8 ? this.XSectorSize : BLM.XSectorSize)+
            this.Walls.length*BLM.WallSize+
            this.Walls.filter(w => w.extra > 0).length*(this.byte1A76C8 ? this.XWallSize : BLM.XWallSize)+
            this.Sprites.length*BLM.SpriteSize+
            this.Sprites.filter(s => s.extra > 0).length*(this.byte1A76C8 ? this.XSpriteSize : BLM.XSpriteSize)
        );

        // write BLM\x1a signature
        writer.string(this.Signature, 4);
        
        // write map version
        writer.int16(this.Version);

        // create header writer
        const headerWriter = new ByteWriter(BLM.headerSize);

        // write map header bytes to local writer
        headerWriter.int32(this.X);
        headerWriter.int32(this.Y);
        headerWriter.int32(this.Z);
        headerWriter.int16(this.A);
        headerWriter.int16(this.S);
        headerWriter.int16(this.SkyBits);
        headerWriter.int32(this.Visibility);
        headerWriter.int32(this.Song);
        headerWriter.int8(this.Parallax);
        headerWriter.int32(this.Revision);
        headerWriter.int16(this.Sectors.length);
        headerWriter.int16(this.Walls.length);
        headerWriter.int16(this.Sprites.length);

        // check if header bytes needs to be encrypted
        if (this.byte1A76C7) {

            // encrypt header bytes
            headerWriter.bytes = BLM.encrypt(headerWriter.bytes, BLM.newKey);

        }

        // write header bytes
        writer.write(headerWriter.bytes);

        // write extra flags header
        if (this.byte1A76C8) {
            const extraWriter = new ByteWriter(BLM.extraHeaderSize);
            extraWriter.write(this.XPadStart); // 64
            extraWriter.int32(this.XSectorSize);
            extraWriter.int32(this.XWallSize);
            extraWriter.int32(this.XSpriteSize);
            extraWriter.write(this.XPadEnd); // 52
            writer.write(BLM.encrypt(extraWriter.bytes, this.Walls.length));
        }

        // create sky writer
        const skyWriter = new ByteWriter(this.SkyOffsets.length * 2);

        // write sky bytes to local writer
        for (let i = 0; i < this.SkyOffsets.length; i++) {
            skyWriter.int16(this.SkyOffsets[i]);            
        }

        // check if sky bytes needs to be encrypted
        if (this.byte1A76C8) {

            // decrypt sky bytes
            skyWriter.bytes = BLM.encrypt(skyWriter.bytes, this.SkyOffsets.length * 2);

        }

        // write sky bytes
        writer.write(skyWriter.bytes);

        // write sectors
        for (let i = 0; i < this.Sectors.length; i++) {

            const sectorWriter = new ByteWriter(BLM.SectorSize);

            // write sector struct
            sectorWriter.int16(this.Sectors[i].wallptr);
            sectorWriter.int16(this.Sectors[i].wallnum);
            sectorWriter.int32(this.Sectors[i].ceilingz);
            sectorWriter.int32(this.Sectors[i].floorz);
            sectorWriter.int16(this.Sectors[i].ceilingstat);
            sectorWriter.int16(this.Sectors[i].floorstat);
            sectorWriter.int16(this.Sectors[i].ceilingpicnum);
            sectorWriter.int16(this.Sectors[i].ceilingheinum);
            sectorWriter.int8(this.Sectors[i].ceilingshade);
            sectorWriter.int8(this.Sectors[i].ceilingpal);
            sectorWriter.int8(this.Sectors[i].ceilingxpanning);
            sectorWriter.int8(this.Sectors[i].ceilingypanning);
            sectorWriter.int16(this.Sectors[i].floorpicnum);
            sectorWriter.int16(this.Sectors[i].floorheinum);
            sectorWriter.int8(this.Sectors[i].floorshade);
            sectorWriter.int8(this.Sectors[i].floorpal);
            sectorWriter.int8(this.Sectors[i].floorxpanning);
            sectorWriter.int8(this.Sectors[i].floorypanning);
            sectorWriter.int8(this.Sectors[i].visibility);
            sectorWriter.int8(this.Sectors[i].filler);
            sectorWriter.int16(this.Sectors[i].lotag);
            sectorWriter.int16(this.Sectors[i].hitag);
            sectorWriter.int16(this.Sectors[i].extra);

            // check if sector extra needs to be written
            if (this.Sectors[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(this.Sectors[i].xsector);

            }

            // check if sector bytes needs to be decrypted
            if (this.byte1A76C8) {

                // encrypt sector bytes
                sectorWriter.bytes = BLM.encrypt(sectorWriter.bytes, this.Revision * BLM.SectorSize);

            }

            // write sector bytes
            writer.write(sectorWriter.bytes);

        }

        // write walls
        for (let i = 0; i < this.Walls.length; i++) {

            const wallWriter = new ByteWriter(BLM.WallSize);

            // write wall struct
            wallWriter.int32(this.Walls[i].x);
            wallWriter.int32(this.Walls[i].y);
            wallWriter.int16(this.Walls[i].point2);
            wallWriter.int16(this.Walls[i].nextwall);
            wallWriter.int16(this.Walls[i].nextsector);
            wallWriter.int16(this.Walls[i].cstat);
            wallWriter.int16(this.Walls[i].picnum);
            wallWriter.int16(this.Walls[i].overpicnum);
            wallWriter.int8(this.Walls[i].shade);
            wallWriter.int8(this.Walls[i].pal);
            wallWriter.int8(this.Walls[i].xrepeat);
            wallWriter.int8(this.Walls[i].yrepeat);
            wallWriter.int8(this.Walls[i].xpanning);
            wallWriter.int8(this.Walls[i].ypanning);
            wallWriter.int16(this.Walls[i].lotag);
            wallWriter.int16(this.Walls[i].hitag);
            wallWriter.int16(this.Walls[i].extra);

            // check if wall extra needs to be written
            if (this.Walls[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(this.Walls[i].xwall);

            }

            // check if wall bytes needs to be decrypted
            if (this.byte1A76C8) {

                // encrypt wall bytes
                wallWriter.bytes = BLM.encrypt(wallWriter.bytes, this.Revision * BLM.WallSize);

            }

            // write wall bytes
            writer.write(wallWriter.bytes);

        }

        // write sprites
        for (let i = 0; i < this.Sprites.length; i++) {

            const spriteWriter = new ByteWriter(BLM.SpriteSize);

            // write sprite struct
            spriteWriter.int32(this.Sprites[i].x);
            spriteWriter.int32(this.Sprites[i].y);
            spriteWriter.int32(this.Sprites[i].z);
            spriteWriter.int16(this.Sprites[i].cstat);
            spriteWriter.int16(this.Sprites[i].picnum);
            spriteWriter.int8(this.Sprites[i].shade);
            spriteWriter.int8(this.Sprites[i].pal);
            spriteWriter.int8(this.Sprites[i].clipdist);
            spriteWriter.int8(this.Sprites[i].filler);
            spriteWriter.int8(this.Sprites[i].xrepeat);
            spriteWriter.int8(this.Sprites[i].yrepeat);
            spriteWriter.int8(this.Sprites[i].xoffset);
            spriteWriter.int8(this.Sprites[i].yoffset);
            spriteWriter.int16(this.Sprites[i].sectnum);
            spriteWriter.int16(this.Sprites[i].statnum);
            spriteWriter.int16(this.Sprites[i].ang);
            spriteWriter.int16(this.Sprites[i].owner);
            spriteWriter.int16(this.Sprites[i].xvel);
            spriteWriter.int16(this.Sprites[i].yvel);
            spriteWriter.int16(this.Sprites[i].zvel);
            spriteWriter.int16(this.Sprites[i].lotag);
            spriteWriter.int16(this.Sprites[i].hitag);
            spriteWriter.int16(this.Sprites[i].extra);

            // check if sprite extra needs to be written
            if (this.Sprites[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(this.Sprites[i].xsprite);

            }

            // check if sprite bytes needs to be decrypted
            if (this.byte1A76C8) {

                // encrypt sprite bytes
                spriteWriter.bytes = BLM.encrypt(spriteWriter.bytes, this.Revision * BLM.SpriteSize);

            }

            // write sprite bytes
            writer.write(spriteWriter.bytes);

        }
        
        // return map bytes
        return writer.bytes;

    }

}

try { module.exports = BLM; } catch {}