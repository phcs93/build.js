// reference: https://voidpoint.io/terminx/eduke32/-/blob/master/source/sw/src/demo.cpp
Build.Models.Demo.VSW = class VSW {

    constructor(version) {
        this.Map = "";
        this.Players = [{
            x: 0,
            y: 0,
            z: 0,
            flags: 0,
            ang: 0
        }];
        this.Episode = 0;
        this.Level = 0;
        this.Song = "";
        this.Skill = 0;
        this.Net = {
            KillLimit: 0,
            TimeLimit: 0,
            TimeLimitClock: 0,
            MultiGameType: 0,
            TeamPlay: 0,
            HurtTeammate: 0,
            SpawnMarkers: 0,
            AutoAim: 0,
            NoRespawn: 0,
            Nuke: 0
        }
    }

    static Unserialize(bytes) {

        const vsw = new Build.Models.Demo.VSW();
        const reader = new Build.Scripts.ByteReader(bytes);
        vsw.Map = reader.string(16);
        vsw.Players = new Array(reader.uint8());
        vsw.Episode = reader.uint8();
        vsw.Level = reader.uint8();
        vsw.Song = reader.string(16);
        for (let i = 0; i < vsw.Players.length; i++) {
            vsw.Players[i] = {
                x: reader.int32(),
                y: reader.int32(),
                z: reader.int32(),
                flags: reader.int32(),
                ang: reader.int16()
            }
        }
        vsw.Skill = reader.uint16();

        vsw.Net = {
            KillLimit: reader.uint32(),
            TimeLimit: reader.uint32(),
            TimeLimitClock: reader.uint32(),
            MultiGameType: reader.uint16(),
            TeamPlay: reader.uint8(),
            HurtTeammate: reader.uint8(),
            SpawnMarkers: reader.uint8(),
            AutoAim: reader.uint8(),
            NoRespawn: reader.uint8(),
            Nuke: reader.uint8()
        }

        return vsw;

    }

    static Serialize(vsw) {

        const writer = new Build.Scripts.ByteWriter();
        writer.string(vsw.Map, 16);
        writer.int8(vsw.Players.length);
        writer.int8(vsw.Episode);
        writer.int8(vsw.Level);
        writer.string(vsw.Song, 16);

        return writer.bytes;

    }

}