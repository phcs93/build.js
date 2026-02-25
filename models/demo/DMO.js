// reference: https://web.archive.org/web/20150603141920/http://www.quakewiki.net/archives/demospecs/dmo/dmo.html
Build.Models.Demo.DMO = class DMO {

    static RECSYNCBUFSIZ = 2520;
    static InputSize = 10;

    constructor(version) {
        this.Inputs = [];
        this.Version = version;
        if (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(this.Version)) {
            this.GRPVersion = [0,0,0,0];
        }
        this.Volume = 0;
        this.Level = 0;
        this.Skill = 0;
        this.Mode = 0;
        this.FriendlyFire = 0;
        this.Players = 0;
        this.Monsters = 0;
        this.RespawnMonsters = 0;
        this.RespawnItems = 0;
        this.RespawnInventory = 0;
        this.BotAI = 0;
        this.Names = [];
        this.Dummy = 0;
        this.Map = "";
        this.AimMode = [];
        this.WeaponChoice = [];        
    }

    static Unserialize(bytes) {

        const demo = new DMO();

        const reader = new Build.Scripts.ByteReader(bytes);

        demo.Inputs = new Array(reader.uint32());
        demo.Version = reader.uint8();
        if (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(demo.Version)) {
            demo.GRPVersion = reader.read(4*4);
        }
        demo.Volume = reader.uint8();
        demo.Level = reader.uint8();
        demo.Skill = reader.uint8();
        demo.Mode = reader.uint8();
        demo.FriendlyFire = reader.uint8();
        demo.Players = reader.uint16();
        demo.Monsters = reader.uint16();
        demo.RespawnMonsters = reader.uint32();
        demo.RespawnItems = reader.uint32();
        demo.RespawnInventory = reader.uint32();
        demo.BotAI = reader.uint32();
        demo.Names = new Array(demo.Players);
        for (let i = 0; i < 16; i++) {
            demo.Names[i] = reader.string(32);
        }        
        demo.Dummy = reader.int32();
        demo.Map = reader.string(128);
        demo.AimMode = new Array(demo.Players);
        demo.WeaponChoice = new Array(demo.Players);
        for (let i = 0; i < demo.Players; i++) {
            demo.AimMode[i] = reader.int8();
            if (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(demo.Version)) {
                demo.WeaponChoice[i] = new Array(12);
                for (let w = 0; w < 12; w++) {
                    demo.WeaponChoice[i][w] = reader.uint32();
                }
            }
        }

        let i = 0;

        while (i < demo.Inputs.length) {

            const size = Math.min(demo.Inputs.length - i, DMO.RECSYNCBUFSIZ);
            const _reader = new Build.Scripts.ByteReader(reader.kdfread(DMO.InputSize * demo.Players, size / demo.Players));
            
            for (let _i = 0; _i < size; _i++) {
                demo.Inputs[i++] = {
                    avel: _reader.int8(),
                    horz: _reader.int8(),
                    fvel: _reader.int16(),
                    svel: _reader.int16(),
                    bits: _reader.uint32()
                };

            }

        }

        return demo;

    }

    static Serialize(demo) {

        const headerSize =
            4 +                     // Inputs count (uint32)
            1 +                     // Version
            (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(demo.Version) ? 16 : 0) + // GRPVersion bruto
            1 + 1 + 1 + 1 + 1 +     // Volume, Level, Skill, Mode, FriendlyFire
            2 + 2 +                 // Players, Monsters
            4 + 4 + 4 + 4 +         // RespawnMonsters, RespawnItems, RespawnInventory, BotAI
            16 * 32 +               // Names[16] (cada 32 bytes)
            4 +                     // Dummy
            128 +                   // Map (128 bytes)
            demo.Players +               // AimMode[Players] (int8)
            (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(demo.Version) ? demo.Players * 12 * 4 : 0); // WeaponChoice

        const writer = new Build.Scripts.ByteWriter(
            headerSize + 
            (demo.Inputs.length * DMO.InputSize) +
            (Math.ceil((demo.Inputs.length * DMO.InputSize) / Build.Scripts.LZW.size) *  (4096 + 2))
        );

        // ----- Cabeçalho -----

        // número de inputs
        writer.int32(demo.Inputs.length);

        // versão
        writer.int8(demo.Version | 0);

        // GRPVersion (bruto) só se Version == 119 (XDUKE_19_7)
        if (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(demo.Version)) {
            let grp = demo.GRPVersion;
            if (!(grp instanceof Uint8Array)) {
                grp = grp ? Uint8Array.from(grp) : new Uint8Array(16);
            }
            if (grp.length !== 16) {
                grp = grp.slice(0, 16);
            }
            writer.write(grp);
        }

        // campos simples
        writer.int8(demo.Volume | 0);
        writer.int8(demo.Level | 0);
        writer.int8(demo.Skill | 0);
        writer.int8(demo.Mode | 0);
        writer.int8(demo.FriendlyFire | 0);

        writer.int16(demo.Players & 0xFFFF);
        writer.int16(demo.Monsters & 0xFFFF);

        writer.int32(demo.RespawnMonsters >>> 0);
        writer.int32(demo.RespawnItems >>> 0);
        writer.int32(demo.RespawnInventory >>> 0);
        writer.int32(demo.BotAI >>> 0);

        // 16 nomes de 32 bytes cada (sempre 16, igual ao constructor)
        for (let i = 0; i < 16; i++) {
            const name = (demo.Names && demo.Names[i]) ? demo.Names[i] : "";
            writer.string(name, 32);
        }

        // Dummy
        writer.int32((demo.Dummy | 0));

        // Map (128 bytes, padded com '\0')
        writer.string(demo.Map || "", 128);

        // AimMode[Players]
        for (let i = 0; i < demo.Players; i++) {
            const v = (demo.AimMode && demo.AimMode[i] != null) ? demo.AimMode[i] : 0;
            writer.int8(v | 0);
        }

        // WeaponChoice[Players][12] se Version == 119
        if (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(demo.Version)) {
            for (let i = 0; i < demo.Players; i++) {
                const wcRow = (demo.WeaponChoice && demo.WeaponChoice[i]) || [];
                for (let w = 0; w < 12; w++) {
                    const val = wcRow[w] != null ? wcRow[w] : 0;
                    writer.int32(val >>> 0);
                }
            }
        }

        // ----- Inputs comprimidos (dfwrite inverso do kdfread) -----

        if (demo.Inputs.length > 0 && demo.Players > 0) {

            let i = 0;

            while (i < demo.Inputs.length) {

                const size = Math.min(demo.Inputs.length - i, DMO.RECSYNCBUFSIZ);

                // buffer descomprimido para este bloco: size * 10 bytes
                const buf = new Uint8Array(size * 10);
                let off = 0;

                for (let _i = 0; _i < size; _i++) {
                    const input = demo.Inputs[i + _i] || {};

                    const avel = (input.avel | 0);
                    const horz = (input.horz | 0);
                    const fvel = (input.fvel | 0);
                    const svel = (input.svel | 0);
                    const bits = (input.bits >>> 0);

                    // int8 avel
                    buf[off++] = avel & 0xFF;
                    // int8 horz
                    buf[off++] = horz & 0xFF;

                    // int16 fvel (little-endian)
                    buf[off++] = fvel & 0xFF;
                    buf[off++] = (fvel >> 8) & 0xFF;

                    // int16 svel (little-endian)
                    buf[off++] = svel & 0xFF;
                    buf[off++] = (svel >> 8) & 0xFF;

                    // uint32 bits (little-endian)
                    buf[off++] = bits & 0xFF;
                    buf[off++] = (bits >> 8) & 0xFF;
                    buf[off++] = (bits >> 16) & 0xFF;
                    buf[off++] = (bits >> 24) & 0xFF;
                }

                // Mesmos parâmetros do kdfread no constructor:
                //   kdfread(10 * demo.Players, size / demo.Players)
                writer.dfwrite(buf, 10 * demo.Players, size / demo.Players);

                i += size;
            }
        }

        // Retorna apenas a parte usada do buffer
        return writer.bytes.subarray(0, writer.index);

    }

}