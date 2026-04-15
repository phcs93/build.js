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
        };
        this.Inputs = [{
            vel: -1,
            svel: -1,
            angvel: -1,
            aimvel: -1,
            bits: 0xFFFFFFFF // -1
        }];
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
            };
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
        };        
        vsw.Inputs = [];
        while ((bytes.length - reader.index) >= 10) {
            const input = {
                vel: reader.int16(),
                svel: reader.int16(),
                angvel: reader.int8(),
                aimvel: reader.int8(),
                bits: reader.uint32()
            };
            vsw.Inputs.push(input);
            // if (input.bits === 0xFFFFFFFF) { // -1
            //     break;
            // }
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
        for (let i = 0; i < vsw.Players.length; i++) {
            writer.int32(vsw.Players[i].x);
            writer.int32(vsw.Players[i].y);
            writer.int32(vsw.Players[i].z);
            writer.int32(vsw.Players[i].flags);
            writer.int16(vsw.Players[i].ang);
        }
        writer.int16(vsw.Skill);
        writer.int32(vsw.Net.KillLimit);
        writer.int32(vsw.Net.TimeLimit);
        writer.int32(vsw.Net.TimeLimitClock);
        writer.int16(vsw.Net.MultiGameType);
        writer.int8(vsw.Net.TeamPlay);
        writer.int8(vsw.Net.HurtTeammate);
        writer.int8(vsw.Net.SpawnMarkers);
        writer.int8(vsw.Net.AutoAim);
        writer.int8(vsw.Net.NoRespawn);
        writer.int8(vsw.Net.Nuke);
        for (const input of vsw.Inputs) {
            writer.int16(input.vel);
            writer.int16(input.svel);
            writer.int8(input.angvel);
            writer.int8(input.aimvel);
            writer.int32(input.bits);
        }
        return writer.bytes;
    }

}