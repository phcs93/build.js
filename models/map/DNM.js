// reference: https://moddingwiki.shikadi.net/wiki/MAP_Format_(Build)
Build.Models.Map.DNM = class DNM extends Build.Models.Map {

    static SectorSize = 40;
    static WallSize = 32;
    static SpriteSize = 44;

    constructor (version) {
        super();
        this.Version = version;
        this.X = 0;
        this.Y = 0;
        this.Z = 0;
        this.A = 0;
        this.S = 0;   
        this.Sectors = [];
        this.Walls = [];
        this.Sprites = [];
    }

    static Unserialize (bytes) {

        const map = new DNM(0);
        
        const reader = new Build.Scripts.ByteReader(bytes);

        map.Version = reader.int32();
        map.X = reader.int32();
        map.Y = reader.int32();
        map.Z = reader.int32();
        map.A = reader.int16();
        map.S = reader.int16();   

        map.Sectors = new Array(reader.uint16());

        for (let i = 0; i < map.Sectors.length; i++) {
            map.Sectors[i] = {
                wallptr: reader.int16(),
                wallnum: reader.int16(),
                ceilingz: reader.int32(),
                floorz: reader.int32(),
                ceilingstat: reader.int16(),
                floorstat: reader.int16(),
                ceilingpicnum: reader.int16(),
                ceilingheinum: reader.int16(),
                ceilingshade: reader.int8(),
                ceilingpal: reader.uint8(),
                ceilingxpanning: reader.uint8(),
                ceilingypanning: reader.uint8(),
                floorpicnum: reader.int16(),
                floorheinum: reader.int16(),
                floorshade: reader.int8(),
                floorpal: reader.uint8(),
                floorxpanning: reader.uint8(),
                floorypanning: reader.uint8(),
                visibility: reader.uint8(),
                filler: reader.uint8(),
                lotag: reader.int16(),
                hitag: reader.int16(),
                extra: reader.int16()
            };
        }

        map.Walls = new Array(reader.uint16());

        for (let i = 0; i < map.Walls.length; i++) {
            map.Walls[i] = {
                x: reader.int32(),
                y: reader.int32(),
                point2: reader.int16(),
                nextwall: reader.int16(),
                nextsector: reader.int16(),
                cstat: reader.int16(),
                picnum: reader.int16(),
                overpicnum: reader.int16(),
                shade: reader.int8(),
                pal: reader.uint8(),
                xrepeat: reader.uint8(),
                yrepeat: reader.uint8(),
                xpanning: reader.uint8(),
                ypanning: reader.uint8(),
                lotag: reader.int16(),
                hitag: reader.int16(),
                extra: reader.int16()
            };
        }

        map.Sprites = new Array(reader.uint16());

        for (let i = 0; i < map.Sprites.length; i++) {
            map.Sprites[i] = {
                x: reader.int32(),
                y: reader.int32(),
                z: reader.int32(),
                cstat: reader.int16(),
                picnum: reader.int16(),
                shade: reader.int8(),
                pal: reader.uint8(),
                clipdist: reader.uint8(),
                filler: reader.uint8(),
                xrepeat: reader.uint8(),
                yrepeat: reader.uint8(),
                xoffset: reader.int8(),
                yoffset: reader.int8(),
                sectnum: reader.int16(),
                statnum: reader.int16(),
                ang: reader.int16(),
                owner: reader.int16(),
                xvel: reader.int16(),
                yvel: reader.int16(),
                zvel: reader.int16(),
                lotag: reader.int16(),
                hitag: reader.int16(),
                extra: reader.int16()
            };
        }

        return map;

    }

    static Serialize (map) {

        const writer = new Build.Scripts.ByteWriter(
            4 + // version
            4 + // x
            4 + // y
            4 + // z
            2 + // a
            2 + // s
            2 + map.Sectors.length * DNM.SectorSize + // numsectors + sectors
            2 + map.Walls.length * DNM.WallSize + // numwalls + walls
            2 + map.Sprites.length * DNM.SpriteSize // numsprites + sprites
        );

        writer.int32(map.Version);
        writer.int32(map.X);
        writer.int32(map.Y);
        writer.int32(map.Z);
        writer.int16(map.A);
        writer.int16(map.S);

        writer.int16(map.Sectors.length);

        for (let i = 0; i < map.Sectors.length; i++) {
            writer.int16(map.Sectors[i].wallptr);
            writer.int16(map.Sectors[i].wallnum);
            writer.int32(map.Sectors[i].ceilingz);
            writer.int32(map.Sectors[i].floorz);
            writer.int16(map.Sectors[i].ceilingstat);
            writer.int16(map.Sectors[i].floorstat);
            writer.int16(map.Sectors[i].ceilingpicnum);
            writer.int16(map.Sectors[i].ceilingheinum);
            writer.int8(map.Sectors[i].ceilingshade);
            writer.int8(map.Sectors[i].ceilingpal);
            writer.int8(map.Sectors[i].ceilingxpanning);
            writer.int8(map.Sectors[i].ceilingypanning);
            writer.int16(map.Sectors[i].floorpicnum);
            writer.int16(map.Sectors[i].floorheinum);
            writer.int8(map.Sectors[i].floorshade);
            writer.int8(map.Sectors[i].floorpal);
            writer.int8(map.Sectors[i].floorxpanning);
            writer.int8(map.Sectors[i].floorypanning);
            writer.int8(map.Sectors[i].visibility);
            writer.int8(map.Sectors[i].filler);
            writer.int16(map.Sectors[i].lotag);
            writer.int16(map.Sectors[i].hitag);
            writer.int16(map.Sectors[i].extra);
        }

        writer.int16(map.Walls.length);

        for (let i = 0; i < map.Walls.length; i++) {
            writer.int32(map.Walls[i].x);
            writer.int32(map.Walls[i].y);
            writer.int16(map.Walls[i].point2);
            writer.int16(map.Walls[i].nextwall);
            writer.int16(map.Walls[i].nextsector);
            writer.int16(map.Walls[i].cstat);
            writer.int16(map.Walls[i].picnum);
            writer.int16(map.Walls[i].overpicnum);
            writer.int8(map.Walls[i].shade);
            writer.int8(map.Walls[i].pal);
            writer.int8(map.Walls[i].xrepeat);
            writer.int8(map.Walls[i].yrepeat);
            writer.int8(map.Walls[i].xpanning);
            writer.int8(map.Walls[i].ypanning);
            writer.int16(map.Walls[i].lotag);
            writer.int16(map.Walls[i].hitag);
            writer.int16(map.Walls[i].extra);
        }

        writer.int16(map.Sprites.length);

        for (let i = 0; i < map.Sprites.length; i++) {
            writer.int32(map.Sprites[i].x);
            writer.int32(map.Sprites[i].y);
            writer.int32(map.Sprites[i].z);
            writer.int16(map.Sprites[i].cstat);
            writer.int16(map.Sprites[i].picnum);
            writer.int8(map.Sprites[i].shade);
            writer.int8(map.Sprites[i].pal);
            writer.int8(map.Sprites[i].clipdist);
            writer.int8(map.Sprites[i].filler);
            writer.int8(map.Sprites[i].xrepeat);
            writer.int8(map.Sprites[i].yrepeat);
            writer.int8(map.Sprites[i].xoffset);
            writer.int8(map.Sprites[i].yoffset);
            writer.int16(map.Sprites[i].sectnum);
            writer.int16(map.Sprites[i].statnum);
            writer.int16(map.Sprites[i].ang);
            writer.int16(map.Sprites[i].owner);
            writer.int16(map.Sprites[i].xvel);
            writer.int16(map.Sprites[i].yvel);
            writer.int16(map.Sprites[i].zvel);
            writer.int16(map.Sprites[i].lotag);
            writer.int16(map.Sprites[i].hitag);
            writer.int16(map.Sprites[i].extra);
        }

        return writer.bytes;

    }

}