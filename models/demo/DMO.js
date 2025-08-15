ByteReader = (() => { try { return require("../scripts/ByteReader.js"); } catch {} } )() ?? ByteReader;
ByteWriter = (() => { try { return require("../scripts/ByteWriter.js"); } catch {} } )() ?? ByteWriter;

// reference: https://web.archive.org/web/20150603141920/http://www.quakewiki.net/archives/demospecs/dmo/dmo.html
class DMO {

    constructor(bytes) {

        const reader = new ByteReader(bytes);

        this.Tics = reader.uint32();
        this.Version = reader.uint8();
        this.Episode = reader.uint8();
        this.Map = reader.uint8();
        this.Skill = reader.uint8();
        this.Mode = reader.uint8();
        this.FriendlyFire = reader.uint8();
        this.Players = reader.uint16();
        this.Monsters = reader.uint16();
        this.RespawnMonsters = reader.uint32();
        this.RespawnItems = reader.uint32();
        this.RespawnInventory = reader.uint32();
        this.BotAI = reader.uint32();
        this.Names = new Array(this.Players);

        for (let i = 0; i < this.Names.length; i++) {
            this.Names[i] = reader.string(32);
        }        

    }

    Serialize () {

        const writer = new ByteWriter(20 + 2 + this.Sectors.length * DNM.SectorSize + 2 + this.Walls.length * DNM.WallSize + 2 + this.Sprites.length * DNM.SpriteSize);

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

        return writer.bytes;

    }

}

try { module.exports = DMO; } catch {}