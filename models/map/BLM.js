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
    static XWallSize = 24;
    static XSpriteSize = 56;

    constructor (bytes) {

        super([]);

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Signature = bytes ? reader.string(4) : "BLM\x1a";        
        this.Version = bytes ? reader.int16() : 0x0700;

        // version flag?
        this.byte1A76C8 = (this.Version & 0xFF00) === 0x0700;
        this.byte1A76C7 = false;
        this.byte1A76C6 = false;

        // read header bytes
        let headerBytes = bytes ? reader.read(BLM.HeaderSize) : 0;

        // get int32 key (where the "song id" would be)
        this.at16 = bytes ? ((headerBytes[22] << 0) | (headerBytes[23] << 8) | (headerBytes[24] << 16) | (headerBytes[25] << 24)) >>> 0 : 0;

        // check if decryption is needed
        if (this.at16 !== 0 && this.at16 !== BLM.NewKey && this.at16 !== BLM.OldKey) {

            // decrypt header bytes
            headerBytes = Build.Scripts.ENCXOR.Compute(headerBytes, {
                seed: BLM.NewKey
            });

            // ecryption flag?
            this.byte1A76C7 = true;

        }

        // create header reader
        const headerReader = new Build.Scripts.ByteReader(headerBytes);

        // read map header
        this.X = bytes ? headerReader.int32() : 0;
        this.Y = bytes ? headerReader.int32() : 0;
        this.Z = bytes ? headerReader.int32() : 0;
        this.A = bytes ? headerReader.int16() : 0;
        this.S = bytes ? headerReader.int16() : 0;
        this.SkyBits = bytes ? headerReader.int16() & 0xFF : 0; // int16 to int8 (original code did this, why tho?)
        this.Visibility = bytes ? headerReader.int32() : 0;
        this.SongId = bytes ? headerReader.int32() : 0;
        this.Parallax = bytes ? headerReader.int8() : 0;
        this.Revision = bytes ? headerReader.int32() : 0;

        // get number of structs
        this.Sectors = new Array(bytes ? headerReader.uint16() : 0);
        this.Walls = new Array(bytes ? headerReader.uint16() : 0);
        this.Sprites = new Array(bytes ? headerReader.uint16() : 0);

        // another flag?
        if (this.byte1A76C8) {
            if (this.SongId === BLM.NewKey || this.SongId === BLM.OldKey) {                
                this.byte1A76C6 = true;
            } else if (!this.SongId) {
                this.byte1A76C6 = false;
            }
        }

        // read extra flags header
        if (this.byte1A76C8) {
            const extraHeaderBytes = Build.Scripts.ENCXOR.Compute(bytes ? reader.read(BLM.ExtraHeaderSize) : [], {
                seed: this.Walls.length
            });
            const extraReader = new Build.Scripts.ByteReader(extraHeaderBytes);
            this.XPadStart = bytes ? extraReader.read(64) : new Array(64).fill(0);
            this.XSpriteSize = bytes ? extraReader.uint32() : BLM.XSpriteSize;
            this.XWallSize = bytes ? extraReader.uint32() : BLM.XWallSize;
            this.XSectorSize = bytes ? extraReader.uint32() : BLM.XSectorSize;
            this.XPadEnd = bytes ? extraReader.read(52) : new Array(52).fill(0);
        }

        // sky offsets
        this.SkyOffsets = new Array(bytes ? (1 << this.SkyBits) : 0);

        // read sky bytes (read 2 bytes per offset because it is a int16 array)
        let skyBytes = bytes ? reader.read(this.SkyOffsets.length * 2) : [];

        // check if sky bytes needs to be decrypted
        if (this.byte1A76C8) {

            // decrypt sky bytes
            skyBytes = Build.Scripts.ENCXOR.Compute(skyBytes, {
                seed: this.SkyOffsets.length * 2
            });

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
                sectorBytes = Build.Scripts.ENCXOR.Compute(sectorBytes, {
                    seed: this.Revision * BLM.SectorSize
                });

            }

            // creater sector reader
            const sectorReader = new Build.Scripts.ByteReader(sectorBytes);

            // read sector struct
            this.Sectors[i] = {
                wallptr: sectorReader.int16(),
                wallnum: sectorReader.int16(),
                ceilingz: sectorReader.int32(),
                floorz: sectorReader.int32(),
                ceilingstat: sectorReader.uint16(),
                floorstat: sectorReader.uint16(),
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
                // yeah, this part uses sectorsize for some reason
                // reference: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1974
                wallBytes = Build.Scripts.ENCXOR.Compute(wallBytes, {
                    seed: (this.Revision * BLM.SectorSize) | BLM.NewKey
                });

            }

            // create wall reader
            const wallReader = new Build.Scripts.ByteReader(wallBytes);

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
                spriteBytes = Build.Scripts.ENCXOR.Compute(spriteBytes, {
                    seed: (this.Revision * BLM.SpriteSize) | BLM.NewKey
                });

            }

            // creater sprite reader
            const spriteReader = new Build.Scripts.ByteReader(spriteBytes);

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

        // read crc
        this.CRC = bytes ? reader.uint32() : 0;

    }

    Serialize () {

        // create byte writer
        const writer = new Build.Scripts.ByteWriter();

        // write BLM\x1a signature
        writer.string(this.Signature, 4);
        
        // write map version
        writer.int16(this.Version);

        // create buffer for header bytes
        let headerBytes = [];

        // create header writer
        const headerWriter = new Build.Scripts.ByteWriter();

        // write map header bytes to local writer
        headerWriter.int32(this.X);
        headerWriter.int32(this.Y);
        headerWriter.int32(this.Z);
        headerWriter.int16(this.A);
        headerWriter.int16(this.S);
        headerWriter.int16(this.SkyBits);
        headerWriter.int32(this.Visibility);
        headerWriter.int32(this.SongId);
        headerWriter.int8(this.Parallax);
        headerWriter.int32(this.Revision);
        headerWriter.int16(this.Sectors.length);
        headerWriter.int16(this.Walls.length);
        headerWriter.int16(this.Sprites.length);

        // check if header bytes needs to be encrypted
        if (this.byte1A76C7) {

            // encrypt header bytes
            headerBytes = Build.Scripts.ENCXOR.Compute(headerWriter.bytes, {
                seed: BLM.NewKey
            });

        } else {

            // just copy bytes
            headerBytes = headerWriter.bytes;

        }

        // write header bytes
        writer.write(headerBytes);

        // write extra flags header
        if (this.byte1A76C8) {
            const extraWriter = new Build.Scripts.ByteWriter();
            extraWriter.write(this.XPadStart); // 64
            extraWriter.int32(this.XSpriteSize);
            extraWriter.int32(this.XWallSize);
            extraWriter.int32(this.XSectorSize);
            extraWriter.write(this.XPadEnd); // 52
            writer.write(Build.Scripts.ENCXOR.Compute(extraWriter.bytes, {
                seed: this.Walls.length
            }));
        }

        // create buffer from sky bytes
        let skyBytes = [];

        // create sky writer
        const skyWriter = new Build.Scripts.ByteWriter();

        // write sky bytes to local writer
        for (let i = 0; i < this.SkyOffsets.length; i++) {
            skyWriter.int16(this.SkyOffsets[i]);            
        }

        // check if sky bytes needs to be encrypted
        if (this.byte1A76C8) {

            // encrypt sky bytes
            skyBytes = Build.Scripts.ENCXOR.Compute(skyWriter.bytes, {
                seed: this.SkyOffsets.length * 2
            });

        } else {

            // just copy bytes
            skyBytes = skyWriter.bytes;

        }

        // write sky bytes
        writer.write(skyBytes);

        // write sectors
        for (let i = 0; i < this.Sectors.length; i++) {

            let sectorBytes = [];

            const sectorWriter = new Build.Scripts.ByteWriter();

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

            // check if sector bytes needs to be encrypted
            if (this.byte1A76C8) {

                // encrypt sector bytes
                sectorBytes = Build.Scripts.ENCXOR.Compute(sectorWriter.bytes, {
                    seed: this.Revision * BLM.SectorSize
                });

            } else {

                // just copy bytes
                sectorBytes = sectorWriter.bytes;

            }

            // write sector bytes
            writer.write(sectorBytes);

            // check if sector extra needs to be written
            if (this.Sectors[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(this.Sectors[i].xsector);

            }

        }

        // write walls
        for (let i = 0; i < this.Walls.length; i++) {

            let wallBytes = [];

            const wallWriter = new Build.Scripts.ByteWriter();

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

            // check if wall bytes needs to be encrypted
            if (this.byte1A76C8) {

                // encrypt wall bytes
                // yeah, this part uses sectorsize for some reason
                // reference: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1974
                wallBytes = Build.Scripts.ENCXOR.Compute(wallWriter.bytes, {
                    seed: (this.Revision * BLM.SectorSize) | BLM.NewKey
                });

            } else {

                // just copy bytes
                wallBytes = wallWriter.bytes;

            }

            // write wall bytes
            writer.write(wallBytes);

            // check if wall extra needs to be written
            if (this.Walls[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(this.Walls[i].xwall);

            }

        }

        // write sprites
        for (let i = 0; i < this.Sprites.length; i++) {

            let spriteBytes = [];

            const spriteWriter = new Build.Scripts.ByteWriter();

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

            // check if sprite bytes needs to be encrypted
            if (this.byte1A76C8) {

                // encrypt sprite bytes
                spriteBytes = Build.Scripts.ENCXOR.Compute(spriteWriter.bytes, {
                    seed: (this.Revision * BLM.SpriteSize) | BLM.NewKey
                });

            } else {

                // just copy bytes
                spriteBytes = spriteWriter.bytes;

            }

            // write sprite bytes
            writer.write(spriteBytes);

            // check if sprite extra needs to be written
            if (this.Sprites[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(this.Sprites[i].xsprite);

            }

        }

        // write crc
        writer.int32(this.CRC);
        
        // return map bytes
        return writer.bytes;

    }

}