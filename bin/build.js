/**
 * Build.js by phcs93 (LARD)
 * 
 * This library is capable of manipulating Build Engine files like GRPs, Maps, Arts, Palettes, etc...
 * It is written in pure JavaScript and can be used both in Node.js and in the browser.
 * I made this library to be the basis for my modding tools and to make it easier for other people to create their own.
 */

/**
 * setting "Build" as a global variable makes it accesible anywhere without needing to "import" or "require" it
 * this is useful when bundling the code in a lib format since it will work both on nodejs and on the browser
 * while also making the code cleaner for me to read and easier for the consumer to use it
 */
globalThis.Build = {
    Enums: {},
    Models: {},
    Scripts: {}
};

// only run this code if we are in a nodejs environment
if (process && process.versions && process.versions.node) {

    // get file system module to read the files in the directory
    const fs = require("node:fs");

    // check the npm lifecycle event to see if we are building or testing the library
    switch (process.env.npm_lifecycle_event) {

        // generate build.js file
        case "build": {

            // array to store the contents of all files
            const library = [fs.readFileSync(__dirname + '/build.js', "utf-8")];

            // this function will recursively get the contents of all the files in the given directory and its subdirectories
            function recursiveRead(dir) {

                // load the files in the current folder
                for (const entry of fs.readdirSync(dir)) {
                    const fullPath = dir + '/' + entry;
                    if (!fs.statSync(fullPath).isDirectory() && entry.endsWith('.js')) {
                        library.push(fs.readFileSync(fullPath, "utf-8"));
                    }
                }

                // load the files in the subfolders
                for (const entry of fs.readdirSync(dir)) {
                    const fullPath = dir + '/' + entry;
                    if (fs.statSync(fullPath).isDirectory()) {
                        recursiveRead(fullPath);
                    }
                }

            }

            // load the scripts, enums and models into the library array
            recursiveRead(__dirname + '/scripts');
            recursiveRead(__dirname + '/enums');
            recursiveRead(__dirname + '/models');

            // create bin folder if it doesn't exist
            if (!fs.existsSync(__dirname + '/bin')) {
                fs.mkdirSync(__dirname + '/bin');
            }

            // create full js file library output
            fs.writeFileSync(__dirname + '/bin/build.js', library.join("\n\n"), "utf-8");

            break;

        }

        // run unit tests
        case "test": {

            // this function will recursively require all the files in the given directory and its subdirectories
            function recursiveRequire(dir) {

                // load the files in the current folder
                for (const entry of fs.readdirSync(dir)) {
                    const fullPath = dir + '/' + entry;
                    if (!fs.statSync(fullPath).isDirectory() && entry.endsWith('.js')) {
                        require(fullPath);
                    }
                }

                // load the files in the subfolders
                for (const entry of fs.readdirSync(dir)) {
                    const fullPath = dir + '/' + entry;
                    if (fs.statSync(fullPath).isDirectory()) {
                        recursiveRequire(fullPath);
                    }
                }

            }

            // load the scripts, enums and models in the "build" folder
            recursiveRequire(__dirname + '/scripts');
            recursiveRequire(__dirname + '/enums');
            recursiveRequire(__dirname + '/models');

        }

        // if we are not building or testing, just export the Build variable as a module (in case someone requires or imports this file)
        default: {
            module.exports = Build;
            break;
        }

    }

}

Build.Scripts.BitReader = class BitReader {

    constructor(number, bits = 32) {
        const mask = bits === 32 ? 0xFFFFFFFF : (1 << bits) - 1
        this.value = number & mask;
        this.index = 0;
    }

    uint(bits) {
        const mask = bits === 32 ? 0xFFFFFFFF : (1 << bits) - 1;
        const val = (this.value >>> this.index) & mask;
        this.index += bits;
        return val;
    }

    int(bits) {
        const val = this.uint(bits);
        const shift = 32 - bits;
        return (val << shift) >> shift;
    }

}

Build.Scripts.BitWriter = class BitWriter {

    constructor() {
        this.value = 0 >>> 0;
        this.index = 0;
    }

    uint(bits, value) {
        const mask = (1 << bits) - 1;
        this.value = (this.value & ~(mask << this.index)) | ((value & mask) << this.index);
        this.index += bits;
    }

    int(bits, value) {
        this.uint(bits, value);
    }

}

Build.Scripts.ByteReader = class ByteReader {

    constructor(bytes) {
        this.bytes = new Uint8Array(bytes);
        this.index = 0;
    }
    
    shift(n) { return this.bytes[this.index++] << n; }
    int8() { return (this.shift(0) << 24) >> 24; }
    int16() { return (this.shift(0) | this.shift(8)) << 16 >> 16; }
    int32() { return this.shift(0) | this.shift(8) | this.shift(16) | this.shift(24); }
    uint8()  { return this.int8() & 0xFF; }
    uint16() { return this.int16() & 0xFFFF; }
    uint32() { return this.int32() >>> 0; }

    // it's important that we don't discard null bytes (\0) so we preserve even the "garbage" from the buffer
    string(length) { return new Array(length).fill(0).map(() => String.fromCharCode(this.bytes[this.index++])).join(""); }

    read(length) { return this.bytes.slice(this.index, this.index += length); }

    // by chatgpt (based on kdfread from build engine code itself)
    kdfread(dasizeof, count) {

        if (dasizeof > Build.Scripts.LZW.size) {
            count = count * dasizeof;
            dasizeof = 1;
        }

        const totalSize = dasizeof * count;
        const out = new Uint8Array(totalSize);

        let leng = this.uint16();
        let comp = this.read(leng);
        let lzw = Build.Scripts.LZW.uncompress(comp);
        let k = 0;
        let kgoal = lzw.length;

        out.set(lzw.subarray(0, dasizeof), 0);
        k += dasizeof;

        for (let i = 1; i < count; i++) {
            if (k >= kgoal) {
                leng = this.uint16();
                comp = this.read(leng);
                lzw = Build.Scripts.LZW.uncompress(comp);
                k = 0;
                kgoal = lzw.length;
            }

            const prevBase = (i - 1) * dasizeof;
            const currBase = i * dasizeof;

            for (let j = 0; j < dasizeof; j++) {
                out[currBase + j] =
                    (out[prevBase + j] + lzw[k + j]) & 0xFF;
            }

            k += dasizeof;
        }

        return out;

    }

}

Build.Scripts.ByteWriter = class ByteWriter {

    // private attributes
    #bytes = new Uint8Array(1024);
    #index = 0;

    // getters here to protect bytes and index from being modified from the outside
    get bytes() { return this.#bytes.slice(0, this.#index); }
    get index() { return this.#index; }

    // this function ensures that the internal byte array has necessary size
    #ensure(incoming) {

        // if incoming bytes fit in the array -> do nothing
        if (this.#index + incoming <= this.#bytes.length) return;

        // set variable to calculate new size
        let capacity = this.#bytes.length;

        // while capacity can't fit incoming bytes
        while (capacity < this.#index + incoming) {

            // double the capacity
            capacity *= 2;

        }

        // create new buffer array
        const bytes = new Uint8Array(capacity);

        // copy only used bytes from old buffer
        bytes.set(this.#bytes.subarray(0, this.#index), 0);

        // set new buffer
        this.#bytes = bytes;

    }

    // write incoming bytes to internal buffer
    write(bytes) {

        // ensure internal buffer size
        this.#ensure(bytes.length);

        // using .set is incredibly fast and necessary otherwise we would get a stack overflow
        this.#bytes.set(bytes, this.#index); this.#index += bytes.length;

    }

    // type helpers
    int8(v) { this.write([v & 0xFF]); }
    int16(v) { this.write([v & 0xFF, (v >> 8) & 0xFF]); }
    int32(v) { this.write([v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF]); }
    string(string, length) { this.write([...string.padEnd(length, "\0").slice(0, length)].map(c => c.charCodeAt(0))); }

    // by chatgpt (based on dfwrite from build engine code itself)
    dfwrite(buffer, dasizeof, count) {

        if (!buffer || count <= 0) return;

        let ptr;
        if (buffer instanceof Uint8Array) ptr = buffer;
        else if (buffer.buffer instanceof ArrayBuffer) ptr = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        else if (buffer instanceof ArrayBuffer) ptr = new Uint8Array(buffer);
        else ptr = Uint8Array.from(buffer);

        if (dasizeof > Build.Scripts.LZW.size) { count *= dasizeof; dasizeof = 1; }

        const diffBuf = new Uint8Array(Build.Scripts.LZW.size);
        let k = 0;

        const compressChunk = () => {
            if (k <= 0) return;
            const comp = Build.Scripts.LZW.compress(diffBuf.subarray(0, k));
            this.int16(comp.length);
            this.write(comp);
            k = 0;
        };

        diffBuf.set(ptr.subarray(0, dasizeof), 0);
        k = dasizeof;

        if (k > Build.Scripts.LZW.size - dasizeof) compressChunk();

        for (let i = 1; i < count; i++) {
            const prevBase = (i - 1) * dasizeof;
            const currBase = i * dasizeof;
            for (let j = 0; j < dasizeof; j++) diffBuf[k + j] = (ptr[currBase + j] - ptr[prevBase + j]) & 0xFF;
            k += dasizeof;
            if (k > Build.Scripts.LZW.size - dasizeof) compressChunk();
        }

        compressChunk();

    }

}

Build.Scripts.CRC32 = {

    Table: (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c >>> 0;
        }
        return table;
    })(),

    Compute(data) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc = Build.Scripts.CRC32.Table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

}

Build.Scripts.DateTime = {

    DecodeDosDateTime (date, time) {
        const day = date & 0x1F;
        const month = (date >> 5) & 0x0F;
        const year = ((date >> 9) & 0x7F) + 1980;
        const second = (time & 0x1F) * 2;
        const minute = (time >> 5) & 0x3F;
        const hour = (time >> 11) & 0x1F;
        return new Date(year, month - 1, day, hour, minute, second);
    },

    EncodeDosDateTime (datetime) {
        const year = datetime.getFullYear();
        const month = datetime.getMonth() + 1;
        const day = datetime.getDate();
        const hours = datetime.getHours();
        const minutes = datetime.getMinutes();
        const seconds = Math.floor(datetime.getSeconds() / 2);
        const date = ((year - 1980) << 9) | (month << 5) | day;
        const time = (hours << 11) | (minutes << 5) | seconds;
        return { date, time };
    },

    ToUnixDateTime (date) {
        return date.valueOf() / 1000 - new Date().getTimezoneOffset() * 60;
    }

}

// this is a hybrid implementation of both algorithms used by blood files
// enc xor used in rff files: https://github.com/camoto-project/gamecompjs/blob/master/formats/enc-xor-blood.js
// dbcrypt used in blm (maps) files: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L203

Build.Scripts.ENCXOR = {

    Compute: (bytes, options = {}) => {

        const output = Uint8Array.from(bytes);

        let key = parseInt(options.key ?? options.seed ?? 0);

        const offset = parseInt(options.offset ?? 0);
        const shift  = parseInt(options.shift ?? 0);
        const limit  = options.limit === undefined ? 0 : parseInt(options.limit);

        const length = limit === 0 ? bytes.length : Math.min(limit, bytes.length);

        for (let i = 0; i < length; i++) {

            const value = (key + ((i + offset) >> shift)) & 0xFF;
            output[i] ^= value;

        }

        return output;

    }

}

Build.Scripts.FFlate = (function(){var _e={};"use strict";var t=(typeof module!='undefined'&&typeof exports=='object'?function(_f){"use strict";var e,t=";var __w=require('worker_threads');__w.parentPort.on('message',function(m){onmessage({data:m})}),postMessage=function(m,t){__w.parentPort.postMessage(m,t)},close=process.exit;self=global";try{e=require("worker_threads").Worker}catch(e){}exports.default=e?function(r,n,o,a,s){var u=!1,i=new e(r+t,{eval:!0}).on("error",(function(e){return s(e,null)})).on("message",(function(e){return s(null,e)})).on("exit",(function(e){e&&!u&&s(Error("exited with code "+e),null)}));return i.postMessage(o,a),i.terminate=function(){return u=!0,e.prototype.terminate.call(i)},i}:function(e,t,r,n,o){setImmediate((function(){return o(Error("async operations unsupported - update to Node 12+ (or Node 10-11 with the --experimental-worker CLI flag)"),null)}));var a=function(){};return{terminate:a,postMessage:a}};return _f}:function(_f){"use strict";var e={};_f.default=function(r,t,s,a,n){var o=new Worker(e[t]||(e[t]=URL.createObjectURL(new Blob([r+';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'],{type:"text/javascript"}))));return o.onmessage=function(e){var r=e.data,t=r.$e$;if(t){var s=Error(t[0]);s.code=t[1],s.stack=t[2],n(s,null)}else n(null,r)},o.postMessage(s,a),o};return _f})({}),n=Uint8Array,r=Uint16Array,e=Int32Array,i=new n([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),o=new n([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),s=new n([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),a=function(t,n){for(var i=new r(31),o=0;o<31;++o)i[o]=n+=1<<t[o-1];var s=new e(i[30]);for(o=1;o<30;++o)for(var a=i[o];a<i[o+1];++a)s[a]=a-i[o]<<5|o;return{b:i,r:s}},u=a(i,2),h=u.b,f=u.r;h[28]=258,f[258]=28;for(var l=a(o,0),c=l.b,p=l.r,v=new r(32768),d=0;d<32768;++d){var g=(43690&d)>>1|(21845&d)<<1;v[d]=((65280&(g=(61680&(g=(52428&g)>>2|(13107&g)<<2))>>4|(3855&g)<<4))>>8|(255&g)<<8)>>1}var y=function(t,n,e){for(var i=t.length,o=0,s=new r(n);o<i;++o)t[o]&&++s[t[o]-1];var a,u=new r(n);for(o=1;o<n;++o)u[o]=u[o-1]+s[o-1]<<1;if(e){a=new r(1<<n);var h=15-n;for(o=0;o<i;++o)if(t[o])for(var f=o<<4|t[o],l=n-t[o],c=u[t[o]-1]++<<l,p=c|(1<<l)-1;c<=p;++c)a[v[c]>>h]=f}else for(a=new r(i),o=0;o<i;++o)t[o]&&(a[o]=v[u[t[o]-1]++]>>15-t[o]);return a},m=new n(288);for(d=0;d<144;++d)m[d]=8;for(d=144;d<256;++d)m[d]=9;for(d=256;d<280;++d)m[d]=7;for(d=280;d<288;++d)m[d]=8;var b=new n(32);for(d=0;d<32;++d)b[d]=5;var w=y(m,9,0),x=y(m,9,1),z=y(b,5,0),k=y(b,5,1),M=function(t){for(var n=t[0],r=1;r<t.length;++r)t[r]>n&&(n=t[r]);return n},S=function(t,n,r){var e=n/8|0;return(t[e]|t[e+1]<<8)>>(7&n)&r},A=function(t,n){var r=n/8|0;return(t[r]|t[r+1]<<8|t[r+2]<<16)>>(7&n)},T=function(t){return(t+7)/8|0},D=function(t,r,e){return(null==r||r<0)&&(r=0),(null==e||e>t.length)&&(e=t.length),new n(t.subarray(r,e))};_e.FlateErrorCode={UnexpectedEOF:0,InvalidBlockType:1,InvalidLengthLiteral:2,InvalidDistance:3,StreamFinished:4,NoStreamHandler:5,InvalidHeader:6,NoCallback:7,InvalidUTF8:8,ExtraFieldTooLong:9,InvalidDate:10,FilenameTooLong:11,StreamFinishing:12,InvalidZipData:13,UnknownCompressionMethod:14};var C=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],I=function(t,n,r){var e=Error(n||C[t]);if(e.code=t,Error.captureStackTrace&&Error.captureStackTrace(e,I),!r)throw e;return e},U=function(t,r,e,a){var u=t.length,f=a?a.length:0;if(!u||r.f&&!r.l)return e||new n(0);var l=!e,p=l||2!=r.i,v=r.i;l&&(e=new n(3*u));var d=function(t){var r=e.length;if(t>r){var i=new n(Math.max(2*r,t));i.set(e),e=i}},g=r.f||0,m=r.p||0,b=r.b||0,w=r.l,z=r.d,C=r.m,U=r.n,F=8*u;do{if(!w){g=S(t,m,1);var E=S(t,m+1,3);if(m+=3,!E){var Z=t[(J=T(m)+4)-4]|t[J-3]<<8,q=J+Z;if(q>u){v&&I(0);break}p&&d(b+Z),e.set(t.subarray(J,q),b),r.b=b+=Z,r.p=m=8*q,r.f=g;continue}if(1==E)w=x,z=k,C=9,U=5;else if(2==E){var O=S(t,m,31)+257,G=S(t,m+10,15)+4,L=O+S(t,m+5,31)+1;m+=14;for(var H=new n(L),j=new n(19),N=0;N<G;++N)j[s[N]]=S(t,m+3*N,7);m+=3*G;var P=M(j),B=(1<<P)-1,Y=y(j,P,1);for(N=0;N<L;){var J,K=Y[S(t,m,B)];if(m+=15&K,(J=K>>4)<16)H[N++]=J;else{var Q=0,R=0;for(16==J?(R=3+S(t,m,3),m+=2,Q=H[N-1]):17==J?(R=3+S(t,m,7),m+=3):18==J&&(R=11+S(t,m,127),m+=7);R--;)H[N++]=Q}}var V=H.subarray(0,O),W=H.subarray(O);C=M(V),U=M(W),w=y(V,C,1),z=y(W,U,1)}else I(1);if(m>F){v&&I(0);break}}p&&d(b+131072);for(var X=(1<<C)-1,$=(1<<U)-1,_=m;;_=m){var tt=(Q=w[A(t,m)&X])>>4;if((m+=15&Q)>F){v&&I(0);break}if(Q||I(2),tt<256)e[b++]=tt;else{if(256==tt){_=m,w=null;break}var nt=tt-254;tt>264&&(nt=S(t,m,(1<<(it=i[N=tt-257]))-1)+h[N],m+=it);var rt=z[A(t,m)&$],et=rt>>4;if(rt||I(3),m+=15&rt,W=c[et],et>3){var it=o[et];W+=A(t,m)&(1<<it)-1,m+=it}if(m>F){v&&I(0);break}p&&d(b+131072);var ot=b+nt;if(b<W){var st=f-W,at=Math.min(W,ot);for(st+b<0&&I(3);b<at;++b)e[b]=a[st+b]}for(;b<ot;++b)e[b]=e[b-W]}}r.l=w,r.p=_,r.b=b,r.f=g,w&&(g=1,r.m=C,r.d=z,r.n=U)}while(!g);return b!=e.length&&l?D(e,0,b):e.subarray(0,b)},F=function(t,n,r){var e=n/8|0;t[e]|=r<<=7&n,t[e+1]|=r>>8},E=function(t,n,r){var e=n/8|0;t[e]|=r<<=7&n,t[e+1]|=r>>8,t[e+2]|=r>>16},Z=function(t,e){for(var i=[],o=0;o<t.length;++o)t[o]&&i.push({s:o,f:t[o]});var s=i.length,a=i.slice();if(!s)return{t:N,l:0};if(1==s){var u=new n(i[0].s+1);return u[i[0].s]=1,{t:u,l:1}}i.sort((function(t,n){return t.f-n.f})),i.push({s:-1,f:25001});var h=i[0],f=i[1],l=0,c=1,p=2;for(i[0]={s:-1,f:h.f+f.f,l:h,r:f};c!=s-1;)h=i[i[l].f<i[p].f?l++:p++],f=i[l!=c&&i[l].f<i[p].f?l++:p++],i[c++]={s:-1,f:h.f+f.f,l:h,r:f};var v=a[0].s;for(o=1;o<s;++o)a[o].s>v&&(v=a[o].s);var d=new r(v+1),g=q(i[c-1],d,0);if(g>e){o=0;var y=0,m=g-e,b=1<<m;for(a.sort((function(t,n){return d[n.s]-d[t.s]||t.f-n.f}));o<s;++o){var w=a[o].s;if(!(d[w]>e))break;y+=b-(1<<g-d[w]),d[w]=e}for(y>>=m;y>0;){var x=a[o].s;d[x]<e?y-=1<<e-d[x]++-1:++o}for(;o>=0&&y;--o){var z=a[o].s;d[z]==e&&(--d[z],++y)}g=e}return{t:new n(d),l:g}},q=function(t,n,r){return-1==t.s?Math.max(q(t.l,n,r+1),q(t.r,n,r+1)):n[t.s]=r},O=function(t){for(var n=t.length;n&&!t[--n];);for(var e=new r(++n),i=0,o=t[0],s=1,a=function(t){e[i++]=t},u=1;u<=n;++u)if(t[u]==o&&u!=n)++s;else{if(!o&&s>2){for(;s>138;s-=138)a(32754);s>2&&(a(s>10?s-11<<5|28690:s-3<<5|12305),s=0)}else if(s>3){for(a(o),--s;s>6;s-=6)a(8304);s>2&&(a(s-3<<5|8208),s=0)}for(;s--;)a(o);s=1,o=t[u]}return{c:e.subarray(0,i),n:n}},G=function(t,n){for(var r=0,e=0;e<n.length;++e)r+=t[e]*n[e];return r},L=function(t,n,r){var e=r.length,i=T(n+2);t[i]=255&e,t[i+1]=e>>8,t[i+2]=255^t[i],t[i+3]=255^t[i+1];for(var o=0;o<e;++o)t[i+o+4]=r[o];return 8*(i+4+e)},H=function(t,n,e,a,u,h,f,l,c,p,v){F(n,v++,e),++u[256];for(var d=Z(u,15),g=d.t,x=d.l,k=Z(h,15),M=k.t,S=k.l,A=O(g),T=A.c,D=A.n,C=O(M),I=C.c,U=C.n,q=new r(19),H=0;H<T.length;++H)++q[31&T[H]];for(H=0;H<I.length;++H)++q[31&I[H]];for(var j=Z(q,7),N=j.t,P=j.l,B=19;B>4&&!N[s[B-1]];--B);var Y,J,K,Q,R=p+5<<3,V=G(u,m)+G(h,b)+f,W=G(u,g)+G(h,M)+f+14+3*B+G(q,N)+2*q[16]+3*q[17]+7*q[18];if(c>=0&&R<=V&&R<=W)return L(n,v,t.subarray(c,c+p));if(F(n,v,1+(W<V)),v+=2,W<V){Y=y(g,x,0),J=g,K=y(M,S,0),Q=M;var X=y(N,P,0);for(F(n,v,D-257),F(n,v+5,U-1),F(n,v+10,B-4),v+=14,H=0;H<B;++H)F(n,v+3*H,N[s[H]]);v+=3*B;for(var $=[T,I],_=0;_<2;++_){var tt=$[_];for(H=0;H<tt.length;++H)F(n,v,X[rt=31&tt[H]]),v+=N[rt],rt>15&&(F(n,v,tt[H]>>5&127),v+=tt[H]>>12)}}else Y=w,J=m,K=z,Q=b;for(H=0;H<l;++H){var nt=a[H];if(nt>255){var rt;E(n,v,Y[257+(rt=nt>>18&31)]),v+=J[rt+257],rt>7&&(F(n,v,nt>>23&31),v+=i[rt]);var et=31&nt;E(n,v,K[et]),v+=Q[et],et>3&&(E(n,v,nt>>5&8191),v+=o[et])}else E(n,v,Y[nt]),v+=J[nt]}return E(n,v,Y[256]),v+J[256]},j=new e([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),N=new n(0),P=function(t,s,a,u,h,l){var c=l.z||t.length,v=new n(u+c+5*(1+Math.ceil(c/7e3))+h),d=v.subarray(u,v.length-h),g=l.l,y=7&(l.r||0);if(s){y&&(d[0]=l.r>>3);for(var m=j[s-1],b=m>>13,w=8191&m,x=(1<<a)-1,z=l.p||new r(32768),k=l.h||new r(x+1),M=Math.ceil(a/3),S=2*M,A=function(n){return(t[n]^t[n+1]<<M^t[n+2]<<S)&x},C=new e(25e3),I=new r(288),U=new r(32),F=0,E=0,Z=l.i||0,q=0,O=l.w||0,G=0;Z+2<c;++Z){var N=A(Z),P=32767&Z,B=k[N];if(z[P]=B,k[N]=P,O<=Z){var Y=c-Z;if((F>7e3||q>24576)&&(Y>423||!g)){y=H(t,d,0,C,I,U,E,q,G,Z-G,y),q=F=E=0,G=Z;for(var J=0;J<286;++J)I[J]=0;for(J=0;J<30;++J)U[J]=0}var K=2,Q=0,R=w,V=P-B&32767;if(Y>2&&N==A(Z-V))for(var W=Math.min(b,Y)-1,X=Math.min(32767,Z),$=Math.min(258,Y);V<=X&&--R&&P!=B;){if(t[Z+K]==t[Z+K-V]){for(var _=0;_<$&&t[Z+_]==t[Z+_-V];++_);if(_>K){if(K=_,Q=V,_>W)break;var tt=Math.min(V,_-2),nt=0;for(J=0;J<tt;++J){var rt=Z-V+J&32767,et=rt-z[rt]&32767;et>nt&&(nt=et,B=rt)}}}V+=(P=B)-(B=z[P])&32767}if(Q){C[q++]=268435456|f[K]<<18|p[Q];var it=31&f[K],ot=31&p[Q];E+=i[it]+o[ot],++I[257+it],++U[ot],O=Z+K,++F}else C[q++]=t[Z],++I[t[Z]]}}for(Z=Math.max(Z,O);Z<c;++Z)C[q++]=t[Z],++I[t[Z]];y=H(t,d,g,C,I,U,E,q,G,Z-G,y),g||(l.r=7&y|d[y/8|0]<<3,y-=7,l.h=k,l.p=z,l.i=Z,l.w=O)}else{for(Z=l.w||0;Z<c+g;Z+=65535){var st=Z+65535;st>=c&&(d[y/8|0]=g,st=c),y=L(d,y+1,t.subarray(Z,st))}l.i=c}return D(v,0,u+T(y)+h)},B=function(){for(var t=new Int32Array(256),n=0;n<256;++n){for(var r=n,e=9;--e;)r=(1&r&&-306674912)^r>>>1;t[n]=r}return t}(),Y=function(){var t=-1;return{p:function(n){for(var r=t,e=0;e<n.length;++e)r=B[255&r^n[e]]^r>>>8;t=r},d:function(){return~t}}},J=function(){var t=1,n=0;return{p:function(r){for(var e=t,i=n,o=0|r.length,s=0;s!=o;){for(var a=Math.min(s+2655,o);s<a;++s)i+=e+=r[s];e=(65535&e)+15*(e>>16),i=(65535&i)+15*(i>>16)}t=e,n=i},d:function(){return(255&(t%=65521))<<24|(65280&t)<<8|(255&(n%=65521))<<8|n>>8}}},K=function(t,r,e,i,o){if(!o&&(o={l:1},r.dictionary)){var s=r.dictionary.subarray(-32768),a=new n(s.length+t.length);a.set(s),a.set(t,s.length),t=a,o.w=s.length}return P(t,null==r.level?6:r.level,null==r.mem?o.l?Math.ceil(1.5*Math.max(8,Math.min(13,Math.log(t.length)))):20:12+r.mem,e,i,o)},Q=function(t,n){var r={};for(var e in t)r[e]=t[e];for(var e in n)r[e]=n[e];return r},R=function(t,n,r){for(var e=t(),i=""+t,o=i.slice(i.indexOf("[")+1,i.lastIndexOf("]")).replace(/\s+/g,"").split(","),s=0;s<e.length;++s){var a=e[s],u=o[s];if("function"==typeof a){n+=";"+u+"=";var h=""+a;if(a.prototype)if(-1!=h.indexOf("[native code]")){var f=h.indexOf(" ",8)+1;n+=h.slice(f,h.indexOf("(",f))}else for(var l in n+=h,a.prototype)n+=";"+u+".prototype."+l+"="+a.prototype[l];else n+=h}else r[u]=a}return n},V=[],W=function(t){var n=[];for(var r in t)t[r].buffer&&n.push((t[r]=new t[r].constructor(t[r])).buffer);return n},X=function(n,r,e,i){if(!V[e]){for(var o="",s={},a=n.length-1,u=0;u<a;++u)o=R(n[u],o,s);V[e]={c:R(n[a],o,s),e:s}}var h=Q({},V[e].e);return(0,t.default)(V[e].c+";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage="+r+"}",e,h,W(h),i)},$=function(){return[n,r,e,i,o,s,h,c,x,k,v,C,y,M,S,A,T,D,I,U,Tt,it,ot]},_=function(){return[n,r,e,i,o,s,f,p,w,m,z,b,v,j,N,y,F,E,Z,q,O,G,L,H,T,D,P,K,kt,it]},tt=function(){return[pt,gt,ct,Y,B]},nt=function(){return[vt,dt]},rt=function(){return[yt,ct,J]},et=function(){return[mt]},it=function(t){return postMessage(t,[t.buffer])},ot=function(t){return t&&{out:t.size&&new n(t.size),dictionary:t.dictionary}},st=function(t,n,r,e,i,o){var s=X(r,e,i,(function(t,n){s.terminate(),o(t,n)}));return s.postMessage([t,n],n.consume?[t.buffer]:[]),function(){s.terminate()}},at=function(t){return t.ondata=function(t,n){return postMessage([t,n],[t.buffer])},function(n){n.data.length?(t.push(n.data[0],n.data[1]),postMessage([n.data[0].length])):t.flush()}},ut=function(t,n,r,e,i,o,s){var a,u=X(t,e,i,(function(t,r){t?(u.terminate(),n.ondata.call(n,t)):Array.isArray(r)?1==r.length?(n.queuedSize-=r[0],n.ondrain&&n.ondrain(r[0])):(r[1]&&u.terminate(),n.ondata.call(n,t,r[0],r[1])):s(r)}));u.postMessage(r),n.queuedSize=0,n.push=function(t,r){n.ondata||I(5),a&&n.ondata(I(4,0,1),null,!!r),n.queuedSize+=t.length,u.postMessage([t,a=r],[t.buffer])},n.terminate=function(){u.terminate()},o&&(n.flush=function(){u.postMessage([])})},ht=function(t,n){return t[n]|t[n+1]<<8},ft=function(t,n){return(t[n]|t[n+1]<<8|t[n+2]<<16|t[n+3]<<24)>>>0},lt=function(t,n){return ft(t,n)+4294967296*ft(t,n+4)},ct=function(t,n,r){for(;r;++n)t[n]=r,r>>>=8},pt=function(t,n){var r=n.filename;if(t[0]=31,t[1]=139,t[2]=8,t[8]=n.level<2?4:9==n.level?2:0,t[9]=3,0!=n.mtime&&ct(t,4,Math.floor(new Date(n.mtime||Date.now())/1e3)),r){t[3]=8;for(var e=0;e<=r.length;++e)t[e+10]=r.charCodeAt(e)}},vt=function(t){31==t[0]&&139==t[1]&&8==t[2]||I(6,"invalid gzip data");var n=t[3],r=10;4&n&&(r+=2+(t[10]|t[11]<<8));for(var e=(n>>3&1)+(n>>4&1);e>0;e-=!t[r++]);return r+(2&n)},dt=function(t){var n=t.length;return(t[n-4]|t[n-3]<<8|t[n-2]<<16|t[n-1]<<24)>>>0},gt=function(t){return 10+(t.filename?t.filename.length+1:0)},yt=function(t,n){var r=n.level,e=0==r?0:r<6?1:9==r?3:2;if(t[0]=120,t[1]=e<<6|(n.dictionary&&32),t[1]|=31-(t[0]<<8|t[1])%31,n.dictionary){var i=J();i.p(n.dictionary),ct(t,2,i.d())}},mt=function(t,n){return(8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31)&&I(6,"invalid zlib data"),(t[1]>>5&1)==+!n&&I(6,"invalid zlib data: "+(32&t[1]?"need":"unexpected")+" dictionary"),2+(t[1]>>3&4)};function bt(t,n){return"function"==typeof t&&(n=t,t={}),this.ondata=n,t}var wt=function(){function t(t,r){if("function"==typeof t&&(r=t,t={}),this.ondata=r,this.o=t||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new n(98304),this.o.dictionary){var e=this.o.dictionary.subarray(-32768);this.b.set(e,32768-e.length),this.s.i=32768-e.length}}return t.prototype.p=function(t,n){this.ondata(K(t,this.o,0,0,this.s),n)},t.prototype.push=function(t,r){this.ondata||I(5),this.s.l&&I(4);var e=t.length+this.s.z;if(e>this.b.length){if(e>2*this.b.length-32768){var i=new n(-32768&e);i.set(this.b.subarray(0,this.s.z)),this.b=i}var o=this.b.length-this.s.z;this.b.set(t.subarray(0,o),this.s.z),this.s.z=this.b.length,this.p(this.b,!1),this.b.set(this.b.subarray(-32768)),this.b.set(t.subarray(o),32768),this.s.z=t.length-o+32768,this.s.i=32766,this.s.w=32768}else this.b.set(t,this.s.z),this.s.z+=t.length;this.s.l=1&r,(this.s.z>this.s.w+8191||r)&&(this.p(this.b,r||!1),this.s.w=this.s.i,this.s.i-=2)},t.prototype.flush=function(){this.ondata||I(5),this.s.l&&I(4),this.p(this.b,!1),this.s.w=this.s.i,this.s.i-=2},t}();_e.Deflate=wt;var xt=function(){return function(t,n){ut([_,function(){return[at,wt]}],this,bt.call(this,t,n),(function(t){var n=new wt(t.data);onmessage=at(n)}),6,1)}}();function zt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_],(function(t){return it(kt(t.data[0],t.data[1]))}),0,r)}function kt(t,n){return K(t,n||{},0,0)}_e.AsyncDeflate=xt,_e.deflate=zt,_e.deflateSync=kt;var Mt=function(){function t(t,r){"function"==typeof t&&(r=t,t={}),this.ondata=r;var e=t&&t.dictionary&&t.dictionary.subarray(-32768);this.s={i:0,b:e?e.length:0},this.o=new n(32768),this.p=new n(0),e&&this.o.set(e)}return t.prototype.e=function(t){if(this.ondata||I(5),this.d&&I(4),this.p.length){if(t.length){var r=new n(this.p.length+t.length);r.set(this.p),r.set(t,this.p.length),this.p=r}}else this.p=t},t.prototype.c=function(t){this.s.i=+(this.d=t||!1);var n=this.s.b,r=U(this.p,this.s,this.o);this.ondata(D(r,n,this.s.b),this.d),this.o=D(r,this.s.b-32768),this.s.b=this.o.length,this.p=D(this.p,this.s.p/8|0),this.s.p&=7},t.prototype.push=function(t,n){this.e(t),this.c(n)},t}();_e.Inflate=Mt;var St=function(){return function(t,n){ut([$,function(){return[at,Mt]}],this,bt.call(this,t,n),(function(t){var n=new Mt(t.data);onmessage=at(n)}),7,0)}}();function At(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$],(function(t){return it(Tt(t.data[0],ot(t.data[1])))}),1,r)}function Tt(t,n){return U(t,{i:2},n&&n.out,n&&n.dictionary)}_e.AsyncInflate=St,_e.inflate=At,_e.inflateSync=Tt;var Dt=function(){function t(t,n){this.c=Y(),this.l=0,this.v=1,wt.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),this.l+=t.length,wt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=K(t,this.o,this.v&&gt(this.o),n&&8,this.s);this.v&&(pt(r,this.o),this.v=0),n&&(ct(r,r.length-8,this.c.d()),ct(r,r.length-4,this.l)),this.ondata(r,n)},t.prototype.flush=function(){wt.prototype.flush.call(this)},t}();_e.Gzip=Dt,_e.Compress=Dt;var Ct=function(){return function(t,n){ut([_,tt,function(){return[at,wt,Dt]}],this,bt.call(this,t,n),(function(t){var n=new Dt(t.data);onmessage=at(n)}),8,1)}}();function It(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_,tt,function(){return[Ut]}],(function(t){return it(Ut(t.data[0],t.data[1]))}),2,r)}function Ut(t,n){n||(n={});var r=Y(),e=t.length;r.p(t);var i=K(t,n,gt(n),8),o=i.length;return pt(i,n),ct(i,o-8,r.d()),ct(i,o-4,e),i}_e.AsyncGzip=Ct,_e.AsyncCompress=Ct,_e.gzip=It,_e.compress=It,_e.gzipSync=Ut,_e.compressSync=Ut;var Ft=function(){function t(t,n){this.v=1,this.r=0,Mt.call(this,t,n)}return t.prototype.push=function(t,r){if(Mt.prototype.e.call(this,t),this.r+=t.length,this.v){var e=this.p.subarray(this.v-1),i=e.length>3?vt(e):4;if(i>e.length){if(!r)return}else this.v>1&&this.onmember&&this.onmember(this.r-e.length);this.p=e.subarray(i),this.v=0}Mt.prototype.c.call(this,r),!this.s.f||this.s.l||r||(this.v=T(this.s.p)+9,this.s={i:0},this.o=new n(0),this.push(new n(0),r))},t}();_e.Gunzip=Ft;var Et=function(){return function(t,n){var r=this;ut([$,nt,function(){return[at,Mt,Ft]}],this,bt.call(this,t,n),(function(t){var n=new Ft(t.data);n.onmember=function(t){return postMessage(t)},onmessage=at(n)}),9,0,(function(t){return r.onmember&&r.onmember(t)}))}}();function Zt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$,nt,function(){return[qt]}],(function(t){return it(qt(t.data[0],t.data[1]))}),3,r)}function qt(t,r){var e=vt(t);return e+8>t.length&&I(6,"invalid gzip data"),U(t.subarray(e,-8),{i:2},r&&r.out||new n(dt(t)),r&&r.dictionary)}_e.AsyncGunzip=Et,_e.gunzip=Zt,_e.gunzipSync=qt;var Ot=function(){function t(t,n){this.c=J(),this.v=1,wt.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),wt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=K(t,this.o,this.v&&(this.o.dictionary?6:2),n&&4,this.s);this.v&&(yt(r,this.o),this.v=0),n&&ct(r,r.length-4,this.c.d()),this.ondata(r,n)},t.prototype.flush=function(){wt.prototype.flush.call(this)},t}();_e.Zlib=Ot;var Gt=function(){return function(t,n){ut([_,rt,function(){return[at,wt,Ot]}],this,bt.call(this,t,n),(function(t){var n=new Ot(t.data);onmessage=at(n)}),10,1)}}();function Lt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_,rt,function(){return[Ht]}],(function(t){return it(Ht(t.data[0],t.data[1]))}),4,r)}function Ht(t,n){n||(n={});var r=J();r.p(t);var e=K(t,n,n.dictionary?6:2,4);return yt(e,n),ct(e,e.length-4,r.d()),e}_e.AsyncZlib=Gt,_e.zlib=Lt,_e.zlibSync=Ht;var jt=function(){function t(t,n){Mt.call(this,t,n),this.v=t&&t.dictionary?2:1}return t.prototype.push=function(t,n){if(Mt.prototype.e.call(this,t),this.v){if(this.p.length<6&&!n)return;this.p=this.p.subarray(mt(this.p,this.v-1)),this.v=0}n&&(this.p.length<4&&I(6,"invalid zlib data"),this.p=this.p.subarray(0,-4)),Mt.prototype.c.call(this,n)},t}();_e.Unzlib=jt;var Nt=function(){return function(t,n){ut([$,et,function(){return[at,Mt,jt]}],this,bt.call(this,t,n),(function(t){var n=new jt(t.data);onmessage=at(n)}),11,0)}}();function Pt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$,et,function(){return[Bt]}],(function(t){return it(Bt(t.data[0],ot(t.data[1])))}),5,r)}function Bt(t,n){return U(t.subarray(mt(t,n&&n.dictionary),-4),{i:2},n&&n.out,n&&n.dictionary)}_e.AsyncUnzlib=Nt,_e.unzlib=Pt,_e.unzlibSync=Bt;var Yt=function(){function t(t,n){this.o=bt.call(this,t,n)||{},this.G=Ft,this.I=Mt,this.Z=jt}return t.prototype.i=function(){var t=this;this.s.ondata=function(n,r){t.ondata(n,r)}},t.prototype.push=function(t,r){if(this.ondata||I(5),this.s)this.s.push(t,r);else{if(this.p&&this.p.length){var e=new n(this.p.length+t.length);e.set(this.p),e.set(t,this.p.length)}else this.p=t;this.p.length>2&&(this.s=31==this.p[0]&&139==this.p[1]&&8==this.p[2]?new this.G(this.o):8!=(15&this.p[0])||this.p[0]>>4>7||(this.p[0]<<8|this.p[1])%31?new this.I(this.o):new this.Z(this.o),this.i(),this.s.push(this.p,r),this.p=null)}},t}();_e.Decompress=Yt;var Jt=function(){function t(t,n){Yt.call(this,t,n),this.queuedSize=0,this.G=Et,this.I=St,this.Z=Nt}return t.prototype.i=function(){var t=this;this.s.ondata=function(n,r,e){t.ondata(n,r,e)},this.s.ondrain=function(n){t.queuedSize-=n,t.ondrain&&t.ondrain(n)}},t.prototype.push=function(t,n){this.queuedSize+=t.length,Yt.prototype.push.call(this,t,n)},t}();function Kt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),31==t[0]&&139==t[1]&&8==t[2]?Zt(t,n,r):8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31?At(t,n,r):Pt(t,n,r)}function Qt(t,n){return 31==t[0]&&139==t[1]&&8==t[2]?qt(t,n):8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31?Tt(t,n):Bt(t,n)}_e.AsyncDecompress=Jt,_e.decompress=Kt,_e.decompressSync=Qt;var Rt=function(t,r,e,i){for(var o in t){var s=t[o],a=r+o,u=i;Array.isArray(s)&&(u=Q(i,s[1]),s=s[0]),s instanceof n?e[a]=[s,u]:(e[a+="/"]=[new n(0),u],Rt(s,a,e,i))}},Vt="undefined"!=typeof TextEncoder&&new TextEncoder,Wt="undefined"!=typeof TextDecoder&&new TextDecoder,Xt=0;try{Wt.decode(N,{stream:!0}),Xt=1}catch(t){}var $t=function(t){for(var n="",r=0;;){var e=t[r++],i=(e>127)+(e>223)+(e>239);if(r+i>t.length)return{s:n,r:D(t,r-1)};i?3==i?(e=((15&e)<<18|(63&t[r++])<<12|(63&t[r++])<<6|63&t[r++])-65536,n+=String.fromCharCode(55296|e>>10,56320|1023&e)):n+=String.fromCharCode(1&i?(31&e)<<6|63&t[r++]:(15&e)<<12|(63&t[r++])<<6|63&t[r++]):n+=String.fromCharCode(e)}},_t=function(){function t(t){this.ondata=t,Xt?this.t=new TextDecoder:this.p=N}return t.prototype.push=function(t,r){if(this.ondata||I(5),r=!!r,this.t)return this.ondata(this.t.decode(t,{stream:!0}),r),void(r&&(this.t.decode().length&&I(8),this.t=null));this.p||I(4);var e=new n(this.p.length+t.length);e.set(this.p),e.set(t,this.p.length);var i=$t(e),o=i.s,s=i.r;r?(s.length&&I(8),this.p=null):this.p=s,this.ondata(o,r)},t}();_e.DecodeUTF8=_t;var tn=function(){function t(t){this.ondata=t}return t.prototype.push=function(t,n){this.ondata||I(5),this.d&&I(4),this.ondata(nn(t),this.d=n||!1)},t}();function nn(t,r){if(r){for(var e=new n(t.length),i=0;i<t.length;++i)e[i]=t.charCodeAt(i);return e}if(Vt)return Vt.encode(t);var o=t.length,s=new n(t.length+(t.length>>1)),a=0,u=function(t){s[a++]=t};for(i=0;i<o;++i){if(a+5>s.length){var h=new n(a+8+(o-i<<1));h.set(s),s=h}var f=t.charCodeAt(i);f<128||r?u(f):f<2048?(u(192|f>>6),u(128|63&f)):f>55295&&f<57344?(u(240|(f=65536+(1047552&f)|1023&t.charCodeAt(++i))>>18),u(128|f>>12&63),u(128|f>>6&63),u(128|63&f)):(u(224|f>>12),u(128|f>>6&63),u(128|63&f))}return D(s,0,a)}function rn(t,n){if(n){for(var r="",e=0;e<t.length;e+=16384)r+=String.fromCharCode.apply(null,t.subarray(e,e+16384));return r}if(Wt)return Wt.decode(t);var i=$t(t),o=i.s;return(r=i.r).length&&I(8),o}_e.EncodeUTF8=tn,_e.strToU8=nn,_e.strFromU8=rn;var en=function(t){return 1==t?3:t<6?2:9==t?1:0},on=function(t,n){return n+30+ht(t,n+26)+ht(t,n+28)},sn=function(t,n,r){var e=ht(t,n+28),i=rn(t.subarray(n+46,n+46+e),!(2048&ht(t,n+8))),o=n+46+e,s=ft(t,n+20),a=r&&4294967295==s?an(t,o):[s,ft(t,n+24),ft(t,n+42)],u=a[0],h=a[1],f=a[2];return[ht(t,n+10),u,h,i,o+ht(t,n+30)+ht(t,n+32),f]},an=function(t,n){for(;1!=ht(t,n);n+=4+ht(t,n+2));return[lt(t,n+12),lt(t,n+4),lt(t,n+20)]},un=function(t){var n=0;if(t)for(var r in t){var e=t[r].length;e>65535&&I(9),n+=e+4}return n},hn=function(t,n,r,e,i,o,s,a){var u=e.length,h=r.extra,f=a&&a.length,l=un(h);ct(t,n,null!=s?33639248:67324752),n+=4,null!=s&&(t[n++]=20,t[n++]=r.os),t[n]=20,n+=2,t[n++]=r.flag<<1|(o<0&&8),t[n++]=i&&8,t[n++]=255&r.compression,t[n++]=r.compression>>8;var c=new Date(null==r.mtime?Date.now():r.mtime),p=c.getFullYear()-1980;if((p<0||p>119)&&I(10),ct(t,n,p<<25|c.getMonth()+1<<21|c.getDate()<<16|c.getHours()<<11|c.getMinutes()<<5|c.getSeconds()>>1),n+=4,-1!=o&&(ct(t,n,r.crc),ct(t,n+4,o<0?-o-2:o),ct(t,n+8,r.size)),ct(t,n+12,u),ct(t,n+14,l),n+=16,null!=s&&(ct(t,n,f),ct(t,n+6,r.attrs),ct(t,n+10,s),n+=14),t.set(e,n),n+=u,l)for(var v in h){var d=h[v],g=d.length;ct(t,n,+v),ct(t,n+2,g),t.set(d,n+4),n+=4+g}return f&&(t.set(a,n),n+=f),n},fn=function(t,n,r,e,i){ct(t,n,101010256),ct(t,n+8,r),ct(t,n+10,r),ct(t,n+12,e),ct(t,n+16,i)},ln=function(){function t(t){this.filename=t,this.c=Y(),this.size=0,this.compression=0}return t.prototype.process=function(t,n){this.ondata(null,t,n)},t.prototype.push=function(t,n){this.ondata||I(5),this.c.p(t),this.size+=t.length,n&&(this.crc=this.c.d()),this.process(t,n||!1)},t}();_e.ZipPassThrough=ln;var cn=function(){function t(t,n){var r=this;n||(n={}),ln.call(this,t),this.d=new wt(n,(function(t,n){r.ondata(null,t,n)})),this.compression=8,this.flag=en(n.level)}return t.prototype.process=function(t,n){try{this.d.push(t,n)}catch(t){this.ondata(t,null,n)}},t.prototype.push=function(t,n){ln.prototype.push.call(this,t,n)},t}();_e.ZipDeflate=cn;var pn=function(){function t(t,n){var r=this;n||(n={}),ln.call(this,t),this.d=new xt(n,(function(t,n,e){r.ondata(t,n,e)})),this.compression=8,this.flag=en(n.level),this.terminate=this.d.terminate}return t.prototype.process=function(t,n){this.d.push(t,n)},t.prototype.push=function(t,n){ln.prototype.push.call(this,t,n)},t}();_e.AsyncZipDeflate=pn;var vn=function(){function t(t){this.ondata=t,this.u=[],this.d=1}return t.prototype.add=function(t){var r=this;if(this.ondata||I(5),2&this.d)this.ondata(I(4+8*(1&this.d),0,1),null,!1);else{var e=nn(t.filename),i=e.length,o=t.comment,s=o&&nn(o),a=i!=t.filename.length||s&&o.length!=s.length,u=i+un(t.extra)+30;i>65535&&this.ondata(I(11,0,1),null,!1);var h=new n(u);hn(h,0,t,e,a,-1);var f=[h],l=function(){for(var t=0,n=f;t<n.length;t++)r.ondata(null,n[t],!1);f=[]},c=this.d;this.d=0;var p=this.u.length,v=Q(t,{f:e,u:a,o:s,t:function(){t.terminate&&t.terminate()},r:function(){if(l(),c){var t=r.u[p+1];t?t.r():r.d=1}c=1}}),d=0;t.ondata=function(e,i,o){if(e)r.ondata(e,i,o),r.terminate();else if(d+=i.length,f.push(i),o){var s=new n(16);ct(s,0,134695760),ct(s,4,t.crc),ct(s,8,d),ct(s,12,t.size),f.push(s),v.c=d,v.b=u+d+16,v.crc=t.crc,v.size=t.size,c&&v.r(),c=1}else c&&l()},this.u.push(v)}},t.prototype.end=function(){var t=this;2&this.d?this.ondata(I(4+8*(1&this.d),0,1),null,!0):(this.d?this.e():this.u.push({r:function(){1&t.d&&(t.u.splice(-1,1),t.e())},t:function(){}}),this.d=3)},t.prototype.e=function(){for(var t=0,r=0,e=0,i=0,o=this.u;i<o.length;i++)e+=46+(h=o[i]).f.length+un(h.extra)+(h.o?h.o.length:0);for(var s=new n(e+22),a=0,u=this.u;a<u.length;a++){var h;hn(s,t,h=u[a],h.f,h.u,-h.c-2,r,h.o),t+=46+h.f.length+un(h.extra)+(h.o?h.o.length:0),r+=h.b}fn(s,t,this.u.length,e,r),this.ondata(null,s,!0),this.d=2},t.prototype.terminate=function(){for(var t=0,n=this.u;t<n.length;t++)n[t].t();this.d=2},t}();function dn(t,r,e){e||(e=r,r={}),"function"!=typeof e&&I(7);var i={};Rt(t,"",i,r);var o=Object.keys(i),s=o.length,a=0,u=0,h=s,f=Array(s),l=[],c=function(){for(var t=0;t<l.length;++t)l[t]()},p=function(t,n){xn((function(){e(t,n)}))};xn((function(){p=e}));var v=function(){var t=new n(u+22),r=a,e=u-a;u=0;for(var i=0;i<h;++i){var o=f[i];try{var s=o.c.length;hn(t,u,o,o.f,o.u,s);var l=30+o.f.length+un(o.extra),c=u+l;t.set(o.c,c),hn(t,a,o,o.f,o.u,s,u,o.m),a+=16+l+(o.m?o.m.length:0),u=c+s}catch(t){return p(t,null)}}fn(t,a,f.length,e,r),p(null,t)};s||v();for(var d=function(t){var n=o[t],r=i[n],e=r[0],h=r[1],d=Y(),g=e.length;d.p(e);var y=nn(n),m=y.length,b=h.comment,w=b&&nn(b),x=w&&w.length,z=un(h.extra),k=0==h.level?0:8,M=function(r,e){if(r)c(),p(r,null);else{var i=e.length;f[t]=Q(h,{size:g,crc:d.d(),c:e,f:y,m:w,u:m!=n.length||w&&b.length!=x,compression:k}),a+=30+m+z+i,u+=76+2*(m+z)+(x||0)+i,--s||v()}};if(m>65535&&M(I(11,0,1),null),k)if(g<16e4)try{M(null,kt(e,h))}catch(t){M(t,null)}else l.push(zt(e,h,M));else M(null,e)},g=0;g<h;++g)d(g);return c}function gn(t,r){r||(r={});var e={},i=[];Rt(t,"",e,r);var o=0,s=0;for(var a in e){var u=e[a],h=u[0],f=u[1],l=0==f.level?0:8,c=(M=nn(a)).length,p=f.comment,v=p&&nn(p),d=v&&v.length,g=un(f.extra);c>65535&&I(11);var y=l?kt(h,f):h,m=y.length,b=Y();b.p(h),i.push(Q(f,{size:h.length,crc:b.d(),c:y,f:M,m:v,u:c!=a.length||v&&p.length!=d,o:o,compression:l})),o+=30+c+g+m,s+=76+2*(c+g)+(d||0)+m}for(var w=new n(s+22),x=o,z=s-o,k=0;k<i.length;++k){var M;hn(w,(M=i[k]).o,M,M.f,M.u,M.c.length);var S=30+M.f.length+un(M.extra);w.set(M.c,M.o+S),hn(w,o,M,M.f,M.u,M.c.length,M.o,M.m),o+=16+S+(M.m?M.m.length:0)}return fn(w,o,i.length,z,x),w}_e.Zip=vn,_e.zip=dn,_e.zipSync=gn;var yn=function(){function t(){}return t.prototype.push=function(t,n){this.ondata(null,t,n)},t.compression=0,t}();_e.UnzipPassThrough=yn;var mn=function(){function t(){var t=this;this.i=new Mt((function(n,r){t.ondata(null,n,r)}))}return t.prototype.push=function(t,n){try{this.i.push(t,n)}catch(t){this.ondata(t,null,n)}},t.compression=8,t}();_e.UnzipInflate=mn;var bn=function(){function t(t,n){var r=this;n<32e4?this.i=new Mt((function(t,n){r.ondata(null,t,n)})):(this.i=new St((function(t,n,e){r.ondata(t,n,e)})),this.terminate=this.i.terminate)}return t.prototype.push=function(t,n){this.i.terminate&&(t=D(t,0)),this.i.push(t,n)},t.compression=8,t}();_e.AsyncUnzipInflate=bn;var wn=function(){function t(t){this.onfile=t,this.k=[],this.o={0:yn},this.p=N}return t.prototype.push=function(t,r){var e=this;if(this.onfile||I(5),this.p||I(4),this.c>0){var i=Math.min(this.c,t.length),o=t.subarray(0,i);if(this.c-=i,this.d?this.d.push(o,!this.c):this.k[0].push(o),(t=t.subarray(i)).length)return this.push(t,r)}else{var s=0,a=0,u=void 0,h=void 0;this.p.length?t.length?((h=new n(this.p.length+t.length)).set(this.p),h.set(t,this.p.length)):h=this.p:h=t;for(var f=h.length,l=this.c,c=l&&this.d,p=function(){var t,n=ft(h,a);if(67324752==n){s=1,u=a,v.d=null,v.c=0;var r=ht(h,a+6),i=ht(h,a+8),o=2048&r,c=8&r,p=ht(h,a+26),d=ht(h,a+28);if(f>a+30+p+d){var g=[];v.k.unshift(g),s=2;var y,m=ft(h,a+18),b=ft(h,a+22),w=rn(h.subarray(a+30,a+=30+p),!o);4294967295==m?(t=c?[-2]:an(h,a),m=t[0],b=t[1]):c&&(m=-1),a+=d,v.c=m;var x={name:w,compression:i,start:function(){if(x.ondata||I(5),m){var t=e.o[i];t||x.ondata(I(14,"unknown compression type "+i,1),null,!1),(y=m<0?new t(w):new t(w,m,b)).ondata=function(t,n,r){x.ondata(t,n,r)};for(var n=0,r=g;n<r.length;n++)y.push(r[n],!1);e.k[0]==g&&e.c?e.d=y:y.push(N,!0)}else x.ondata(null,N,!0)},terminate:function(){y&&y.terminate&&y.terminate()}};m>=0&&(x.size=m,x.originalSize=b),v.onfile(x)}return"break"}if(l){if(134695760==n)return u=a+=12+(-2==l&&8),s=3,v.c=0,"break";if(33639248==n)return u=a-=4,s=3,v.c=0,"break"}},v=this;a<f-4&&"break"!==p();++a);if(this.p=N,l<0){var d=h.subarray(0,s?u-12-(-2==l&&8)-(134695760==ft(h,u-16)&&4):a);c?c.push(d,!!s):this.k[+(2==s)].push(d)}if(2&s)return this.push(h.subarray(a),r);this.p=h.subarray(a)}r&&(this.c&&I(13),this.p=null)},t.prototype.register=function(t){this.o[t.compression]=t},t}();_e.Unzip=wn;var xn="function"==typeof queueMicrotask?queueMicrotask:"function"==typeof setTimeout?setTimeout:function(t){t()};function zn(t,r,e){e||(e=r,r={}),"function"!=typeof e&&I(7);var i=[],o=function(){for(var t=0;t<i.length;++t)i[t]()},s={},a=function(t,n){xn((function(){e(t,n)}))};xn((function(){a=e}));for(var u=t.length-22;101010256!=ft(t,u);--u)if(!u||t.length-u>65558)return a(I(13,0,1),null),o;var h=ht(t,u+8);if(h){var f=h,l=ft(t,u+16),c=4294967295==l||65535==f;if(c){var p=ft(t,u-12);(c=101075792==ft(t,p))&&(f=h=ft(t,p+32),l=ft(t,p+48))}for(var v=r&&r.filter,d=function(r){var e=sn(t,l,c),u=e[0],f=e[1],p=e[2],d=e[3],g=e[4],y=on(t,e[5]);l=g;var m=function(t,n){t?(o(),a(t,null)):(n&&(s[d]=n),--h||a(null,s))};if(!v||v({name:d,size:f,originalSize:p,compression:u}))if(u)if(8==u){var b=t.subarray(y,y+f);if(p<524288||f>.8*p)try{m(null,Tt(b,{out:new n(p)}))}catch(t){m(t,null)}else i.push(At(b,{size:p},m))}else m(I(14,"unknown compression type "+u,1),null);else m(null,D(t,y,y+f));else m(null,null)},g=0;g<f;++g)d()}else a(null,{});return o}function kn(t,r){for(var e={},i=t.length-22;101010256!=ft(t,i);--i)(!i||t.length-i>65558)&&I(13);var o=ht(t,i+8);if(!o)return{};var s=ft(t,i+16),a=4294967295==s||65535==o;if(a){var u=ft(t,i-12);(a=101075792==ft(t,u))&&(o=ft(t,u+32),s=ft(t,u+48))}for(var h=r&&r.filter,f=0;f<o;++f){var l=sn(t,s,a),c=l[0],p=l[1],v=l[2],d=l[3],g=l[4],y=on(t,l[5]);s=g,h&&!h({name:d,size:p,originalSize:v,compression:c})||(c?8==c?e[d]=Tt(t.subarray(y,y+p),{out:new n(v)}):I(14,"unknown compression type "+c):e[d]=D(t,y,y+p))}return e}_e.unzip=zn,_e.unzipSync=kn;return _e})();

// this code was 100% AI generated based on CACHE1D.C

Build.Scripts.LZW = class LZW {

    static size = 16384;

    static compress(data) {

        const uncompleng = data.length;
        const lzwbuf1 = new Uint8Array(65536);
        const lzwbuf2 = new Int16Array(65536);
        const lzwbuf3 = new Int16Array(65536);

        const outbuf = new Uint8Array(uncompleng + 4096 + 16);

        for (let i = 255; i >= 0; i--) {
            lzwbuf1[i] = i;
            lzwbuf3[i] = (i + 1) & 255;
            lzwbuf2[i] = -1;
        }

        let addrcnt = 256;
        let bytecnt1 = 0;
        let bitcnt = 32;
        let numbits = 8;
        let oneupnumbits = 1 << 8;

        const writeCode = (code) => {

            let bytePos = bitcnt >> 3;
            let shift = bitcnt & 7;

            let v = outbuf[bytePos] |
                (outbuf[bytePos + 1] << 8) |
                (outbuf[bytePos + 2] << 16) |
                (outbuf[bytePos + 3] << 24)
            ;

            v |= code << shift;

            outbuf[bytePos] = v & 0xFF;
            outbuf[bytePos + 1] = (v >>> 8) & 0xFF;
            outbuf[bytePos + 2] = (v >>> 16) & 0xFF;
            outbuf[bytePos + 3] = (v >>> 24) & 0xFF;

            bitcnt += numbits;

            if ((code & ((oneupnumbits >> 1) - 1)) > ((addrcnt - 1) & ((oneupnumbits >> 1) - 1))) {
                bitcnt--;
            }

        };

        let addr = 0;

        while (bytecnt1 < uncompleng && bitcnt < (uncompleng << 3)) {

            addr = data[bytecnt1];

            while (true) {

                bytecnt1++;

                if (bytecnt1 === uncompleng) break;

                if (lzwbuf2[addr] < 0) {
                    lzwbuf2[addr] = addrcnt;
                    break;
                }

                let newaddr = lzwbuf2[addr];

                while (lzwbuf1[newaddr] !== data[bytecnt1]) {
                    const zx = lzwbuf3[newaddr];
                    if (zx < 0) {
                        lzwbuf3[newaddr] = addrcnt;
                        break;
                    }
                    newaddr = zx;
                }

                if (lzwbuf3[newaddr] === addrcnt) break;

                addr = newaddr;

            }

            lzwbuf1[addrcnt] = (bytecnt1 < uncompleng) ? data[bytecnt1] : 0;
            lzwbuf2[addrcnt] = -1;
            lzwbuf3[addrcnt] = -1;

            writeCode(addr);

            addrcnt++;

            if (addrcnt > oneupnumbits) {
                numbits++;
                oneupnumbits <<= 1;
            }

        }

        writeCode(addr);

        const dv = new DataView(outbuf.buffer);

        dv.setUint16(0, uncompleng, true); 

        const finalLen = (bitcnt + 7) >> 3;

        if (finalLen < uncompleng) {
            dv.setUint16(2, addrcnt, true);
            return outbuf.slice(0, finalLen);
        }

        dv.setUint16(2, 0, true);
        const out = new Uint8Array(uncompleng + 4);
        out.set(outbuf.slice(0, 4));
        out.set(data, 4);

        return out;

    }

    static uncompress(data) {

        const uncompleng = data[0] | (data[1] << 8);
        const strtot = data[2] | (data[3] << 8);

        if (strtot === 0) {
            return data.slice(4, 4 + uncompleng);
        }

        const lzwbuf1 = new Uint8Array(65536);
        const lzwbuf2 = new Int16Array(65536);
        const lzwbuf3 = new Int16Array(65536);

        for (let i = 0; i < 256; i++) {
            lzwbuf2[i] = i;
            lzwbuf3[i] = i;
        }

        const out = new Uint8Array(uncompleng);
        let outbytecnt = 0;
        let currstr = 256;
        let bitcnt = 32;
        let numbits = 8;
        let oneupnumbits = 1 << 8;

        const readCode = () => {
            const bytePos = bitcnt >> 3;
            const bitOff = bitcnt & 7;
            const v = data[bytePos] | (data[bytePos+1]<<8) | (data[bytePos+2]<<16) | (data[bytePos+3]<<24);
            let dat = (v >>> bitOff) & (oneupnumbits - 1);
            bitcnt += numbits;
            if ((dat & ((oneupnumbits>>1)-1)) > ((currstr-1) & ((oneupnumbits>>1)-1))) {
                dat &= ((oneupnumbits>>1)-1);
                bitcnt--;
            }
            return dat;
        };

        while (currstr < strtot) {

            const dat = readCode();
            lzwbuf3[currstr] = dat;

            let stackLen = 0;
            let tmp = dat;

            while (tmp >= 256) {
                lzwbuf1[stackLen++] = lzwbuf2[tmp];
                tmp = lzwbuf3[tmp];
            }

            out[outbytecnt++] = tmp;

            for (let i = stackLen - 1; i >= 0; i--) {
                out[outbytecnt++] = lzwbuf1[i];
            }

            lzwbuf2[currstr - 1] = tmp;
            lzwbuf2[currstr] = tmp;

            currstr++;

            if (currstr > oneupnumbits) {
                numbits++;
                oneupnumbits <<= 1;
            }

        }

        return out;

    }

}

Build.Enums.AnimationType = {
    Oscilating: 1,
    Forward: 2,
    Backward: 3
}

Build.Enums.ByteVersion = {

    // ==================================================
    // DUKE
    // ==================================================

    DOSDUKE_1_3               : 1,
    DOSDUKE_1_3_1_4_Plutonium : 27,
    DOSDUKE_1_4_Plutonium     : 116,
    DOSDUKE_1_3_1_5_Engine    : 28,
    DOSDUKE_1_5_Atomic        : 117,
    
    XDUKE_19_6_1_3        : 29,
    XDUKE_19_6_1_5_Atomic : 118,
    XDUKE_19_7            : 119,

    NDUKE_1               : 128,
    NDUKE_2               : 129,

    HDUKE_1               : 246,
    HDUKE_2               : 247,
    HDUKE_3               : 248,
    HDUKE_4               : 249,
    HDUKE_5               : 250,
    HDUKE_6               : 251,
    HDUKE_7               : 252,
    HDUKE_TDM             : 253,
    HDUKE_FORTS           : 254,

    PRODUKE_0_3           : 150,

    DOSDUKE: (version) => {
        return [
            Build.Enums.ByteVersion.DOSDUKE_1_3,
            Build.Enums.ByteVersion.DOSDUKE_1_3_1_4_Plutonium,
            Build.Enums.ByteVersion.DOSDUKE_1_4_Plutonium,
            Build.Enums.ByteVersion.DOSDUKE_1_3_1_5_Engine,
            Build.Enums.ByteVersion.DOSDUKE_1_5_Atomic,
        ].some(v => v == version);
    },

    XDUKE: (version) => {
        return [
            Build.Enums.ByteVersion.XDUKE_19_6_1_3,
            Build.Enums.ByteVersion.XDUKE_19_6_1_5_Atomic,
            Build.Enums.ByteVersion.XDUKE_19_7
        ].some(v => v == version);
    },

    HDUKE: (version) => {
        return [
            Build.Enums.ByteVersion.HDUKE_1,
            Build.Enums.ByteVersion.HDUKE_2,
            Build.Enums.ByteVersion.HDUKE_3,
            Build.Enums.ByteVersion.HDUKE_4,
            Build.Enums.ByteVersion.HDUKE_5,
            Build.Enums.ByteVersion.HDUKE_6,
            Build.Enums.ByteVersion.HDUKE_7,
            Build.Enums.ByteVersion.HDUKE_TDM,
            Build.Enums.ByteVersion.HDUKE_FORTS
        ].some(v => v == version);
    },

    NDUKE: (version) => {
        return [
            Build.Enums.ByteVersion.NDUKE_1,
            Build.Enums.ByteVersion.NDUKE_2
        ].some(v => v == version);
    },

    PRODUKE: (version) => {
        return [
            Build.Enums.ByteVersion.PRODUKE_0_3,
        ].some(v => v == version);
    },

    DUKE: (version) => {
        return (
            Build.Enums.ByteVersion.DOSDUKE(version) ||
            Build.Enums.ByteVersion.XDUKE(version) ||
            Build.Enums.ByteVersion.HDUKE(version) ||
            Build.Enums.ByteVersion.NDUKE(version) ||
            Build.Enums.ByteVersion.PRODUKE(version)
        );
    },

    // ==================================================
    // REDNECK RAMPAGE
    // ==================================================

    REDNUKEM_RR_RA : 108,

    REDNUKEM: (version) => {
        return [
            Build.Enums.ByteVersion.REDNUKEM_RR_RA,
        ].some(v => v == version);
    },

    RR: (version) => {
        return (
            Build.Enums.ByteVersion.REDNUKEM(version)
        );
    },

    // ==================================================
    // SHADOW WARRIOR
    // ==================================================

    VOIDSW_2 : 101,

    VOIDSW: (version) => {
        return [
            Build.Enums.ByteVersion.VOIDSW_2,
        ].some(v => v == version);
    },

    SW: (version) => {
        return (
            Build.Enums.ByteVersion.VOIDSW(version)
        );
    },

    // ==================================================
    // BLOOD
    // ==================================================

    NOTBLOOD_1_9_9_9 : 277,

    NOTBLOOD: (version) => {
        return [
            Build.Enums.ByteVersion.NOTBLOOD_1_9_9_9,
        ].some(v => v == version);
    },

    BLOOD: (version) => {
        return (
            Build.Enums.ByteVersion.NOTBLOOD(version)
        );
    },

}

Build.Enums.DemoType = {
    DMO: "DMO",
    SWD: "SWD",
    BLD: "BLD"
}

Build.Enums.EffectorTag = {
    Pivot: 1,
    Earthquake: 2,
    RandomLightsAfterShotOut: 3,
    RandomLights: 4,
    HomingTurret: 5,
    SubwayEngine: 6,
    Teleporter: 7,
    OpenDoorRoomLights: 8,
    CloseDoorRoomLights: 9,
    DoorAutoClose: 10,
    SwingingDoorHinge: 11,
    LightSwitch: 12,
    Explosive: 13,
    SubwayCar: 14,
    SlidingDoor: 15,
    RotateReactorSector: 16,
    TransportElevator: 17,
    IncrementalSectorRaiseFall: 18,
    CeilingFallsFromExplosion: 19,
    StretchingShrinkingSector: 20,
    FloorRiseCeilingDrop: 21,
    TeethDoor: 22,
    OneWayTeleporterExit: 23,
    ConveyorBelt: 24,
    Piston: 25,
    Escalator: 26,
    DemoCamera: 27,
    LightningBolt: 28,
    FloatingSector: 29,
    TwoWayTrain: 30,
    RaiseLowerFloor: 31,
    RaiseLowerCeiling: 32,
    EarthquakeDebris: 33,
    AlternativeConveyorBelt: 34,
    Drill: 35,
    AutomaticShooter: 36,
    FloorOverFloor0: 40,
    FloorOverFloor1: 41,
    FloorOverFloor2: 42,
    FloorOverFloor3: 43,
    FloorOverFloor4: 44,
    FloorOverFloor5: 45,
    AdjustWall: 128,
    Fireworks1: 130,
    Fireworks2: 131
}

Build.Enums.LookupType = {
    DAT: "DAT"
}

Build.Enums.MapType = {
    MAP: "MAP", // dn, rr, sw, fury
    BLM: "BLM", // blood
}

Build.Enums.PaletteType = {
    DAT: "DAT"
}

Build.Enums.Picnum = {
    Effectors: {
        SectorEffector: 1,
        Activator: 2,
        Touchplate: 3,
        Locker: 4,
        MusicAndSfx: 5,
        Locator: 6,
        Cycler: 7,
        MasterSwitch: 8,
        Respawn: 9,
        Speed: 10
    },
    Spawn: 1405,
    Card: 60,
    Weapons: {
        Pistol: 21,
        Shotgun: 28,
        Chaingun: 22,
        RPG: 23,
        Pipebomb: 26,
        Shrinker: 25,
        Devastator: 29,
        Freezer: 24,
        Tripbomb: 27
    },
    Ammo: {
        Pistol: 40,
        Shotgun: 49,
        Chaingun: 41,
        RPG: 44,
        Pipebomb: 47,
        Shrinker: 46,
        Expander: 45,
        Devastator: 42,
        Freezer: 37
    },
    Inventory: {
        Medkit: 53,
        Armor: 54,
        Steroids: 55,
        Scuba: 56,
        JetPack: 57,
        NightVision: 59,
        Boots: 61,
        Holoduke: 1348
    },
    Health: {
        Small: 51,
        Medium: 52,
        Atomic: 100
    },
    NDuke: {
        Flag: 5120
    },
    ProDuke: {
        Flag: 5888
    },
    DamagingFloorTextures: {
        FloorSlime: 200,
        HurtRail: 859,
        FloorPlasma: 1082,
        PurpleLava: 4240
    },
    get Items () {
        return [
            Build.Enums.Picnum.Spawn,
            Build.Enums.Picnum.Card,
            ...Object.values(Build.Enums.Picnum.Weapons),
            ...Object.values(Build.Enums.Picnum.Ammo),
            ...Object.values(Build.Enums.Picnum.Inventory),
            ...Object.values(Build.Enums.Picnum.Health),
            Build.Enums.Picnum.ProDuke.Flag,
            Build.Enums.Picnum.NDuke.Flag
        ];
    }
}

Build.Enums.SectorCstat = {
    Parallaxing: 0,
    Sloped: 1,
    SwapXY: 2,
    DoubleSmooshiness: 3,
    FlipX: 4,
    FlipY: 5,
    AlignTextureToFirstWallOfSector: 6
}

Build.Enums.SectorTag = {
    AboveWaterSector: 1,
    BelowWaterSector: 2,
    Boss2RoamSector: 3,
    StarTrekDoor: 9,
    TransportElevator: 15,
    ElevatorPlatformDown: 16,
    ElevatorPlatformUp: 17,
    ElevatorDown: 18,
    ElevatorUp: 19,
    CeilingDoor: 20,
    FloorDoor: 21,
    SplitDoor: 22,
    SwingingDoor: 23,
    Reserved: 24,
    SlidingDoor: 25,
    SplitStarTrekDoor: 26,
    StretchingShrinkingSector: 27,
    FloorRiseCeilingDrop: 28,
    TeethDoor: 29,
    RotateRiseSector: 30,
    TwoWayTrain: 31,
    OneTimeSound: 10000,
    SecretPlace: 32767,
    EndOfLevelWithMessage: 65534,
    EndOfLevel: 65535
}

Build.Enums.SpriteCstat = {
    Blocking: 0,
    Transluscence1: 1,
    FlippedX: 2,
    FlippedY: 3,    
    WallAligned: 4,
    FloorAligned: 5,
    OneSided: 6,
    Centered: 7,
    HitscanBlocking: 8,
    Transluscence2: 9,
    Invisible: 15
}

Build.Enums.StorageType = {
    GRP: "GRP", // dn, rr, sw
    PK3: "PK3", // fury
    RFF: "RFF", // blood
    SSI: "SSI", // dlc
}

Build.Enums.WallCstat = {
    Blocking: 0, 
    BottomsOfInvisibleWallsSwapped: 1, 
    AlignPictureOnBottom: 2, 
    FlippedX: 3, 
    Masking: 4, 
    OneWay: 5, 
    HitscanBlocking: 6, 
    Transluscence1: 7, 
    FlippedY: 8, 
    Transluscence2: 9
}

// reference: https://moddingwiki.shikadi.net/wiki/ART_Format_(Build)
Build.Models.Art = class Art {
    
    constructor (bytes) {

        const reader = new Build.Scripts.ByteReader(bytes);

        // check for ion fury signature
        if (String.fromCharCode(...bytes.slice(0, 8)) === "BUILDART") {
            this.Signature = reader.string(8);
            console.log("Reading Ion Fury ART, this may take a while...");
        }

        this.Version = reader.uint32();
        this.Length = reader.uint32();
        this.Start = reader.uint32();
        this.End = reader.uint32();

        const numtiles = this.End - this.Start + 1;

        this.Tiles = new Array(numtiles);

        for (let i = 0; i < numtiles; i++) this.Tiles[i] = {};

        const sizex = [];

        for (let i = 0; i < numtiles; i++) sizex.push(reader.uint16()); 

        const sizey = [];
        
        for (let i = 0; i < numtiles; i++) sizey.push(reader.uint16());
    
        for (let i = 0; i < numtiles; i++) {
            const bitreader = new Build.Scripts.BitReader(reader.uint32());
            this.Tiles[i].animation = {
                frames: bitreader.uint(6),
                type: bitreader.uint(2),
                offsetX: bitreader.int(8),
                offsetY: bitreader.int(8),
                speed: bitreader.uint(4),
                unused: bitreader.uint(4)
            };
        }

        for (let i = 0; i < numtiles; i++) {
            this.Tiles[i].pixels = [];
            for (let x = 0; x < sizex[i] ; x++) {
                this.Tiles[i].pixels[x] = [];
                for (let y = 0; y < sizey[i]; y++) {
                    this.Tiles[i].pixels[x][y] = reader.uint8();
                }
            }
        }

    }

    Serialize() {

        const numtiles = this.End - this.Start + 1

        const writer = new Build.Scripts.ByteWriter();

        // check for ion fury signature
        if (this.Signature) {
            writer.string(this.Signature, this.Signature.length);
            console.log("Writing Ion Fury ART, this may take a while...");
        }

        writer.int32(this.Version);
        writer.int32(this.Length);
        writer.int32(this.Start);
        writer.int32(this.End);
        
        for (let i = 0; i < this.Tiles.length; i++) {
            writer.int16(this.Tiles[i].pixels.length);
        }

        for (let i = 0; i < this.Tiles.length; i++) {
            writer.int16(this.Tiles[i].pixels.length > 0 ? this.Tiles[i].pixels[0].length : 0);
        }        

        for (let i = 0; i < this.Tiles.length; i++) {
            const bitwriter = new Build.Scripts.BitWriter();
            bitwriter.uint(6, this.Tiles[i].animation.frames);
            bitwriter.uint(2, this.Tiles[i].animation.type);
            bitwriter.int(8, this.Tiles[i].animation.offsetX);
            bitwriter.int(8, this.Tiles[i].animation.offsetY);
            bitwriter.uint(4, this.Tiles[i].animation.speed);
            bitwriter.uint(4, this.Tiles[i].animation.unused);
            writer.int32(bitwriter.value);
        }

        for (let i = 0; i < this.Tiles.length; i++) {
            for (let x = 0; x < this.Tiles[i].pixels.length ; x++) {
                for (let y = 0; y < this.Tiles[i].pixels[x].length; y++) {
                    writer.int8(this.Tiles[i].pixels[x][y]);
                }
            }
        }

        return writer.bytes;

    }

}

Build.Models.Demo = class Demo {

    constructor (bytes) {

        if (!bytes) return;

        let byteVersion = bytes[4];

        // check for blood demo signature
        if (String.fromCharCode(...bytes.slice(0, 4)) === "DEM\u001A") {
            // blood demo byte version is an int16 not an int8
            byteVersion = (bytes[4] | bytes[5] << 8) << 16 >> 16;
        }

        switch (true) {
            case Build.Enums.ByteVersion.DUKE(byteVersion): return new Build.Models.Demo.DMO(bytes);
            case Build.Enums.ByteVersion.RR(byteVersion): return new Build.Models.Demo.DMO(bytes);
            case Build.Enums.ByteVersion.SW(byteVersion): return new Build.Models.Demo.SWD(bytes);            
            case Build.Enums.ByteVersion.BLOOD(byteVersion): return new Build.Models.Demo.BLD(bytes);
        }

    }

    Serialize () {
        throw new Error("Method not implemented.");
    }

}

Build.Models.Lookup = class Lookup {

    constructor (bytes) {
        if (!bytes) return;
        return new Build.Models.Lookup.DAT(bytes);
    }

    Serialize () {
        throw new Error("Method not implemented.");
    }

}

Build.Models.Map = class Map {

    constructor (bytes) {
        switch (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) {
            case 0x00000007: return new Build.Models.Map.MAP(bytes); // MAP
            case 0x00000008: return new Build.Models.Map.MAP(bytes); // MAP
            case 0x00000009: return new Build.Models.Map.MAP(bytes); // MAP
            case 0x1A4D4C42: return new Build.Models.Map.BLM(bytes); // BLM\x1a
            case 0x1B4D4C42: return new Build.Models.Map.BLM(bytes); // BLM\x1b
        }
    }

    Serialize () {
        throw new Error("Method not implemented.");
    }

}

Build.Models.Palette = class Palette {

    constructor (bytes) {
        if (!bytes) return;
        return new Build.Models.Palette.DAT(bytes);
    }

    Serialize () {
        throw new Error("Method not implemented.");
    }

}

Build.Models.Storage = class Storage {

    constructor (bytes) {
        switch (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) {
            case 0x536E654B: return new Build.Models.Storage.GRP(bytes); // KenS
            case 0x1A464652: return new Build.Models.Storage.RFF(bytes); // RFF\x1a
            case 0x04034B50: return new Build.Models.Storage.PK3(bytes); // PK\x03\x04
            case 0x00000001: return new Build.Models.Storage.SSI(bytes); // \x01\x00\x00\x00
            case 0x00000002: return new Build.Models.Storage.SSI(bytes); // \x02\x00\x00\x00
            case 0x44415749: return new Build.Models.Storage.WAD(bytes); // IWAD
            case 0x44415750: return new Build.Models.Storage.WAD(bytes); // PWAD
        }
    }

    AddFile (name, bytes) {
        throw new Error("Method not implemented.");
    }
        
    Serialize () {
        throw new Error("Method not implemented.");
    }

}

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

// reference: https://moddingwiki.shikadi.net/wiki/Duke_Nukem_3D_Palette_Format
Build.Models.Lookup.DAT = class DAT extends Build.Models.Lookup {

    constructor(bytes) {

        super();

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Swaps = new Array(bytes ? reader.uint8() : 0);

        for (let i = 0; i < this.Swaps.length; i++) {
            this.Swaps[i] = {
                number: reader.uint8(),
                table: new Array(256).fill(0).map(() => reader.uint8())
            };
        }

        this.AlternativePalettes = new Array(bytes ? (bytes.length - reader.index) / (256*3) : 0);

        for (let i = 0; i < this.AlternativePalettes.length; i++) {        
            this.AlternativePalettes[i] = new Array(256).fill(0).map(() => ({
                // scale from 0...64 to 0...256 (DOS limitation)
                r: (reader.uint8() * 255) / 64,
                g: (reader.uint8() * 255) / 64,
                b: (reader.uint8() * 255) / 64
            }));   
        }

    }

    Serialize() {

        const writer = new Build.Scripts.ByteWriter();

        writer.int8(this.Swaps.length);

        for (const swap of this.Swaps) {
            writer.int8(swap.number);
            for (const value of swap.table) {
                writer.int8(value);
            }
        }

        for (const alternativePalette of this.AlternativePalettes) {
            for (const color of alternativePalette) {
                // scale from 0...256 to 0...64 (DOS limitation)
                writer.int8(Math.round((color.r * 64) / 255));
                writer.int8(Math.round((color.g * 64) / 255));
                writer.int8(Math.round((color.b * 64) / 255));
            }
        }

        return writer.bytes;

    };

}

// reference: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp
Build.Models.Map.BLM = class BLM extends Build.Models.Map {

    static NewKey = 0x7474614D; // 'ttaM' signature
    static OldKey = 0x4D617474; // 'Matt' signature

    static HeaderSize = 37;
    static ExtraHeaderSize = 128;

    static SectorSize = 40;
    static WallSize = 32;
    static SpriteSize = 44;

    static XSectorSize = 60;    
    static XWallSize = 24;
    static XSpriteSize = 56;

    constructor (bytes) {

        super([]);

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Signature = bytes ? reader.string(4) : "BLM\x1a";        
        this.Version = bytes ? reader.int16() : 0x0700;

        // version flag?
        this.byte1A76C8 = (this.Version & 0xFF00) === 0x0700;
        this.byte1A76C7 = false;
        this.byte1A76C6 = false;

        // read header bytes
        let headerBytes = bytes ? reader.read(BLM.HeaderSize) : 0;

        // get int32 key (where the "song id" would be)
        this.at16 = bytes ? ((headerBytes[22] << 0) | (headerBytes[23] << 8) | (headerBytes[24] << 16) | (headerBytes[25] << 24)) >>> 0 : 0;

        // check if decryption is needed
        if (this.at16 !== 0 && this.at16 !== BLM.NewKey && this.at16 !== BLM.OldKey) {

            // decrypt header bytes
            headerBytes = Build.Scripts.ENCXOR.Compute(headerBytes, {
                seed: BLM.NewKey
            });

            // ecryption flag?
            this.byte1A76C7 = true;

        }

        // create header reader
        const headerReader = new Build.Scripts.ByteReader(headerBytes);

        // read map header
        this.X = bytes ? headerReader.int32() : 0;
        this.Y = bytes ? headerReader.int32() : 0;
        this.Z = bytes ? headerReader.int32() : 0;
        this.A = bytes ? headerReader.int16() : 0;
        this.S = bytes ? headerReader.int16() : 0;
        this.SkyBits = bytes ? headerReader.int16() & 0xFF : 0; // int16 to int8 (original code did this, why tho?)
        this.Visibility = bytes ? headerReader.int32() : 0;
        this.SongId = bytes ? headerReader.int32() : 0;
        this.Parallax = bytes ? headerReader.int8() : 0;
        this.Revision = bytes ? headerReader.int32() : 0;

        // get number of structs
        this.Sectors = new Array(bytes ? headerReader.uint16() : 0);
        this.Walls = new Array(bytes ? headerReader.uint16() : 0);
        this.Sprites = new Array(bytes ? headerReader.uint16() : 0);

        // another flag?
        if (this.byte1A76C8) {
            if (this.SongId === BLM.NewKey || this.SongId === BLM.OldKey) {                
                this.byte1A76C6 = true;
            } else if (!this.SongId) {
                this.byte1A76C6 = false;
            }
        }

        // read extra flags header
        if (this.byte1A76C8) {
            const extraHeaderBytes = Build.Scripts.ENCXOR.Compute(bytes ? reader.read(BLM.ExtraHeaderSize) : [], {
                seed: this.Walls.length
            });
            const extraReader = new Build.Scripts.ByteReader(extraHeaderBytes);
            this.XPadStart = bytes ? extraReader.read(64) : new Array(64).fill(0);
            this.XSpriteSize = bytes ? extraReader.uint32() : BLM.XSpriteSize;
            this.XWallSize = bytes ? extraReader.uint32() : BLM.XWallSize;
            this.XSectorSize = bytes ? extraReader.uint32() : BLM.XSectorSize;
            this.XPadEnd = bytes ? extraReader.read(52) : new Array(52).fill(0);
        }

        // sky offsets
        this.SkyOffsets = new Array(bytes ? (1 << this.SkyBits) : 0);

        // read sky bytes (read 2 bytes per offset because it is a int16 array)
        let skyBytes = bytes ? reader.read(this.SkyOffsets.length * 2) : [];

        // check if sky bytes needs to be decrypted
        if (this.byte1A76C8) {

            // decrypt sky bytes
            skyBytes = Build.Scripts.ENCXOR.Compute(skyBytes, {
                seed: this.SkyOffsets.length * 2
            });

        }

        // read sky offsets (int16 array)
        for (let i = 0; i < this.SkyOffsets.length; i++) {
            this.SkyOffsets[i] = skyBytes[i*2] << 0 | skyBytes[(i*2)+1] << 8;
        }

        // read sectors
        for (let i = 0; i < this.Sectors.length; i++) {

            // read sector bytes
            let sectorBytes = reader.read(BLM.SectorSize);

            // check if sector bytes needs to be decrypted
            if (this.byte1A76C8) {

                // decrypt sector bytes
                sectorBytes = Build.Scripts.ENCXOR.Compute(sectorBytes, {
                    seed: this.Revision * BLM.SectorSize
                });

            }

            // creater sector reader
            const sectorReader = new Build.Scripts.ByteReader(sectorBytes);

            // read sector struct
            this.Sectors[i] = {
                wallptr: sectorReader.int16(),
                wallnum: sectorReader.int16(),
                ceilingz: sectorReader.int32(),
                floorz: sectorReader.int32(),
                ceilingstat: sectorReader.uint16(),
                floorstat: sectorReader.uint16(),
                ceilingpicnum: sectorReader.int16(),
                ceilingheinum: sectorReader.int16(),
                ceilingshade: sectorReader.int8(),
                ceilingpal: sectorReader.uint8(),
                ceilingxpanning: sectorReader.uint8(),
                ceilingypanning: sectorReader.uint8(),
                floorpicnum: sectorReader.int16(),
                floorheinum: sectorReader.int16(),
                floorshade: sectorReader.int8(),
                floorpal: sectorReader.uint8(),
                floorxpanning: sectorReader.uint8(),
                floorypanning: sectorReader.uint8(),
                visibility: sectorReader.uint8(),
                filler: sectorReader.uint8(),
                lotag: sectorReader.int16(),
                hitag: sectorReader.int16(),
                extra: sectorReader.int16()
            };

            // check if sector extra needs to be read
            if (this.Sectors[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                this.Sectors[i].xsector = reader.read(this.byte1A76C8 ? this.XSectorSize : BLM.XSectorSize);

            }

        }

        // read walls
        for (let i = 0; i < this.Walls.length; i++) {

            // read wall bytes
            let wallBytes = reader.read(BLM.WallSize);

            // check if wall bytes needs to be decrypted
            if (this.byte1A76C8) {

                // decrypt wall bytes
                // yeah, this part uses sectorsize for some reason
                // reference: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1974
                wallBytes = Build.Scripts.ENCXOR.Compute(wallBytes, {
                    seed: (this.Revision * BLM.SectorSize) | BLM.NewKey
                });

            }

            // create wall reader
            const wallReader = new Build.Scripts.ByteReader(wallBytes);

            // read wall struct
            this.Walls[i] = {
                x: wallReader.int32(),
                y: wallReader.int32(),
                point2: wallReader.int16(),
                nextwall: wallReader.int16(),
                nextsector: wallReader.int16(),
                cstat: wallReader.int16(),
                picnum: wallReader.int16(),
                overpicnum: wallReader.int16(),
                shade: wallReader.int8(),
                pal: wallReader.uint8(),
                xrepeat: wallReader.uint8(),
                yrepeat: wallReader.uint8(),
                xpanning: wallReader.uint8(),
                ypanning: wallReader.uint8(),
                lotag: wallReader.int16(),
                hitag: wallReader.int16(),
                extra: wallReader.int16()
            };

            // check if wall extra needs to be read
            if (this.Walls[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1973
                this.Walls[i].xwall = reader.read(this.byte1A76C8 ? this.XWallSize : BLM.XWallSize);

            }

        }

        // read sprites
        for (let i = 0; i < this.Sprites.length; i++) {

            // read sprite bytes
            let spriteBytes = reader.read(BLM.SpriteSize);

            // check if sprite bytes needs to be decrypted
            if (this.byte1A76C8) {

                // decrypt sprite bytes
                spriteBytes = Build.Scripts.ENCXOR.Compute(spriteBytes, {
                    seed: (this.Revision * BLM.SpriteSize) | BLM.NewKey
                });

            }

            // creater sprite reader
            const spriteReader = new Build.Scripts.ByteReader(spriteBytes);

            // read wall struct
            this.Sprites[i] = {
                x: spriteReader.int32(),
                y: spriteReader.int32(),
                z: spriteReader.int32(),
                cstat: spriteReader.int16(),
                picnum: spriteReader.int16(),
                shade: spriteReader.int8(),
                pal: spriteReader.uint8(),
                clipdist: spriteReader.uint8(),
                filler: spriteReader.uint8(),
                xrepeat: spriteReader.uint8(),
                yrepeat: spriteReader.uint8(),
                xoffset: spriteReader.int8(),
                yoffset: spriteReader.int8(),
                sectnum: spriteReader.int16(),
                statnum: spriteReader.int16(),
                ang: spriteReader.int16(),
                owner: spriteReader.int16(),
                xvel: spriteReader.int16(),
                yvel: spriteReader.int16(),
                zvel: spriteReader.int16(),
                lotag: spriteReader.int16(),
                hitag: spriteReader.int16(),
                extra: spriteReader.int16()
            };

            // check if sprite extra needs to be read
            if (this.Sprites[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L2060
                this.Sprites[i].xsprite = reader.read(this.byte1A76C8 ? this.XSpriteSize : BLM.XSpriteSize);

            }

        }

        // read crc
        this.CRC = bytes ? reader.uint32() : 0;

    }

    Serialize () {

        // create byte writer
        const writer = new Build.Scripts.ByteWriter();

        // write BLM\x1a signature
        writer.string(this.Signature, 4);
        
        // write map version
        writer.int16(this.Version);

        // create buffer for header bytes
        let headerBytes = [];

        // create header writer
        const headerWriter = new Build.Scripts.ByteWriter();

        // write map header bytes to local writer
        headerWriter.int32(this.X);
        headerWriter.int32(this.Y);
        headerWriter.int32(this.Z);
        headerWriter.int16(this.A);
        headerWriter.int16(this.S);
        headerWriter.int16(this.SkyBits);
        headerWriter.int32(this.Visibility);
        headerWriter.int32(this.SongId);
        headerWriter.int8(this.Parallax);
        headerWriter.int32(this.Revision);
        headerWriter.int16(this.Sectors.length);
        headerWriter.int16(this.Walls.length);
        headerWriter.int16(this.Sprites.length);

        // check if header bytes needs to be encrypted
        if (this.byte1A76C7) {

            // encrypt header bytes
            headerBytes = Build.Scripts.ENCXOR.Compute(headerWriter.bytes, {
                seed: BLM.NewKey
            });

        } else {

            // just copy bytes
            headerBytes = headerWriter.bytes;

        }

        // write header bytes
        writer.write(headerBytes);

        // write extra flags header
        if (this.byte1A76C8) {
            const extraWriter = new Build.Scripts.ByteWriter();
            extraWriter.write(this.XPadStart); // 64
            extraWriter.int32(this.XSpriteSize);
            extraWriter.int32(this.XWallSize);
            extraWriter.int32(this.XSectorSize);
            extraWriter.write(this.XPadEnd); // 52
            writer.write(Build.Scripts.ENCXOR.Compute(extraWriter.bytes, {
                seed: this.Walls.length
            }));
        }

        // create buffer from sky bytes
        let skyBytes = [];

        // create sky writer
        const skyWriter = new Build.Scripts.ByteWriter();

        // write sky bytes to local writer
        for (let i = 0; i < this.SkyOffsets.length; i++) {
            skyWriter.int16(this.SkyOffsets[i]);            
        }

        // check if sky bytes needs to be encrypted
        if (this.byte1A76C8) {

            // encrypt sky bytes
            skyBytes = Build.Scripts.ENCXOR.Compute(skyWriter.bytes, {
                seed: this.SkyOffsets.length * 2
            });

        } else {

            // just copy bytes
            skyBytes = skyWriter.bytes;

        }

        // write sky bytes
        writer.write(skyBytes);

        // write sectors
        for (let i = 0; i < this.Sectors.length; i++) {

            let sectorBytes = [];

            const sectorWriter = new Build.Scripts.ByteWriter();

            // write sector struct
            sectorWriter.int16(this.Sectors[i].wallptr);
            sectorWriter.int16(this.Sectors[i].wallnum);
            sectorWriter.int32(this.Sectors[i].ceilingz);
            sectorWriter.int32(this.Sectors[i].floorz);
            sectorWriter.int16(this.Sectors[i].ceilingstat);
            sectorWriter.int16(this.Sectors[i].floorstat);
            sectorWriter.int16(this.Sectors[i].ceilingpicnum);
            sectorWriter.int16(this.Sectors[i].ceilingheinum);
            sectorWriter.int8(this.Sectors[i].ceilingshade);
            sectorWriter.int8(this.Sectors[i].ceilingpal);
            sectorWriter.int8(this.Sectors[i].ceilingxpanning);
            sectorWriter.int8(this.Sectors[i].ceilingypanning);
            sectorWriter.int16(this.Sectors[i].floorpicnum);
            sectorWriter.int16(this.Sectors[i].floorheinum);
            sectorWriter.int8(this.Sectors[i].floorshade);
            sectorWriter.int8(this.Sectors[i].floorpal);
            sectorWriter.int8(this.Sectors[i].floorxpanning);
            sectorWriter.int8(this.Sectors[i].floorypanning);
            sectorWriter.int8(this.Sectors[i].visibility);
            sectorWriter.int8(this.Sectors[i].filler);
            sectorWriter.int16(this.Sectors[i].lotag);
            sectorWriter.int16(this.Sectors[i].hitag);
            sectorWriter.int16(this.Sectors[i].extra);

            // check if sector bytes needs to be encrypted
            if (this.byte1A76C8) {

                // encrypt sector bytes
                sectorBytes = Build.Scripts.ENCXOR.Compute(sectorWriter.bytes, {
                    seed: this.Revision * BLM.SectorSize
                });

            } else {

                // just copy bytes
                sectorBytes = sectorWriter.bytes;

            }

            // write sector bytes
            writer.write(sectorBytes);

            // check if sector extra needs to be written
            if (this.Sectors[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(this.Sectors[i].xsector);

            }

        }

        // write walls
        for (let i = 0; i < this.Walls.length; i++) {

            let wallBytes = [];

            const wallWriter = new Build.Scripts.ByteWriter();

            // write wall struct
            wallWriter.int32(this.Walls[i].x);
            wallWriter.int32(this.Walls[i].y);
            wallWriter.int16(this.Walls[i].point2);
            wallWriter.int16(this.Walls[i].nextwall);
            wallWriter.int16(this.Walls[i].nextsector);
            wallWriter.int16(this.Walls[i].cstat);
            wallWriter.int16(this.Walls[i].picnum);
            wallWriter.int16(this.Walls[i].overpicnum);
            wallWriter.int8(this.Walls[i].shade);
            wallWriter.int8(this.Walls[i].pal);
            wallWriter.int8(this.Walls[i].xrepeat);
            wallWriter.int8(this.Walls[i].yrepeat);
            wallWriter.int8(this.Walls[i].xpanning);
            wallWriter.int8(this.Walls[i].ypanning);
            wallWriter.int16(this.Walls[i].lotag);
            wallWriter.int16(this.Walls[i].hitag);
            wallWriter.int16(this.Walls[i].extra);

            // check if wall bytes needs to be encrypted
            if (this.byte1A76C8) {

                // encrypt wall bytes
                // yeah, this part uses sectorsize for some reason
                // reference: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1974
                wallBytes = Build.Scripts.ENCXOR.Compute(wallWriter.bytes, {
                    seed: (this.Revision * BLM.SectorSize) | BLM.NewKey
                });

            } else {

                // just copy bytes
                wallBytes = wallWriter.bytes;

            }

            // write wall bytes
            writer.write(wallBytes);

            // check if wall extra needs to be written
            if (this.Walls[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(this.Walls[i].xwall);

            }

        }

        // write sprites
        for (let i = 0; i < this.Sprites.length; i++) {

            let spriteBytes = [];

            const spriteWriter = new Build.Scripts.ByteWriter();

            // write sprite struct
            spriteWriter.int32(this.Sprites[i].x);
            spriteWriter.int32(this.Sprites[i].y);
            spriteWriter.int32(this.Sprites[i].z);
            spriteWriter.int16(this.Sprites[i].cstat);
            spriteWriter.int16(this.Sprites[i].picnum);
            spriteWriter.int8(this.Sprites[i].shade);
            spriteWriter.int8(this.Sprites[i].pal);
            spriteWriter.int8(this.Sprites[i].clipdist);
            spriteWriter.int8(this.Sprites[i].filler);
            spriteWriter.int8(this.Sprites[i].xrepeat);
            spriteWriter.int8(this.Sprites[i].yrepeat);
            spriteWriter.int8(this.Sprites[i].xoffset);
            spriteWriter.int8(this.Sprites[i].yoffset);
            spriteWriter.int16(this.Sprites[i].sectnum);
            spriteWriter.int16(this.Sprites[i].statnum);
            spriteWriter.int16(this.Sprites[i].ang);
            spriteWriter.int16(this.Sprites[i].owner);
            spriteWriter.int16(this.Sprites[i].xvel);
            spriteWriter.int16(this.Sprites[i].yvel);
            spriteWriter.int16(this.Sprites[i].zvel);
            spriteWriter.int16(this.Sprites[i].lotag);
            spriteWriter.int16(this.Sprites[i].hitag);
            spriteWriter.int16(this.Sprites[i].extra);

            // check if sprite bytes needs to be encrypted
            if (this.byte1A76C8) {

                // encrypt sprite bytes
                spriteBytes = Build.Scripts.ENCXOR.Compute(spriteWriter.bytes, {
                    seed: (this.Revision * BLM.SpriteSize) | BLM.NewKey
                });

            } else {

                // just copy bytes
                spriteBytes = spriteWriter.bytes;

            }

            // write sprite bytes
            writer.write(spriteBytes);

            // check if sprite extra needs to be written
            if (this.Sprites[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(this.Sprites[i].xsprite);

            }

        }

        // write crc
        writer.int32(this.CRC);
        
        // return map bytes
        return writer.bytes;

    }

}

// reference: https://moddingwiki.shikadi.net/wiki/MAP_Format_(Build)
Build.Models.Map.MAP = class MAP extends Build.Models.Map {

    constructor (bytes) {

        super([]);

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Version = bytes ? reader.int32() : 7;
        this.X = bytes ? reader.int32() : 0;
        this.Y = bytes ? reader.int32() : 0;
        this.Z = bytes ? reader.int32() : 0;
        this.A = bytes ? reader.int16() : 0;
        this.S = bytes ? reader.int16() : 0;

        this.Sectors = new Array(bytes ? reader.uint16() : 0);

        for (let i = 0; i < this.Sectors.length; i++) {
            this.Sectors[i] = {
                wallptr: reader.int16(),
                wallnum: reader.int16(),
                ceilingz: reader.int32(),
                floorz: reader.int32(),
                ceilingstat: reader.int16(),
                floorstat: reader.int16(),
                ceilingpicnum: reader.int16(),
                ceilingheinum: reader.int16(),
                ceilingshade: reader.int8(),
                ceilingpal: reader.uint8(),
                ceilingxpanning: reader.uint8(),
                ceilingypanning: reader.uint8(),
                floorpicnum: reader.int16(),
                floorheinum: reader.int16(),
                floorshade: reader.int8(),
                floorpal: reader.uint8(),
                floorxpanning: reader.uint8(),
                floorypanning: reader.uint8(),
                visibility: reader.uint8(),
                filler: reader.uint8(),
                lotag: reader.int16(),
                hitag: reader.int16(),
                extra: reader.int16()
            };
        }

        this.Walls = new Array(bytes ? reader.uint16() : 0);

        for (let i = 0; i < this.Walls.length; i++) {
            this.Walls[i] = {
                x: reader.int32(),
                y: reader.int32(),
                point2: reader.int16(),
                nextwall: reader.int16(),
                nextsector: reader.int16(),
                cstat: reader.int16(),
                picnum: reader.int16(),
                overpicnum: reader.int16(),
                shade: reader.int8(),
                pal: reader.uint8(),
                xrepeat: reader.uint8(),
                yrepeat: reader.uint8(),
                xpanning: reader.uint8(),
                ypanning: reader.uint8(),
                lotag: reader.int16(),
                hitag: reader.int16(),
                extra: reader.int16()
            };
        }

        this.Sprites = new Array(bytes ? reader.uint16() : 0);

        for (let i = 0; i < this.Sprites.length; i++) {
            this.Sprites[i] = {
                x: reader.int32(),
                y: reader.int32(),
                z: reader.int32(),
                cstat: reader.int16(),
                picnum: reader.int16(),
                shade: reader.int8(),
                pal: reader.uint8(),
                clipdist: reader.uint8(),
                filler: reader.uint8(),
                xrepeat: reader.uint8(),
                yrepeat: reader.uint8(),
                xoffset: reader.int8(),
                yoffset: reader.int8(),
                sectnum: reader.int16(),
                statnum: reader.int16(),
                ang: reader.int16(),
                owner: reader.int16(),
                xvel: reader.int16(),
                yvel: reader.int16(),
                zvel: reader.int16(),
                lotag: reader.int16(),
                hitag: reader.int16(),
                extra: reader.int16()
            };
        }

    }

    Serialize () {

        const writer = new Build.Scripts.ByteWriter();

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

// reference: https://moddingwiki.shikadi.net/wiki/Duke_Nukem_3D_Palette_Format
Build.Models.Palette.DAT = class DAT extends Build.Models.Palette {

    constructor(bytes) {

        super();

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Colors = new Array(256).fill({ r: 0, g: 0, b: 0 });

        if (bytes) {
            for (let i = 0; i < this.Colors.length; i++) {
                this.Colors[i] = {
                    // scale from 0...64 to 0...256 (DOS limitation)
                    r: reader.uint8() << 2,
                    g: reader.uint8() << 2,
                    b: reader.uint8() << 2
                };
            }
        }

        this.Shades = new Array(bytes ? reader.uint16() : 0).fill(new Array(256).fill(0));

        for (let i = 0; i < this.Shades.length; i++) {
            this.Shades[i] = new Array(256).fill(0).map(() => reader.uint8());
        }
        
        this.Translucency = new Array(256).fill(new Array(256).fill(0));

        if (bytes) {
            for (let i = 0; i < this.Translucency.length; i++) {
                this.Translucency[i] = new Array(256).fill(0).map(() => reader.uint8());
            }
        }

        // if there is extra data at the end, it's gargabe from dn3d pallete.dat
        if (bytes && reader.index < bytes.length && bytes.length - reader.index >= 32 * 256) {
            this.Garbage = new Array(32).fill(null).map(() => new Array(256).fill(0).map(() => reader.uint8()));
        }

    }

    Serialize() {

        const writer = new Build.Scripts.ByteWriter();

        for (const color of this.Colors) {
            // scale from 0...256 to 0...64 (DOS limitation)
            writer.int8(color.r >> 2);
            writer.int8(color.g >> 2);
            writer.int8(color.b >> 2);
        }

        writer.int16(this.Shades.length);

        for (const shade of this.Shades) {
            for (const value of shade) {
                writer.int8(value);
            }
        }

        for (const translucency of this.Translucency) {
            for (const value of translucency) {
                writer.int8(value);
            }
        }

        // write garbage back if it is there
        if (this.Garbage) {
            for (const garbage of this.Garbage) {
                for (const value of garbage) {
                    writer.int8(value);
                }
            }
        }

        return writer.bytes;

    }

}

// reference: https://moddingwiki.shikadi.net/wiki/GRP_Format
Build.Models.Storage.GRP = class GRP extends Build.Models.Storage {

    constructor(bytes) {
        super([]);
        const reader = new Build.Scripts.ByteReader(bytes);
        this.Signature = bytes ? reader.string(12) : "KenSilverman";
        this.Files = new Array(bytes ? reader.uint32() : 0);
        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i] = {
                name: reader.string(12),
                size: reader.uint32(),
                bytes: null
            };
        }
        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i].bytes = reader.read(this.Files[i].size);
        }
    }

    AddFile(name, bytes) {
        this.Files.push({
            name: name,
            size: bytes.length,
            bytes: bytes
        });
    }

    Serialize() {
        const writer = new Build.Scripts.ByteWriter();
        writer.string(this.Signature, 12);
        writer.int32(this.Files.length);        
        for (let i = 0; i < this.Files.length; i++) {
            writer.string(this.Files[i].name, 12);
            writer.int32(this.Files[i].bytes.length);            
        }
        for (let i = 0; i < this.Files.length; i++) {            
            writer.write(this.Files[i].bytes);
        }
        return writer.bytes;
    }

}

Build.Models.Storage.PK3 = class PK3 extends Build.Models.Storage {

    // private crc32 dictionary to compressed file bytes
    // this is an optimization both for performance 
    // and to preserve roundtrip equality for unit testing
    #OriginalCompressedBytes = {};

    constructor(bytes) {

        super([]);

        const reader = new Build.Scripts.ByteReader(bytes);    

        this.Files = [];

        console.log("Reading PK3 file, this may take a while...");

        while (bytes && reader.index < bytes.length) {

            // if next 4 bytes aren't a pk3 signature -> exit
            if (String.fromCharCode(...bytes.slice(reader.index, reader.index + 4)) !== "PK\x03\x04") break;

            this.Files.push({
                signature: reader.string(4),
                version: reader.uint16(),
                flags: reader.uint16(),
                compression: reader.uint16(),
                time: reader.uint16(),
                date: reader.uint16(),
                crc32: reader.uint32(),
                compressedSize: reader.uint32(),
                size: reader.uint32(),
                nameLength: reader.uint16(),
                extraLength: reader.uint16(),
                name: "",
                extra: [],
                bytes: []
            });

            const i = this.Files.length - 1;

            this.Files[i].name = reader.string(this.Files[i].nameLength);
            this.Files[i].extra = reader.read(this.Files[i].extraLength);
            this.Files[i].bytes = reader.read(this.Files[i].compressedSize);

            // check if file needs to be uncompressed
            if (this.Files[i].compression === 8) {                
                // backup original compressed bytes for reuse latter if needed
                this.#OriginalCompressedBytes[this.Files[i].crc32] = this.Files[i].bytes;
                // uncompress file bytes
                this.Files[i].bytes = new Uint8Array(Build.Scripts.FFlate.inflateSync(this.Files[i].bytes));
            }

        }

        // keep "garbage" at the end of file (central directory?)
        this.Garbage = bytes ? reader.read(bytes.length - reader.index) : [];

    }

    AddFile(name, bytes) {
        this.Files.push({
            signature: "PK\x03\x04",
            version: 20,
            flags: 0,
            compression: 8, // always compress? sounds good to me...
            time: 0, // will se set in Serialize
            date: 0, // will be set in Serialize
            crc32: 0, // will be set in Serialize
            compressedSize: 0, // will be set in Serialize
            size: bytes.length,
            nameLength: name.length,
            extraLength: 0,
            name: name,
            extra: [],
            bytes: bytes
        });
    }

    Serialize() {

        const writer = new Build.Scripts.ByteWriter();

        console.log("Writing PK3 file, this may take a while...");

        for (const i in this.Files) {

            const file = this.Files[i];

            const crc32 = Build.Scripts.CRC32.Compute(file.bytes);

            let date = 0;
            let time = 0;
            let compressedBytes = file.bytes;            

            if (file.compression === 8) {
                // check if crc is not present in dictionary
                if (!this.#OriginalCompressedBytes[crc32]) {
                    // if crc is not present in original bytes dictionary -> compress file bytes
                    compressedBytes = new Uint8Array(Build.Scripts.FFlate.deflateSync(compressedBytes));
                    // also set new date and time
                    ({ date, time } = Build.Scripts.DateTime.EncodeDosDateTime(new Date()));
                } else {
                    // if crc is present -> just reuse original compressed file bytes
                    compressedBytes = this.#OriginalCompressedBytes[crc32];
                }
            }

            writer.string(file.signature, 4);
            writer.int16(file.version);
            writer.int16(file.flags);
            writer.int16(file.compression);
            writer.int16(file.time);
            writer.int16(file.date);
            writer.int32(crc32);
            writer.int32(compressedBytes.length);
            writer.int32(file.bytes.length);
            writer.int16(file.name.length);
            writer.int16(file.extra.length);
            writer.string(file.name, file.name.length);
            writer.write(file.extra);
            writer.write(compressedBytes);

        }

        // write back "garbage" at the end (central directory?)
        writer.write(this.Garbage);

        return writer.bytes;

    }

}

// reference: https://moddingwiki.shikadi.net/wiki/RFF_Format
Build.Models.Storage.RFF = class RFF extends Build.Models.Storage {

    constructor(bytes) {

        super([]);    

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Signature = bytes ? reader.string(4) : "RFF\x1a";
        this.Version = bytes ? reader.uint16() : 0x0300;
        this.Padding1 = bytes ? reader.read(2) : new Array(2).fill(0);
        this.FileHeadersOffset = bytes ? reader.uint32() : 0;
        this.Files = new Array(bytes ? reader.uint32() : 0);
        this.Padding2 = bytes ? reader.read(16) : new Array(16).fill(0);

        let fileHeadersBytes = reader.bytes.slice(this.FileHeadersOffset, this.FileHeadersOffset + this.Files.length * 48);

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
            // just for better readability -> this will be undone when writing back
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

    AddFile(name, bytes) {
        this.Files.push({
            cache: new Array(16).fill(0), // unused
            offset: 0, // will set in Serialize
            size: bytes.length,
            packedSize: 0, // unused
            time: Build.Scripts.DateTime.ToUnixDateTime(new Date()),
            flags: 0, // lets not encrypt the file because, why should it be?
            type: null, // will be set in Serialize
            name: name,
            id: 0, // unused (it seems)
            bytes: bytes
        });
    }

    Serialize() {

        // we need to reset the file header offset to start counting again
        this.FileHeadersOffset = 32;

        // copy files to we dont modify the storage instance fields
        const files = this.Files.map(f => ({...f}));

        // process file contents before performing any calculations
        for (let i = 0; i < files.length; i++) {
            // check if file needs to be encrypted
            if (files[i].flags & 16) {
                // encrypt file bytes
                files[i].bytes = Build.Scripts.ENCXOR.Compute(files[i].bytes, { 
                    seed: 0, 
                    offset: 0, 
                    limit: 256, 
                    shift: 1 // used by my custom hybrid implementation
                });
            }
            files[i].size = files[i].bytes.length;
            files[i].offset = this.FileHeadersOffset;
            this.FileHeadersOffset += files[i].size;
        }

        const writer = new Build.Scripts.ByteWriter();

        writer.string(this.Signature, 4);
        writer.int16(this.Version);
        writer.write(this.Padding1);
        writer.int32(this.FileHeadersOffset);
        writer.int32(this.Files.length);
        writer.write(this.Padding2);        
        
        // write file contents
        for (let i = 0; i < files.length; i++) {
            writer.write(files[i].bytes);
        }

        const fileHeaderWriter = new Build.Scripts.ByteWriter();

        // write files headers
        for (let i = 0; i < files.length; i++) {
            fileHeaderWriter.write(files[i].cache || new Uint8Array(16).fill(0));
            fileHeaderWriter.int32(files[i].offset);
            fileHeaderWriter.int32(files[i].size);
            fileHeaderWriter.int32(files[i].packedSize);
            fileHeaderWriter.int32(files[i].time || Build.Scripts.DateTime.ToUnixDateTime(new Date()));
            fileHeaderWriter.int8(files[i].flags);
            fileHeaderWriter.string(files[i].name.split(".")[1], 3);
            fileHeaderWriter.string(files[i].name.split(".")[0], 8);
            fileHeaderWriter.int32(files[i].id || 0);
        }

        // 0x0200 - shareware 0.99 (CD version) - FAT is not encrypted
        // 0x0300 - registered 1.00 - FAT is encrypted
        // 0x0301 - patches for registered and later shareware releases - FAT is encrypted
        if (this.Version > 0x0200) {
            writer.write(Build.Scripts.ENCXOR.Compute(fileHeaderWriter.bytes, {
                seed: this.FileHeadersOffset & 0xFF,
                offset: 0,
                limit: 0,
                shift: 1 // used by my custom hybrid implementation
            }));
        }

        return writer.bytes;

    }

}

// reference: http://dukertcm.com/knowledge-base/downloads-rtcm/general-tools/unpackssi.zip
Build.Models.Storage.SSI = class SSI extends Build.Models.Storage {

    constructor(bytes) {

        super([]);
        
        const reader = new Build.Scripts.ByteReader(bytes);

        this.Version = bytes ? reader.uint32() : 1;
        this.Files = new Array(bytes ? reader.uint32() : 0);

        this.Title = {
            length: bytes ? reader.uint8() : 0,
            text: bytes ? reader.string(32) : ""
        };

        if (this.Version === 2) {
            this.RunFile = {
                length: bytes ? reader.uint8() : 0,
                text: bytes ? reader.string(12) : ""
            };
        }

        this.Description = [];

        for (let i = 0; i < 3; i++) {
            this.Description[i] = {
                length: bytes ? reader.uint8() : 0,
                text: bytes ? reader.string(70) : ""
            };
        }

        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i] = {
                length: reader.uint8(),
                name: reader.string(12),
                size: reader.uint32(),
                fill: reader.read(34+1+69),
                bytes: null
            };
        }

        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i].bytes = reader.read(this.Files[i].size);
        }
        
    }

    AddFile(name, bytes) {
        this.Files.push({
            length: name.length,
            name: name,
            size: bytes.length,
            fill: new Array(34+1+69).fill(0),
            bytes: bytes
        });
    }

    Serialize() {

        const writer = new Build.Scripts.ByteWriter();

        writer.int32(this.Version);
        writer.int32(this.Files.length);
        writer.int8(this.Title.length);
        writer.string(this.Title.text, 32);

        if (this.Version === 2) {
            writer.int8(this.RunFile.length);
            writer.string(this.RunFile.text, 12);
        }

        for (let i = 0; i < 3; i++) {
            writer.int8(this.Description[i].length);
            writer.string(this.Description[i].text, 70);
        }

        for (let i = 0; i < this.Files.length; i++) {
            writer.int8(this.Files[i].length);
            writer.string(this.Files[i].name, 12);
            writer.int32(this.Files[i].bytes.length);
            writer.write(this.Files[i].fill || new Array(34+1+69).fill(0));
        }

        for (let i = 0; i < this.Files.length; i++) {            
            writer.write(this.Files[i].bytes);
        }

        return writer.bytes;

    }

}

// reference: https://moddingwiki.shikadi.net/wiki/WAD_Format
Build.Models.Storage.WAD = class WAD extends Build.Models.Storage {

    constructor (bytes) {

        super([]);

        const reader = new Build.Scripts.ByteReader(bytes);

        this.Signature = bytes ? reader.string(4) : "";
        this.Files = new Array(bytes ? reader.int32() : 0);
        this.Offset = bytes ? reader.int32() : 0;

        const headerReader = new Build.Scripts.ByteReader(bytes.slice(this.Offset, this.Offset + this.Files.length * 16));

        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i] = {
                offset: headerReader.int32(),
                size: headerReader.int32(),
                name: headerReader.string(8),
                bytes: []
            };
        }

        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i].bytes = bytes.slice(
                this.Files[i].offset, 
                this.Files[i].offset + this.Files[i].size
            );
        }

        // check if this WAD is a RTS so we can convert it to the correct model
        if (bytes && this.Signature === "IWAD" && this.Files[0].name === "REMOSTRT" && this.Files[this.Files.length-1].name === "REMOSTOP") {
            return new Build.Models.Storage.WAD.RTS(this);
        }

    }

    Serialize () {
        
        const writer = new Build.Scripts.ByteWriter();

        writer.string(this.Signature, 4);
        writer.int32(this.Files.length);
        writer.int32(this.Files.reduce((offset, file) => offset + file.bytes.length, 12));

        for (let i = 0; i < this.Files.length; i++) {
            writer.write(this.Files[i].bytes);
        }

        for (let i = 0; i < this.Files.length; i++) {
            writer.int32(this.Files[i].offset);
            writer.int32(this.Files[i].size);
            writer.string(this.Files[i].name, 8);            
        }

        return writer.bytes;

    }

}

// reference: https://moddingwiki.shikadi.net/wiki/RTS_Format
Build.Models.Storage.WAD.RTS = class RTS extends Build.Models.Storage.WAD {

    // since RTS are just WAD files, we reuse all WAD logic
    constructor (input) {

        super([]);

        // check if input is a WAD instance
        if (input instanceof Build.Models.Storage.WAD) {
            // just copy properties from WAD instance
            Object.keys(input).forEach(key => this[key] = input[key]);
        } else if (input instanceof Uint8Array) {
            // if input is bytes, parse it as a WAD and then convert to RTS
            return new Build.Models.Storage.WAD(input);
        } else {
            return new Build.Models.Storage.WAD();
        }

    }

    Serialize () {
        return super.Serialize();
    }

}