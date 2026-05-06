// reference: https://web.archive.org/web/20150603141920/http://www.quakewiki.net/archives/demospecs/dmo/dmo.html
Build.Models.Demo.DMO = class DMO extends Build.Models.Demo {

    static RECSYNCBUFSIZ = 2520;
    static InputSize = 10;

    constructor(bytes) {
        
        super();

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Inputs = new Array(bytes ? reader.uint32() : 0);
        this.Version = bytes ? reader.uint8() : 0;

        if (!Build.Enums.ByteVersion.DOSDUKE(this.Version) && !Build.Enums.ByteVersion.RR(this.Version)) {
            this.GRPVersion = reader.read(4 * 4);
        }
        
        this.Volume = bytes ? reader.uint8() : 0;
        this.Level = bytes ? reader.uint8() : 0;
        this.Skill = bytes ? reader.uint8() : 0;
        this.Mode = bytes ? reader.uint8() : 0;
        this.FriendlyFire = bytes ? reader.uint8() : 0;
        this.Players = bytes ? reader.uint16() : 0;
        this.Monsters = bytes ? reader.uint16() : 0;
        this.RespawnMonsters = bytes ? reader.uint32() : 0;
        this.RespawnItems = bytes ? reader.uint32() : 0;
        this.RespawnInventory = bytes ? reader.uint32() : 0;
        this.BotAI = bytes ? reader.uint32() : 0;
        this.Names = new Array(16);

        if (bytes) {
            for (let i = 0; i < 16; i++) {
                this.Names[i] = reader.string(32);
            }
        }

        if (!Build.Enums.ByteVersion.RR(this.Version)) {
            this.Dummy = bytes ? reader.int32() : 0;
            this.Map = bytes ? reader.string(128) : "";
        }

        this.AimMode = new Array(this.Players);
        this.WeaponChoice = new Array(this.Players);

        for (let i = 0; i < this.Players; i++) {
            this.AimMode[i] = reader.int8();
            if (!Build.Enums.ByteVersion.DOSDUKE(this.Version) && !Build.Enums.ByteVersion.RR(this.Version)) {
                this.WeaponChoice[i] = new Array(12);
                for (let w = 0; w < 12; w++) {
                    this.WeaponChoice[i][w] = reader.uint32();
                }
            }
        }

        let i = 0;

        while (i < this.Inputs.length) {

            const size = Math.min(this.Inputs.length - i, DMO.RECSYNCBUFSIZ);
            const inputReader = new Build.Scripts.ByteReader(reader.kdfread(DMO.InputSize * this.Players, size / this.Players));

            for (let s = 0; s < size; s++) {
                this.Inputs[i++] = {
                    avel: inputReader.int8(),
                    horz: inputReader.int8(),
                    fvel: inputReader.int16(),
                    svel: inputReader.int16(),
                    bits: inputReader.uint32()
                };
            }

        }

    }

    Serialize() {

        const writer = new Build.Scripts.ByteWriter();

        writer.int32(this.Inputs.length);
        writer.int8(this.Version);

        if (!Build.Enums.ByteVersion.DOSDUKE(this.Version) && !Build.Enums.ByteVersion.RR(this.Version)) {
            writer.write(this.GRPVersion);
        }

        writer.int8(this.Volume);
        writer.int8(this.Level);
        writer.int8(this.Skill);
        writer.int8(this.Mode);
        writer.int8(this.FriendlyFire);
        writer.int16(this.Players);
        writer.int16(this.Monsters);
        writer.int32(this.RespawnMonsters);
        writer.int32(this.RespawnItems);
        writer.int32(this.RespawnInventory);
        writer.int32(this.BotAI);

        for (let i = 0; i < 16; i++) {
            writer.string(this.Names[i], 32);
        }

        if (!Build.Enums.ByteVersion.RR(this.Version)) {
            writer.int32(this.Dummy);
            writer.string(this.Map, 128);
        }

        for (let i = 0; i < this.Players; i++) {
            writer.int8(this.AimMode[i]);
            if (!Build.Enums.ByteVersion.DOSDUKE(this.Version) && !Build.Enums.ByteVersion.RR(this.Version)) {
                for (let w = 0; w < 12; w++) {
                    writer.int32(this.WeaponChoice[i][w]);
                }
            }
        }

        let i = 0;

        while (i < this.Inputs.length) {

            const size = Math.min(this.Inputs.length - i, DMO.RECSYNCBUFSIZ);

            const inputWriter = new Build.Scripts.ByteWriter();

            for (let s = 0; s < size; s++) {
                const input = this.Inputs[i];
                inputWriter.int8(input.avel);
                inputWriter.int8(input.horz);
                inputWriter.int16(input.fvel);
                inputWriter.int16(input.svel);
                inputWriter.int32(input.bits);
                i++;
            }

            writer.dfwrite(inputWriter.bytes, DMO.InputSize * this.Players, size / this.Players);

        }

        return writer.bytes;        

    }

}