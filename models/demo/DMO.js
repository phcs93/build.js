// reference: https://web.archive.org/web/20150603141920/http://www.quakewiki.net/archives/demospecs/dmo/dmo.html
Build.Models.Demo.DMO = class DMO {

    static RECSYNCBUFSIZ = 2520;
    static InputSize = 10;

    constructor(version) {
        this.Inputs = [];
        this.Version = version;
        if (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(this.Version)) {
            this.GRPVersion = new Uint8Array(16);
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

        const demo = new Build.Models.Demo.DMO();

        const reader = new Build.Scripts.ByteReader(bytes);

        demo.Inputs = new Array(reader.uint32());
        demo.Version = reader.uint8();
        if (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(demo.Version)) {
            demo.GRPVersion = reader.read(4 * 4);
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
        demo.Names = new Array(16);
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

        let headerSize = 4 + 1; 
        if (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(demo.Version)) headerSize += 16;
        headerSize += 5;                    
        headerSize += 4;                    
        headerSize += 16;                   
        headerSize += 16 * 32;              
        headerSize += 4;                    
        headerSize += 128;                  
        headerSize += demo.Players;         
        if (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(demo.Version)) {
            headerSize += demo.Players * 12 * 4;
        }

        const headerWriter = new Build.Scripts.ByteWriter(headerSize + 1024);

        headerWriter.int32(demo.Inputs.length);
        headerWriter.int8(demo.Version | 0);

        if (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(demo.Version)) {
            let grp = demo.GRPVersion || new Uint8Array(16);
            if (!(grp instanceof Uint8Array)) grp = Uint8Array.from(grp);
            headerWriter.write(grp.slice(0, 16));
        }

        headerWriter.int8(demo.Volume | 0);
        headerWriter.int8(demo.Level | 0);
        headerWriter.int8(demo.Skill | 0);
        headerWriter.int8(demo.Mode | 0);
        headerWriter.int8(demo.FriendlyFire | 0);

        headerWriter.int16(demo.Players & 0xFFFF);
        headerWriter.int16(demo.Monsters & 0xFFFF);

        headerWriter.int32(demo.RespawnMonsters >>> 0);
        headerWriter.int32(demo.RespawnItems >>> 0);
        headerWriter.int32(demo.RespawnInventory >>> 0);
        headerWriter.int32(demo.BotAI >>> 0);

        for (let i = 0; i < 16; i++) {
            headerWriter.string((demo.Names && demo.Names[i]) || "", 32);
        }

        headerWriter.int32(demo.Dummy | 0);
        headerWriter.string(demo.Map || "", 128);

        for (let i = 0; i < demo.Players; i++) {
            headerWriter.int8((demo.AimMode && demo.AimMode[i] != null) ? (demo.AimMode[i] | 0) : 0);
        }

        if (Build.Enums.ByteVersion.XDUKE_19_7_OR_HDUKE(demo.Version)) {
            for (let i = 0; i < demo.Players; i++) {
                const row = (demo.WeaponChoice && demo.WeaponChoice[i]) || new Array(12).fill(0);
                for (let w = 0; w < 12; w++) {
                    headerWriter.int32((row[w] != null ? row[w] : 0) >>> 0);
                }
            }
        }

        const chunks = [headerWriter.bytes.subarray(0, headerWriter.index)];

        if (demo.Inputs.length > 0 && demo.Players > 0) {
            let pos = 0;

            while (pos < demo.Inputs.length) {
                let count = Math.min(demo.Inputs.length - pos, DMO.RECSYNCBUFSIZ);
                count = Math.floor(count / demo.Players) * demo.Players;
                if (count <= 0) break;

                const buf = new Uint8Array(count * DMO.InputSize);
                let off = 0;

                for (let j = 0; j < count; j++) {
                    const inp = demo.Inputs[pos + j] || {};

                    buf[off++] = (inp.avel | 0) & 0xFF;
                    buf[off++] = (inp.horz | 0) & 0xFF;

                    let v = inp.fvel | 0;
                    buf[off++] = v & 0xFF;
                    buf[off++] = (v >> 8) & 0xFF;

                    v = inp.svel | 0;
                    buf[off++] = v & 0xFF;
                    buf[off++] = (v >> 8) & 0xFF;

                    v = inp.bits >>> 0;
                    buf[off++] = v & 0xFF;
                    buf[off++] = (v >> 8) & 0xFF;
                    buf[off++] = (v >> 16) & 0xFF;
                    buf[off++] = (v >> 24) & 0xFF;
                }

                const tempWriter = new Build.Scripts.ByteWriter(65536);
                tempWriter.dfwrite(buf, DMO.InputSize * demo.Players, count / demo.Players);
                chunks.push(tempWriter.bytes.subarray(0, tempWriter.index));

                pos += count;
            }
        }

        const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return result;

    }

}