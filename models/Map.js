ByteReader = (() => { try { return require("../../scripts/ByteReader.js"); } catch {} } )() ?? ByteReader;
ByteWriter = (() => { try { return require("../../scripts/ByteWriter.js"); } catch {} } )() ?? ByteWriter;

class Map {

    constructor(bytes) {

        const reader = new ByteReader(bytes);

        this.Version = reader.int32();
        this.X = reader.int32();
        this.Y = reader.int32();
        this.Z = reader.int32();
        this.A = reader.int16();
        this.S = reader.int16();

        this.Sectors = new Array(reader.uint16());

        for (let i = 0; i < this.Sectors.length; i++) {
            this.Sectors[i] = {
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

        this.Walls = new Array(reader.uint16());

        for (let i = 0; i < this.Walls.length; i++) {
            this.Walls[i] = {
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

        this.Sprites = new Array(reader.uint16());

        for (let i = 0; i < this.Sprites.length; i++) {
            this.Sprites[i] = {
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

        this.Remaining = reader.bytes.slice(reader.index);

    }

    Serialize = () => {

        const writer = new ByteWriter();

        writer.int32(this.Version);
        writer.int32(this.X);
        writer.int32(this.Y);
        writer.int32(this.Z);
        writer.int16(this.A);
        writer.int16(this.S);

        writer.int16(this.Sectors.length);

        for (let i = 0; i < this.Sectors.length; i++) {
            writer.int16(this.Sectors[i].wallptr);
            writer.int16(this.Sectors[i].wallnum);
            writer.int32(this.Sectors[i].ceilingz);
            writer.int32(this.Sectors[i].floorz);
            writer.int16(this.Sectors[i].ceilingstat);
            writer.int16(this.Sectors[i].floorstat);
            writer.int16(this.Sectors[i].ceilingpicnum);
            writer.int16(this.Sectors[i].ceilingheinum);
            writer.int8(this.Sectors[i].ceilingshade);
            writer.int8(this.Sectors[i].ceilingpal);
            writer.int8(this.Sectors[i].ceilingxpanning);
            writer.int8(this.Sectors[i].ceilingypanning);
            writer.int16(this.Sectors[i].floorpicnum);
            writer.int16(this.Sectors[i].floorheinum);
            writer.int8(this.Sectors[i].floorshade);
            writer.int8(this.Sectors[i].floorpal);
            writer.int8(this.Sectors[i].floorxpanning);
            writer.int8(this.Sectors[i].floorypanning);
            writer.int8(this.Sectors[i].visibility);
            writer.int8(this.Sectors[i].filler);
            writer.int16(this.Sectors[i].lotag);
            writer.int16(this.Sectors[i].hitag);
            writer.int16(this.Sectors[i].extra);
        }

        writer.int16(this.Walls.length);

        for (let i = 0; i < this.Walls.length; i++) {
            writer.int32(this.Walls[i].x);
            writer.int32(this.Walls[i].y);
            writer.int16(this.Walls[i].point2);
            writer.int16(this.Walls[i].nextwall);
            writer.int16(this.Walls[i].nextsector);
            writer.int16(this.Walls[i].cstat);
            writer.int16(this.Walls[i].picnum);
            writer.int16(this.Walls[i].overpicnum);
            writer.int8(this.Walls[i].shade);
            writer.int8(this.Walls[i].pal);
            writer.int8(this.Walls[i].xrepeat);
            writer.int8(this.Walls[i].yrepeat);
            writer.int8(this.Walls[i].xpanning);
            writer.int8(this.Walls[i].ypanning);
            writer.int16(this.Walls[i].lotag);
            writer.int16(this.Walls[i].hitag);
            writer.int16(this.Walls[i].extra);
        }

        writer.int16(this.Sprites.length);

        for (let i = 0; i < this.Sprites.length; i++) {
            writer.int32(this.Sprites[i].x);
            writer.int32(this.Sprites[i].y);
            writer.int32(this.Sprites[i].z);
            writer.int16(this.Sprites[i].cstat);
            writer.int16(this.Sprites[i].picnum);
            writer.int8(this.Sprites[i].shade);
            writer.int8(this.Sprites[i].pal);
            writer.int8(this.Sprites[i].clipdist);
            writer.int8(this.Sprites[i].filler);
            writer.int8(this.Sprites[i].xrepeat);
            writer.int8(this.Sprites[i].yrepeat);
            writer.int8(this.Sprites[i].xoffset);
            writer.int8(this.Sprites[i].yoffset);
            writer.int16(this.Sprites[i].sectnum);
            writer.int16(this.Sprites[i].statnum);
            writer.int16(this.Sprites[i].ang);
            writer.int16(this.Sprites[i].owner);
            writer.int16(this.Sprites[i].xvel);
            writer.int16(this.Sprites[i].yvel);
            writer.int16(this.Sprites[i].zvel);
            writer.int16(this.Sprites[i].lotag);
            writer.int16(this.Sprites[i].hitag);
            writer.int16(this.Sprites[i].extra);
        }

        writer.bytes.push(...this.Remaining);

        return writer.bytes;

    }

}

try { module.exports = Map; } catch {}