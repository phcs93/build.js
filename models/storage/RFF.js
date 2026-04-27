// reference: https://github.com/camoto-project/gamearchivejs/blob/master/formats/arc-rff-blood-common.js
Build.Models.Storage.RFF = class RFF extends Build.Models.Storage {

    // sizes
    static HeaderSize = 32;
    static FileHeaderSize = 48;

    // util
    static toUnixTime = d => d.valueOf() / 1000 - new Date().getTimezoneOffset() * 60;

    constructor(bytes) {

        super([]);    

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Signature = bytes ? reader.string(4) : "RFF\x1a";
        this.Version = bytes ? reader.uint16() : 0x0300;
        this.Padding1 = bytes ? reader.read(2) : new Array(2).fill(0);
        this.FileHeadersOffset = bytes ? reader.uint32() : 0;
        this.Files = new Array(bytes ? reader.uint32() : 0);
        this.Padding2 = bytes ? reader.read(16) : new Array(16).fill(0);

        let fileHeadersBytes = reader.bytes.slice(this.FileHeadersOffset, this.FileHeadersOffset + this.Files.length * RFF.FileHeaderSize);

        // 0x0200 - shareware 0.99 (CD version) - FAT is not encrypted
        // 0x0300 - registered 1.00 - FAT is encrypted
        // 0x0301 - patches for registered and later shareware releases - FAT is encrypted
        if (this.Version > 0x0200) {
            // decrypt chunk of file headers bytes (these are located AFTER the file contents)
            fileHeadersBytes = Build.Scripts.ENCXOR.Compute(fileHeadersBytes, {
                seed: this.FileHeadersOffset & 0xFF,
                offset: 0,
                limit: 0,
                shift: 1 // used by my custom hybrid implementation
            });
        }

        const fileHeaderReader = new Build.Scripts.ByteReader(fileHeadersBytes);

        // read files headers
        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i] = {
                cache: fileHeaderReader.read(16),
                offset: fileHeaderReader.uint32(),
                size: fileHeaderReader.uint32(),
                packedSize: fileHeaderReader.uint32(),
                time: fileHeaderReader.uint32(),
                flags: fileHeaderReader.uint8(),
                type: fileHeaderReader.string(3),
                name: fileHeaderReader.string(8),
                id: fileHeaderReader.uint32(),
                bytes: []
            };
            // just for better readability -> this needs to be undone when writing back
            this.Files[i].name += `.${this.Files[i].type}`;
        }

        // read files contents
        for (let i = 0; i < this.Files.length; i++) {
            const bytes = reader.bytes.slice(this.Files[i].offset, this.Files[i].offset + this.Files[i].size);
            // check if file needs to be decrypted
            if (this.Files[i].flags & 16) {
                // decrypt file bytes
                this.Files[i].bytes = Build.Scripts.ENCXOR.Compute(bytes, { 
                    seed: 0, 
                    offset: 0, 
                    limit: 256, 
                    shift: 1 // used by my custom hybrid implementation
                });
            } else {
                // otherwise just copy bytes
                this.Files[i].bytes = bytes;
            }
        }

    }

    Serialize () {

        // file content size offsets (initialize pointing to after the rff header)
        this.FileHeadersOffset = RFF.HeaderSize;

        // process file contents before performing any calculations
        for (let i = 0; i < this.Files.length; i++) {
            // check if file needs to be encrypted
            if (this.Files[i].flags & 16) {
                // encrypt file bytes
                this.Files[i].bytes = Build.Scripts.ENCXOR.Compute(this.Files[i].bytes, { 
                    seed: 0, 
                    offset: 0, 
                    limit: 256, 
                    shift: 1 // used by my custom hybrid implementation
                });
            }
            this.Files[i].size = this.Files[i].bytes.length;
            this.Files[i].offset = this.FileHeadersOffset;
            this.FileHeadersOffset += this.Files[i].size;
        }

        const writer = new Build.Scripts.ByteWriter();

        writer.string(this.Signature, 4);
        writer.int16(this.Version);
        writer.write(this.Padding1);
        writer.int32(this.FileHeadersOffset);
        writer.int32(this.Files.length);
        writer.write(this.Padding2);        
        
        // write file contents
        for (let i = 0; i < this.Files.length; i++) {            
            writer.write(this.Files[i].bytes);
        }

        const fileHeaderWriter = new Build.Scripts.ByteWriter();

        // write files headers
        for (let i = 0; i < this.Files.length; i++) {
            fileHeaderWriter.write(this.Files[i].cache || new Uint8Array(16).fill(0));
            fileHeaderWriter.int32(this.Files[i].offset);
            fileHeaderWriter.int32(this.Files[i].size);
            fileHeaderWriter.int32(this.Files[i].packedSize);
            fileHeaderWriter.int32(this.Files[i].time || RFF.toUnixTime(new Date()));
            fileHeaderWriter.int8(this.Files[i].flags);
            fileHeaderWriter.string(this.Files[i].name.split(".")[1], 3);
            fileHeaderWriter.string(this.Files[i].name.split(".")[0], 8);
            fileHeaderWriter.int32(this.Files[i].id || 0);
        }

        // 0x0200 - shareware 0.99 (CD version) - FAT is not encrypted
        // 0x0300 - registered 1.00 - FAT is encrypted
        // 0x0301 - patches for registered and later shareware releases - FAT is encrypted
        if (this.Version > 0x0200) {
            writer.write(Build.Scripts.ENCXOR.Compute(fileHeaderWriter.bytes, {
                seed: this.FileHeadersOffset & 0xFF,
                offset: 0,
                limit: 0,
                shift: 1
            }));
        }

        return writer.bytes;

    }

}