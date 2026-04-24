// reference: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/demo.cpp
Build.Models.Demo.BLD = class BLD extends Build.Models.Demo {

    static InputSize = 22;

    constructor() {
        super();
    }

    static Unserialize (bytes) {

        const bld = new Build.Models.Demo.BLD();

        const reader = new Build.Scripts.ByteReader(bytes);

        bld.Signature = reader.string(4);
        bld.Version = reader.int16();
        bld.Build = reader.int32();
        bld.Inputs = new Array(reader.int32());
        bld.Players = new Array(reader.int32());
        bld.MyConnectIndex = reader.int16();
        bld.ConnectHead = reader.int16();
        bld.ConnectPoints = new Array(8).fill(0).map(() => reader.int16());
        
        bld.GameType = reader.int8();
        bld.Difficulty = reader.int8();
        bld.Episode = reader.int32();
        bld.Level = reader.int32();
        bld.LevelName = reader.string(144);
        bld.LevelSong = reader.string(144);
        bld.TrackNumber = reader.int32();
        bld.SaveGameName = reader.string(16);
        bld.UserGameName = reader.string(16);
        bld.SaveGameSlot = reader.int16();
        bld.PicEntry = reader.int32();
        bld.MapCRC = reader.uint32();
        bld.MonsterSettings = reader.int8();
        bld.GameFlags = reader.int32();
        bld.NetGameFlags = reader.int32();
        bld.WeaponSettings = reader.int8();
        bld.ItemSettings = reader.int8();
        bld.RespawnSettings = reader.int8();
        bld.TeamSettings = reader.int8();
        bld.MonsterRespawnTime = reader.int32();
        bld.WeaponRespawnTime = reader.int32();
        bld.ItemRespawnTime = reader.int32();
        bld.SpecialRespawnTime = reader.int32();

        for (let i = 0; i < bld.Inputs.length; i++) {
            bld.Inputs[i] = reader.read(BLD.InputSize);
        }

        return bld;

    }

    static Serialize (bld) {

        const writer = new Build.Scripts.ByteWriter();

        writer.string(bld.Signature, 4);
        writer.int16(bld.Version);
        writer.int32(bld.Build);
        writer.int32(bld.Inputs.length);
        writer.int32(bld.Players.length);
        writer.int16(bld.MyConnectIndex);
        writer.int16(bld.ConnectHead);
        bld.ConnectPoints.map(v => writer.int16(v));
        
        writer.int8(bld.GameType, );
        writer.int8(bld.Difficulty, );
        writer.int32(bld.Episode, );
        writer.int32(bld.Level, );
        writer.string(bld.LevelName, 144);
        writer.string(bld.LevelSong, 144);
        writer.int32(bld.TrackNumber, );
        writer.string(bld.SaveGameName, 16);
        writer.string(bld.UserGameName, 16);
        writer.int16(bld.SaveGameSlot, );
        writer.int32(bld.PicEntry, );
        writer.int32(bld.MapCRC, );
        writer.int8(bld.MonsterSettings, );
        writer.int32(bld.GameFlags, );
        writer.int32(bld.NetGameFlags, );
        writer.int8(bld.WeaponSettings, );
        writer.int8(bld.ItemSettings, );
        writer.int8(bld.RespawnSettings, );
        writer.int8(bld.TeamSettings, );
        writer.int32(bld.MonsterRespawnTime, );
        writer.int32(bld.WeaponRespawnTime, );
        writer.int32(bld.ItemRespawnTime, );
        writer.int32(bld.SpecialRespawnTime, );

        for (let i = 0; i < bld.Inputs.length; i++) {
            writer.write(bld.Inputs[i]);
        }

        return writer.bytes;

    }

}
