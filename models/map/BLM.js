// reference: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp
Build.Models.Map.BLM = class BLM extends Build.Models.Map {

    static NewKey = 0x7474614D; // 'ttaM' signature
    static OldKey = 0x4D617474; // 'Matt' signature

    static HeaderSize = 37;
    static ExtraHeaderSize = 128;

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

    // create empty map object
    constructor () {
        super();
        this.Signature = "BLM\x1a";
        this.Version = 0;
        this.X = 0;
        this.Y = 0;
        this.Z = 0;
        this.A = 0;
        this.S = 0;
        this.SkyBits = 0;
        this.Visibility = 0;
        this.Song = 0;
        this.Parallax = 0;
        this.Revision = 0;
        this.Sectors = [];
        this.Walls = [];
        this.Sprites = [];
        this.XPadStart = 0;
        this.XSectorSize = 0;
        this.XWallSize = 0;
        this.XSpriteSize = 0;
        this.XPadEnd = 0;
        this.SkyOffsets = [];
    }

    // transforms byte array into map object
    static Unserialize (bytes) {

        // create empty map object
        const map = new BLM();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);

        // read BLM\x1a signature
        map.Signature = reader.string(4);
        
        // read map version
        map.Version = reader.int16();

        // version flag?
        map.byte1A76C8 = (map.Version & 0xff00) === 0x700;
        map.byte1A76C7 = false;
        map.byte1A76C6 = false;

        // read header bytes
        let headerBytes = reader.read(BLM.HeaderSize);

        // get int32 key (where the "song id" would be)
        map.at16 = (headerBytes[23] << 0) | (headerBytes[24] << 8) | (headerBytes[25] << 16) | (headerBytes[26] << 24);

        // check if decryption is needed
        if (map.at16 !== 0 && map.at16 !== BLM.NewKey && map.at16 !== BLM.OldKey) {

            // decrypt header bytes
            headerBytes = BLM.decrypt(headerBytes, BLM.NewKey);

            // ecryption flag?
            map.byte1A76C7 = true;

        }

        // create header reader
        const headerReader = new Build.Scripts.ByteReader(headerBytes);

        // read map header
        map.X = headerReader.int32();
        map.Y = headerReader.int32();
        map.Z = headerReader.int32();
        map.A = headerReader.int16();
        map.S = headerReader.int16();
        map.SkyBits = headerReader.int16();
        map.Visibility = headerReader.int32();
        map.Song = headerReader.int32();
        map.Parallax = headerReader.int8();
        map.Revision = headerReader.int32();

        // get number of structs
        map.Sectors = new Array(headerReader.uint16());
        map.Walls = new Array(headerReader.uint16());
        map.Sprites = new Array(headerReader.uint16());

        // another flag?
        if (map.byte1A76C8) {
            if (map.at16 === BLM.NewKey || map.at16 === BLM.OldKey) {                
                map.byte1A76C6 = true;
            } else if (!map.at16) {
                map.byte1A76C6 = false;
            }
        }

        // read extra flags header
        if (map.byte1A76C8) {
            const extraReader = new Build.Scripts.ByteReader(BLM.decrypt(reader.read(BLM.ExtraHeaderSize), map.Walls.length));
            map.XPadStart = extraReader.read(64);
            map.XSectorSize = extraReader.uint32();
            map.XWallSize = extraReader.uint32();
            map.XSpriteSize = extraReader.uint32();
            map.XPadEnd = extraReader.read(52);
        }

        // sky offsets
        map.SkyOffsets = new Array((1 << map.SkyBits));

        // read sky bytes (read 2 bytes per offset because it is a int16 array)
        let skyBytes = reader.read(map.SkyOffsets.length * 2);

        // check if sky bytes needs to be decrypted
        if (map.byte1A76C8) {

            // decrypt sky bytes
            skyBytes = BLM.decrypt(skyBytes, map.SkyOffsets.length * 2);

        }

        // read sky offsets (int16 array)
        for (let i = 0; i < map.SkyOffsets.length; i++) {
            map.SkyOffsets[i] = skyBytes[i*2] << 0 | skyBytes[(i*2)+1] << 8;
        }

        // read sectors
        for (let i = 0; i < map.Sectors.length; i++) {

            // read sector bytes
            let sectorBytes = reader.read(BLM.SectorSize);

            // check if sector bytes needs to be decrypted
            if (map.byte1A76C8) {

                // decrypt sector bytes
                sectorBytes = BLM.decrypt(sectorBytes, map.Revision * BLM.SectorSize);

            }

            // creater sector reader
            const sectorReader = new Build.Scripts.ByteReader(sectorBytes);

            // read sector struct
            map.Sectors[i] = {
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
            if (map.Sectors[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                map.Sectors[i].xsector = reader.read(map.byte1A76C8 ? map.XSectorSize : BLM.XSectorSize);

            }

        }

        // read walls
        for (let i = 0; i < map.Walls.length; i++) {

            // read wall bytes
            let wallBytes = reader.read(BLM.WallSize);

            // check if wall bytes needs to be decrypted
            if (map.byte1A76C8) {

                // decrypt wall bytes
                wallBytes = BLM.decrypt(wallBytes, map.Revision * BLM.WallSize);

            }

            // creater wall reader
            const wallReader = new Build.Scripts.ByteReader(wallBytes);

            // read wall struct
            map.Walls[i] = {
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
            if (map.Walls[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1973
                map.Walls[i].xwall = reader.read(map.byte1A76C8 ? map.XWallSize : BLM.XWallSize);

            }

        }

        // read sprites
        for (let i = 0; i < map.Sprites.length; i++) {

            // read sprite bytes
            let spriteBytes = reader.read(BLM.SpriteSize);

            // check if sprite bytes needs to be decrypted
            if (map.byte1A76C8) {

                // decrypt sprite bytes
                spriteBytes = BLM.decrypt(spriteBytes, map.Revision * BLM.SpriteSize);

            }

            // creater sprite reader
            const spriteReader = new Build.Scripts.ByteReader(spriteBytes);

            // read wall struct
            map.Sprites[i] = {
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
            if (map.Sprites[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L2060
                map.Sprites[i].xsprite = reader.read(map.byte1A76C8 ? map.XSpriteSize : BLM.XSpriteSize);

            }

        }

        // return filled map object
        return map;

    }

    // transforms map object into byte array
    static Serialize (map) {

        // create byte writer
        const writer = new Build.Scripts.ByteWriter(
            4 + // signature
            2 + // version
            BLM.HeaderSize +
            BLM.ExtraHeaderSize +
            map.SkyOffsets.length * 2 +
            map.Sectors.length * BLM.SectorSize +
            map.Sectors.filter(s => s.extra > 0).length * (map.byte1A76C8 ? map.XSectorSize : BLM.XSectorSize) +
            map.Walls.length * BLM.WallSize +
            map.Walls.filter(w => w.extra > 0).length * (map.byte1A76C8 ? map.XWallSize : BLM.XWallSize) +
            map.Sprites.length * BLM.SpriteSize +
            map.Sprites.filter(s => s.extra > 0).length * (map.byte1A76C8 ? map.XSpriteSize : BLM.XSpriteSize)
        );

        // write BLM\x1a signature
        writer.string(map.Signature, 4);
        
        // write map version
        writer.int16(map.Version);

        // create header writer
        const headerWriter = new Build.Scripts.ByteWriter(BLM.HeaderSize);

        // write map header bytes to local writer
        headerWriter.int32(map.X);
        headerWriter.int32(map.Y);
        headerWriter.int32(map.Z);
        headerWriter.int16(map.A);
        headerWriter.int16(map.S);
        headerWriter.int16(map.SkyBits);
        headerWriter.int32(map.Visibility);
        headerWriter.int32(map.Song);
        headerWriter.int8(map.Parallax);
        headerWriter.int32(map.Revision);
        headerWriter.int16(map.Sectors.length);
        headerWriter.int16(map.Walls.length);
        headerWriter.int16(map.Sprites.length);

        // check if header bytes needs to be encrypted
        if (map.byte1A76C7) {

            // encrypt header bytes
            headerWriter.bytes = BLM.encrypt(headerWriter.bytes, BLM.NewKey);

        }

        // write header bytes
        writer.write(headerWriter.bytes);

        // write extra flags header
        if (map.byte1A76C8) {
            const extraWriter = new Build.Scripts.ByteWriter(BLM.ExtraHeaderSize);
            extraWriter.write(map.XPadStart); // 64
            extraWriter.int32(map.XSectorSize);
            extraWriter.int32(map.XWallSize);
            extraWriter.int32(map.XSpriteSize);
            extraWriter.write(map.XPadEnd); // 52
            writer.write(BLM.encrypt(extraWriter.bytes, map.Walls.length));
        }

        // create sky writer
        const skyWriter = new Build.Scripts.ByteWriter(map.SkyOffsets.length * 2);

        // write sky bytes to local writer
        for (let i = 0; i < map.SkyOffsets.length; i++) {
            skyWriter.int16(map.SkyOffsets[i]);            
        }

        // check if sky bytes needs to be encrypted
        if (map.byte1A76C8) {

            // decrypt sky bytes
            skyWriter.bytes = BLM.encrypt(skyWriter.bytes, map.SkyOffsets.length * 2);

        }

        // write sky bytes
        writer.write(skyWriter.bytes);

        // write sectors
        for (let i = 0; i < map.Sectors.length; i++) {

            const sectorWriter = new Build.Scripts.ByteWriter(BLM.SectorSize);

            // write sector struct
            sectorWriter.int16(map.Sectors[i].wallptr);
            sectorWriter.int16(map.Sectors[i].wallnum);
            sectorWriter.int32(map.Sectors[i].ceilingz);
            sectorWriter.int32(map.Sectors[i].floorz);
            sectorWriter.int16(map.Sectors[i].ceilingstat);
            sectorWriter.int16(map.Sectors[i].floorstat);
            sectorWriter.int16(map.Sectors[i].ceilingpicnum);
            sectorWriter.int16(map.Sectors[i].ceilingheinum);
            sectorWriter.int8(map.Sectors[i].ceilingshade);
            sectorWriter.int8(map.Sectors[i].ceilingpal);
            sectorWriter.int8(map.Sectors[i].ceilingxpanning);
            sectorWriter.int8(map.Sectors[i].ceilingypanning);
            sectorWriter.int16(map.Sectors[i].floorpicnum);
            sectorWriter.int16(map.Sectors[i].floorheinum);
            sectorWriter.int8(map.Sectors[i].floorshade);
            sectorWriter.int8(map.Sectors[i].floorpal);
            sectorWriter.int8(map.Sectors[i].floorxpanning);
            sectorWriter.int8(map.Sectors[i].floorypanning);
            sectorWriter.int8(map.Sectors[i].visibility);
            sectorWriter.int8(map.Sectors[i].filler);
            sectorWriter.int16(map.Sectors[i].lotag);
            sectorWriter.int16(map.Sectors[i].hitag);
            sectorWriter.int16(map.Sectors[i].extra);

            // check if sector extra needs to be written
            if (map.Sectors[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(map.Sectors[i].xsector);

            }

            // check if sector bytes needs to be decrypted
            if (map.byte1A76C8) {

                // encrypt sector bytes
                sectorWriter.bytes = BLM.encrypt(sectorWriter.bytes, map.Revision * BLM.SectorSize);

            }

            // write sector bytes
            writer.write(sectorWriter.bytes);

        }

        // write walls
        for (let i = 0; i < map.Walls.length; i++) {

            const wallWriter = new Build.Scripts.ByteWriter(BLM.WallSize);

            // write wall struct
            wallWriter.int32(map.Walls[i].x);
            wallWriter.int32(map.Walls[i].y);
            wallWriter.int16(map.Walls[i].point2);
            wallWriter.int16(map.Walls[i].nextwall);
            wallWriter.int16(map.Walls[i].nextsector);
            wallWriter.int16(map.Walls[i].cstat);
            wallWriter.int16(map.Walls[i].picnum);
            wallWriter.int16(map.Walls[i].overpicnum);
            wallWriter.int8(map.Walls[i].shade);
            wallWriter.int8(map.Walls[i].pal);
            wallWriter.int8(map.Walls[i].xrepeat);
            wallWriter.int8(map.Walls[i].yrepeat);
            wallWriter.int8(map.Walls[i].xpanning);
            wallWriter.int8(map.Walls[i].ypanning);
            wallWriter.int16(map.Walls[i].lotag);
            wallWriter.int16(map.Walls[i].hitag);
            wallWriter.int16(map.Walls[i].extra);

            // check if wall extra needs to be written
            if (map.Walls[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(map.Walls[i].xwall);

            }

            // check if wall bytes needs to be decrypted
            if (map.byte1A76C8) {

                // encrypt wall bytes
                wallWriter.bytes = BLM.encrypt(wallWriter.bytes, map.Revision * BLM.WallSize);

            }

            // write wall bytes
            writer.write(wallWriter.bytes);

        }

        // write sprites
        for (let i = 0; i < map.Sprites.length; i++) {

            const spriteWriter = new Build.Scripts.ByteWriter(BLM.SpriteSize);

            // write sprite struct
            spriteWriter.int32(map.Sprites[i].x);
            spriteWriter.int32(map.Sprites[i].y);
            spriteWriter.int32(map.Sprites[i].z);
            spriteWriter.int16(map.Sprites[i].cstat);
            spriteWriter.int16(map.Sprites[i].picnum);
            spriteWriter.int8(map.Sprites[i].shade);
            spriteWriter.int8(map.Sprites[i].pal);
            spriteWriter.int8(map.Sprites[i].clipdist);
            spriteWriter.int8(map.Sprites[i].filler);
            spriteWriter.int8(map.Sprites[i].xrepeat);
            spriteWriter.int8(map.Sprites[i].yrepeat);
            spriteWriter.int8(map.Sprites[i].xoffset);
            spriteWriter.int8(map.Sprites[i].yoffset);
            spriteWriter.int16(map.Sprites[i].sectnum);
            spriteWriter.int16(map.Sprites[i].statnum);
            spriteWriter.int16(map.Sprites[i].ang);
            spriteWriter.int16(map.Sprites[i].owner);
            spriteWriter.int16(map.Sprites[i].xvel);
            spriteWriter.int16(map.Sprites[i].yvel);
            spriteWriter.int16(map.Sprites[i].zvel);
            spriteWriter.int16(map.Sprites[i].lotag);
            spriteWriter.int16(map.Sprites[i].hitag);
            spriteWriter.int16(map.Sprites[i].extra);

            // check if sprite extra needs to be written
            if (map.Sprites[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(map.Sprites[i].xsprite);

            }

            // check if sprite bytes needs to be decrypted
            if (map.byte1A76C8) {

                // encrypt sprite bytes
                spriteWriter.bytes = BLM.encrypt(spriteWriter.bytes, map.Revision * BLM.SpriteSize);

            }

            // write sprite bytes
            writer.write(spriteWriter.bytes);

        }
        
        // return map bytes
        return writer.bytes;

    }

}