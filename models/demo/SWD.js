// reference: https://voidpoint.io/terminx/eduke32/-/blob/master/source/sw/src/demo.cpp
Build.Models.Demo.SWD = class SWD extends Build.Models.Demo {

    constructor(bytes) {

        super();

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Map = bytes ? reader.string(16) : "";
        this.Players = new Array(bytes ? reader.uint8() : 0);
        this.Episode = bytes ? reader.uint8() : 0;
        this.Level = bytes ? reader.uint8() : 0;
        this.Song = bytes ? reader.string(16) : 0;

        for (let i = 0; i < this.Players.length; i++) {
            this.Players[i] = {
                x: reader.int32(),
                y: reader.int32(),
                z: reader.int32(),
                flags: reader.int32(),
                ang: reader.int16()
            };
        }

        this.Skill = bytes ? reader.uint16() : 0;

        this.Net = {
            KillLimit: bytes ? reader.uint32() : 0,
            TimeLimit: bytes ? reader.uint32() : 0,
            TimeLimitClock: bytes ? reader.uint32() : 0,
            MultiGameType: bytes ? reader.uint16() : 0,
            TeamPlay: bytes ? reader.uint8() : 0,
            HurtTeammate: bytes ? reader.uint8() : 0,
            SpawnMarkers: bytes ? reader.uint8() : 0,
            AutoAim: bytes ? reader.uint8() : 0,
            NoRespawn: bytes ? reader.uint8() : 0,
            Nuke: bytes ? reader.uint8() : 0
        };       

        this.Inputs = [];

        while (bytes && (bytes.length - reader.index) >= 10) {
            const input = {
                vel: reader.int16(),
                svel: reader.int16(),
                angvel: reader.int8(),
                aimvel: reader.int8(),
                bits: reader.uint32()
            };
            this.Inputs.push(input);
            // if (input.bits === 0xFFFFFFFF) { // -1
            //     break;
            // }
        }

    }

    Serialize(swd) {

        const writer = new Build.Scripts.ByteWriter();

        writer.string(this.Map, 16);
        writer.int8(this.Players.length);
        writer.int8(this.Episode);
        writer.int8(this.Level);
        writer.string(this.Song, 16);
        
        for (let i = 0; i < this.Players.length; i++) {
            writer.int32(this.Players[i].x);
            writer.int32(this.Players[i].y);
            writer.int32(this.Players[i].z);
            writer.int32(this.Players[i].flags);
            writer.int16(this.Players[i].ang);
        }

        writer.int16(this.Skill);
        writer.int32(this.Net.KillLimit);
        writer.int32(this.Net.TimeLimit);
        writer.int32(this.Net.TimeLimitClock);
        writer.int16(this.Net.MultiGameType);
        writer.int8(this.Net.TeamPlay);
        writer.int8(this.Net.HurtTeammate);
        writer.int8(this.Net.SpawnMarkers);
        writer.int8(this.Net.AutoAim);
        writer.int8(this.Net.NoRespawn);
        writer.int8(this.Net.Nuke);

        for (const input of this.Inputs) {
            writer.int16(input.vel);
            writer.int16(input.svel);
            writer.int8(input.angvel);
            writer.int8(input.aimvel);
            writer.int32(input.bits);
        }

        return writer.bytes;

    }

}