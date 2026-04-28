// reference: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/demo.cpp
Build.Models.Demo.BLD = class BLD extends Build.Models.Demo {

    static InputSize = 22;

    constructor(bytes) {

        super();

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Signature = bytes ? reader.string(4) : "DEM\u001A";
        this.Version = bytes ? reader.int16() : 0;
        this.Build = bytes ? reader.int32() : 0;
        this.Inputs = new Array(bytes ? reader.int32() : 0);
        this.Players = bytes ? reader.int32() : 0;
        this.MyConnectIndex = bytes ? reader.int16() : 0;
        this.ConnectHead = bytes ? reader.int16() : 0;
        this.ConnectPoints = new Array(8).fill(0).map(() => bytes ? reader.int16() : 0);

        this.GameType = bytes ? reader.int8() : 0;
        this.Difficulty = bytes ? reader.int8() : 0;
        this.Episode = bytes ? reader.int32() : 0;
        this.Level = bytes ? reader.int32() : 0;
        this.LevelName = bytes ? reader.string(144) : 0;
        this.LevelSong = bytes ? reader.string(144) : 0;
        this.TrackNumber = bytes ? reader.int32() : 0;
        this.SaveGameName = bytes ? reader.string(16) : 0;
        this.UserGameName = bytes ? reader.string(16) : 0;
        this.SaveGameSlot = bytes ? reader.int16() : 0;
        this.PicEntry = bytes ? reader.int32() : 0;
        this.MapCRC = bytes ? reader.uint32() : 0;
        this.MonsterSettings = bytes ? reader.int8() : 0;
        this.GameFlags = bytes ? reader.int32() : 0;
        this.NetGameFlags = bytes ? reader.int32() : 0;
        this.WeaponSettings = bytes ? reader.int8() : 0;
        this.ItemSettings = bytes ? reader.int8() : 0;
        this.RespawnSettings = bytes ? reader.int8() : 0;
        this.TeamSettings = bytes ? reader.int8() : 0;
        this.MonsterRespawnTime = bytes ? reader.int32() : 0;
        this.WeaponRespawnTime = bytes ? reader.int32() : 0;
        this.ItemRespawnTime = bytes ? reader.int32() : 0;
        this.SpecialRespawnTime = bytes ? reader.int32() : 0;

        for (let i = 0; i < this.Inputs.length; i++) {
            this.Inputs[i] = reader.read(BLD.InputSize);
        }

    }

    Serialize () {

        const writer = new Build.Scripts.ByteWriter();

        writer.string(this.Signature, 4);
        writer.int16(this.Version);
        writer.int32(this.Build);
        writer.int32(this.Inputs.length);
        writer.int32(this.Players);
        writer.int16(this.MyConnectIndex);
        writer.int16(this.ConnectHead);    

        for (let i = 0; i < this.ConnectPoints.length; i++) {
            writer.int16(this.ConnectPoints[i]);
        } 

        writer.int8(this.GameType, );
        writer.int8(this.Difficulty, );
        writer.int32(this.Episode, );
        writer.int32(this.Level, );
        writer.string(this.LevelName, 144);
        writer.string(this.LevelSong, 144);
        writer.int32(this.TrackNumber, );
        writer.string(this.SaveGameName, 16);
        writer.string(this.UserGameName, 16);
        writer.int16(this.SaveGameSlot, );
        writer.int32(this.PicEntry, );
        writer.int32(this.MapCRC, );
        writer.int8(this.MonsterSettings, );
        writer.int32(this.GameFlags, );
        writer.int32(this.NetGameFlags, );
        writer.int8(this.WeaponSettings, );
        writer.int8(this.ItemSettings, );
        writer.int8(this.RespawnSettings, );
        writer.int8(this.TeamSettings, );
        writer.int32(this.MonsterRespawnTime, );
        writer.int32(this.WeaponRespawnTime, );
        writer.int32(this.ItemRespawnTime, );
        writer.int32(this.SpecialRespawnTime, );

        for (let i = 0; i < this.Inputs.length; i++) {
            writer.write(this.Inputs[i]);
        }

        return writer.bytes;

    }

}