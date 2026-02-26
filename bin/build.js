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

            // load the scripts, enums and models into th library array
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

        default: {
            module.exports = Build;
            break;
        }

    }

}

Build.Scripts.ByteReader = class ByteReader {

    constructor(bytes) {
        this.bytes = new Uint8Array(bytes);
        this.index = 0;
    }

    shift(n) { return this.bytes[this.index++] << n; }
    int8() { return (this.shift(0) << 24) >> 24; }
    int16() { return this.shift(0) | this.shift(8); }
    int32() { return this.shift(0) | this.shift(8) | this.shift(16) | this.shift(24); }
    uint8() { return this.int8() & 0xFF; }
    uint16() { return this.int16() & 0xFFFF; }
    uint32() { return this.int32() & 0xFFFFFFFF; }

    string(length) { return new Array(length).fill(0).map(() => String.fromCharCode(this.bytes[this.index++])).join("").replace(/\x00/g, ""); }

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
    
    constructor(length) {
        this.bytes = new Uint8Array(length);
        this.index = 0;
    }

    // using .set is incredibly fast and necessary otherwise we would get a stack overflow
    write(bytes) { this.bytes.set(bytes, this.index); this.index += bytes.length; }
    int8(v) { this.write([v & 0xFF]); }
    int16(v) { this.write([v & 0xFF, (v >> 8) & 0xFF]); }
    int32(v) { this.write([v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF]); }
    string(string, length) { this.write([...string.padEnd(length, "\0").slice(0, length)].map(c => c.charCodeAt(0))); }

    // by chatgpt (based on dfread from build engine code itself)
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

Build.Scripts.LZW = class LZW {

    static size = 16384;

    static compress(data) {

        const uncompleng = data.length;

        const lzwbuf1 = new Uint8Array(65536);
        const lzwbuf2 = new Int32Array(65536);
        const lzwbuf3 = new Int32Array(65536);

        const outbuf = new Uint8Array(uncompleng + 4096);

        // init
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

        function writeCode(code) {
            const bytePos = bitcnt >> 3;
            const shift = bitcnt & 7;

            let v =
                outbuf[bytePos] |
                (outbuf[bytePos + 1] << 8) |
                (outbuf[bytePos + 2] << 16) |
                (outbuf[bytePos + 3] << 24);

            v |= (code << shift);

            outbuf[bytePos]     = v & 0xFF;
            outbuf[bytePos + 1] = (v >>> 8) & 0xFF;
            outbuf[bytePos + 2] = (v >>> 16) & 0xFF;
            outbuf[bytePos + 3] = (v >>> 24) & 0xFF;

            bitcnt += numbits;

            if ((code & ((oneupnumbits >> 1) - 1)) > ((addrcnt - 1) & ((oneupnumbits >> 1) - 1)))
                bitcnt--;
        }

        while (bytecnt1 < uncompleng && bitcnt < (uncompleng << 3)) {
            let addr = data[bytecnt1];

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

        writeCode(data[uncompleng - 1]);

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
        const strtot      = data[2] | (data[3] << 8);

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

        let out = new Uint8Array(uncompleng);
        let outbytecnt = 0;

        let currstr = 256;
        let bitcnt = 32;

        let numbits = 8;
        let oneupnumbits = 1 << 8;

        function readCode() {
            const bytePos = bitcnt >> 3;
            const bitOff  = bitcnt & 7;

            const v =
                data[bytePos] |
                (data[bytePos + 1] << 8) |
                (data[bytePos + 2] << 16) |
                (data[bytePos + 3] << 24);

            let dat = (v >>> bitOff) & (oneupnumbits - 1);

            bitcnt += numbits;

            if ((dat & ((oneupnumbits >> 1) - 1)) > ((currstr - 1) & ((oneupnumbits >> 1) - 1))) {
                dat &= ((oneupnumbits >> 1) - 1);
                bitcnt--;
            }

            return dat;
        }

        while (currstr < strtot) {
            let dat = readCode();

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

{

/** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */(function() {var n=void 0,u=!0,aa=this;function ba(e,d){var c=e.split("."),f=aa;!(c[0]in f)&&f.execScript&&f.execScript("var "+c[0]);for(var a;c.length&&(a=c.shift());)!c.length&&d!==n?f[a]=d:f=f[a]?f[a]:f[a]={}};var C="undefined"!==typeof Uint8Array&&"undefined"!==typeof Uint16Array&&"undefined"!==typeof Uint32Array&&"undefined"!==typeof DataView;function K(e,d){this.index="number"===typeof d?d:0;this.d=0;this.buffer=e instanceof(C?Uint8Array:Array)?e:new (C?Uint8Array:Array)(32768);if(2*this.buffer.length<=this.index)throw Error("invalid index");this.buffer.length<=this.index&&ca(this)}function ca(e){var d=e.buffer,c,f=d.length,a=new (C?Uint8Array:Array)(f<<1);if(C)a.set(d);else for(c=0;c<f;++c)a[c]=d[c];return e.buffer=a}
K.prototype.a=function(e,d,c){var f=this.buffer,a=this.index,b=this.d,k=f[a],m;c&&1<d&&(e=8<d?(L[e&255]<<24|L[e>>>8&255]<<16|L[e>>>16&255]<<8|L[e>>>24&255])>>32-d:L[e]>>8-d);if(8>d+b)k=k<<d|e,b+=d;else for(m=0;m<d;++m)k=k<<1|e>>d-m-1&1,8===++b&&(b=0,f[a++]=L[k],k=0,a===f.length&&(f=ca(this)));f[a]=k;this.buffer=f;this.d=b;this.index=a};K.prototype.finish=function(){var e=this.buffer,d=this.index,c;0<this.d&&(e[d]<<=8-this.d,e[d]=L[e[d]],d++);C?c=e.subarray(0,d):(e.length=d,c=e);return c};
var ga=new (C?Uint8Array:Array)(256),M;for(M=0;256>M;++M){for(var R=M,S=R,ha=7,R=R>>>1;R;R>>>=1)S<<=1,S|=R&1,--ha;ga[M]=(S<<ha&255)>>>0}var L=ga;function ja(e){this.buffer=new (C?Uint16Array:Array)(2*e);this.length=0}ja.prototype.getParent=function(e){return 2*((e-2)/4|0)};ja.prototype.push=function(e,d){var c,f,a=this.buffer,b;c=this.length;a[this.length++]=d;for(a[this.length++]=e;0<c;)if(f=this.getParent(c),a[c]>a[f])b=a[c],a[c]=a[f],a[f]=b,b=a[c+1],a[c+1]=a[f+1],a[f+1]=b,c=f;else break;return this.length};
ja.prototype.pop=function(){var e,d,c=this.buffer,f,a,b;d=c[0];e=c[1];this.length-=2;c[0]=c[this.length];c[1]=c[this.length+1];for(b=0;;){a=2*b+2;if(a>=this.length)break;a+2<this.length&&c[a+2]>c[a]&&(a+=2);if(c[a]>c[b])f=c[b],c[b]=c[a],c[a]=f,f=c[b+1],c[b+1]=c[a+1],c[a+1]=f;else break;b=a}return{index:e,value:d,length:this.length}};function ka(e,d){this.e=ma;this.f=0;this.input=C&&e instanceof Array?new Uint8Array(e):e;this.c=0;d&&(d.lazy&&(this.f=d.lazy),"number"===typeof d.compressionType&&(this.e=d.compressionType),d.outputBuffer&&(this.b=C&&d.outputBuffer instanceof Array?new Uint8Array(d.outputBuffer):d.outputBuffer),"number"===typeof d.outputIndex&&(this.c=d.outputIndex));this.b||(this.b=new (C?Uint8Array:Array)(32768))}var ma=2,T=[],U;
for(U=0;288>U;U++)switch(u){case 143>=U:T.push([U+48,8]);break;case 255>=U:T.push([U-144+400,9]);break;case 279>=U:T.push([U-256+0,7]);break;case 287>=U:T.push([U-280+192,8]);break;default:throw"invalid literal: "+U;}
ka.prototype.h=function(){var e,d,c,f,a=this.input;switch(this.e){case 0:c=0;for(f=a.length;c<f;){d=C?a.subarray(c,c+65535):a.slice(c,c+65535);c+=d.length;var b=d,k=c===f,m=n,g=n,p=n,v=n,x=n,l=this.b,h=this.c;if(C){for(l=new Uint8Array(this.b.buffer);l.length<=h+b.length+5;)l=new Uint8Array(l.length<<1);l.set(this.b)}m=k?1:0;l[h++]=m|0;g=b.length;p=~g+65536&65535;l[h++]=g&255;l[h++]=g>>>8&255;l[h++]=p&255;l[h++]=p>>>8&255;if(C)l.set(b,h),h+=b.length,l=l.subarray(0,h);else{v=0;for(x=b.length;v<x;++v)l[h++]=
b[v];l.length=h}this.c=h;this.b=l}break;case 1:var q=new K(C?new Uint8Array(this.b.buffer):this.b,this.c);q.a(1,1,u);q.a(1,2,u);var t=na(this,a),w,da,z;w=0;for(da=t.length;w<da;w++)if(z=t[w],K.prototype.a.apply(q,T[z]),256<z)q.a(t[++w],t[++w],u),q.a(t[++w],5),q.a(t[++w],t[++w],u);else if(256===z)break;this.b=q.finish();this.c=this.b.length;break;case ma:var B=new K(C?new Uint8Array(this.b.buffer):this.b,this.c),ra,J,N,O,P,Ia=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],W,sa,X,ta,ea,ia=Array(19),
ua,Q,fa,y,va;ra=ma;B.a(1,1,u);B.a(ra,2,u);J=na(this,a);W=oa(this.j,15);sa=pa(W);X=oa(this.i,7);ta=pa(X);for(N=286;257<N&&0===W[N-1];N--);for(O=30;1<O&&0===X[O-1];O--);var wa=N,xa=O,F=new (C?Uint32Array:Array)(wa+xa),r,G,s,Y,E=new (C?Uint32Array:Array)(316),D,A,H=new (C?Uint8Array:Array)(19);for(r=G=0;r<wa;r++)F[G++]=W[r];for(r=0;r<xa;r++)F[G++]=X[r];if(!C){r=0;for(Y=H.length;r<Y;++r)H[r]=0}r=D=0;for(Y=F.length;r<Y;r+=G){for(G=1;r+G<Y&&F[r+G]===F[r];++G);s=G;if(0===F[r])if(3>s)for(;0<s--;)E[D++]=0,
H[0]++;else for(;0<s;)A=138>s?s:138,A>s-3&&A<s&&(A=s-3),10>=A?(E[D++]=17,E[D++]=A-3,H[17]++):(E[D++]=18,E[D++]=A-11,H[18]++),s-=A;else if(E[D++]=F[r],H[F[r]]++,s--,3>s)for(;0<s--;)E[D++]=F[r],H[F[r]]++;else for(;0<s;)A=6>s?s:6,A>s-3&&A<s&&(A=s-3),E[D++]=16,E[D++]=A-3,H[16]++,s-=A}e=C?E.subarray(0,D):E.slice(0,D);ea=oa(H,7);for(y=0;19>y;y++)ia[y]=ea[Ia[y]];for(P=19;4<P&&0===ia[P-1];P--);ua=pa(ea);B.a(N-257,5,u);B.a(O-1,5,u);B.a(P-4,4,u);for(y=0;y<P;y++)B.a(ia[y],3,u);y=0;for(va=e.length;y<va;y++)if(Q=
e[y],B.a(ua[Q],ea[Q],u),16<=Q){y++;switch(Q){case 16:fa=2;break;case 17:fa=3;break;case 18:fa=7;break;default:throw"invalid code: "+Q;}B.a(e[y],fa,u)}var ya=[sa,W],za=[ta,X],I,Aa,Z,la,Ba,Ca,Da,Ea;Ba=ya[0];Ca=ya[1];Da=za[0];Ea=za[1];I=0;for(Aa=J.length;I<Aa;++I)if(Z=J[I],B.a(Ba[Z],Ca[Z],u),256<Z)B.a(J[++I],J[++I],u),la=J[++I],B.a(Da[la],Ea[la],u),B.a(J[++I],J[++I],u);else if(256===Z)break;this.b=B.finish();this.c=this.b.length;break;default:throw"invalid compression type";}return this.b};
function qa(e,d){this.length=e;this.g=d}
var Fa=function(){function e(a){switch(u){case 3===a:return[257,a-3,0];case 4===a:return[258,a-4,0];case 5===a:return[259,a-5,0];case 6===a:return[260,a-6,0];case 7===a:return[261,a-7,0];case 8===a:return[262,a-8,0];case 9===a:return[263,a-9,0];case 10===a:return[264,a-10,0];case 12>=a:return[265,a-11,1];case 14>=a:return[266,a-13,1];case 16>=a:return[267,a-15,1];case 18>=a:return[268,a-17,1];case 22>=a:return[269,a-19,2];case 26>=a:return[270,a-23,2];case 30>=a:return[271,a-27,2];case 34>=a:return[272,
a-31,2];case 42>=a:return[273,a-35,3];case 50>=a:return[274,a-43,3];case 58>=a:return[275,a-51,3];case 66>=a:return[276,a-59,3];case 82>=a:return[277,a-67,4];case 98>=a:return[278,a-83,4];case 114>=a:return[279,a-99,4];case 130>=a:return[280,a-115,4];case 162>=a:return[281,a-131,5];case 194>=a:return[282,a-163,5];case 226>=a:return[283,a-195,5];case 257>=a:return[284,a-227,5];case 258===a:return[285,a-258,0];default:throw"invalid length: "+a;}}var d=[],c,f;for(c=3;258>=c;c++)f=e(c),d[c]=f[2]<<24|
f[1]<<16|f[0];return d}(),Ga=C?new Uint32Array(Fa):Fa;
function na(e,d){function c(a,c){var b=a.g,d=[],f=0,e;e=Ga[a.length];d[f++]=e&65535;d[f++]=e>>16&255;d[f++]=e>>24;var g;switch(u){case 1===b:g=[0,b-1,0];break;case 2===b:g=[1,b-2,0];break;case 3===b:g=[2,b-3,0];break;case 4===b:g=[3,b-4,0];break;case 6>=b:g=[4,b-5,1];break;case 8>=b:g=[5,b-7,1];break;case 12>=b:g=[6,b-9,2];break;case 16>=b:g=[7,b-13,2];break;case 24>=b:g=[8,b-17,3];break;case 32>=b:g=[9,b-25,3];break;case 48>=b:g=[10,b-33,4];break;case 64>=b:g=[11,b-49,4];break;case 96>=b:g=[12,b-
65,5];break;case 128>=b:g=[13,b-97,5];break;case 192>=b:g=[14,b-129,6];break;case 256>=b:g=[15,b-193,6];break;case 384>=b:g=[16,b-257,7];break;case 512>=b:g=[17,b-385,7];break;case 768>=b:g=[18,b-513,8];break;case 1024>=b:g=[19,b-769,8];break;case 1536>=b:g=[20,b-1025,9];break;case 2048>=b:g=[21,b-1537,9];break;case 3072>=b:g=[22,b-2049,10];break;case 4096>=b:g=[23,b-3073,10];break;case 6144>=b:g=[24,b-4097,11];break;case 8192>=b:g=[25,b-6145,11];break;case 12288>=b:g=[26,b-8193,12];break;case 16384>=
b:g=[27,b-12289,12];break;case 24576>=b:g=[28,b-16385,13];break;case 32768>=b:g=[29,b-24577,13];break;default:throw"invalid distance";}e=g;d[f++]=e[0];d[f++]=e[1];d[f++]=e[2];var k,m;k=0;for(m=d.length;k<m;++k)l[h++]=d[k];t[d[0]]++;w[d[3]]++;q=a.length+c-1;x=null}var f,a,b,k,m,g={},p,v,x,l=C?new Uint16Array(2*d.length):[],h=0,q=0,t=new (C?Uint32Array:Array)(286),w=new (C?Uint32Array:Array)(30),da=e.f,z;if(!C){for(b=0;285>=b;)t[b++]=0;for(b=0;29>=b;)w[b++]=0}t[256]=1;f=0;for(a=d.length;f<a;++f){b=
m=0;for(k=3;b<k&&f+b!==a;++b)m=m<<8|d[f+b];g[m]===n&&(g[m]=[]);p=g[m];if(!(0<q--)){for(;0<p.length&&32768<f-p[0];)p.shift();if(f+3>=a){x&&c(x,-1);b=0;for(k=a-f;b<k;++b)z=d[f+b],l[h++]=z,++t[z];break}0<p.length?(v=Ha(d,f,p),x?x.length<v.length?(z=d[f-1],l[h++]=z,++t[z],c(v,0)):c(x,-1):v.length<da?x=v:c(v,0)):x?c(x,-1):(z=d[f],l[h++]=z,++t[z])}p.push(f)}l[h++]=256;t[256]++;e.j=t;e.i=w;return C?l.subarray(0,h):l}
function Ha(e,d,c){var f,a,b=0,k,m,g,p,v=e.length;m=0;p=c.length;a:for(;m<p;m++){f=c[p-m-1];k=3;if(3<b){for(g=b;3<g;g--)if(e[f+g-1]!==e[d+g-1])continue a;k=b}for(;258>k&&d+k<v&&e[f+k]===e[d+k];)++k;k>b&&(a=f,b=k);if(258===k)break}return new qa(b,d-a)}
function oa(e,d){var c=e.length,f=new ja(572),a=new (C?Uint8Array:Array)(c),b,k,m,g,p;if(!C)for(g=0;g<c;g++)a[g]=0;for(g=0;g<c;++g)0<e[g]&&f.push(g,e[g]);b=Array(f.length/2);k=new (C?Uint32Array:Array)(f.length/2);if(1===b.length)return a[f.pop().index]=1,a;g=0;for(p=f.length/2;g<p;++g)b[g]=f.pop(),k[g]=b[g].value;m=Ja(k,k.length,d);g=0;for(p=b.length;g<p;++g)a[b[g].index]=m[g];return a}
function Ja(e,d,c){function f(a){var b=g[a][p[a]];b===d?(f(a+1),f(a+1)):--k[b];++p[a]}var a=new (C?Uint16Array:Array)(c),b=new (C?Uint8Array:Array)(c),k=new (C?Uint8Array:Array)(d),m=Array(c),g=Array(c),p=Array(c),v=(1<<c)-d,x=1<<c-1,l,h,q,t,w;a[c-1]=d;for(h=0;h<c;++h)v<x?b[h]=0:(b[h]=1,v-=x),v<<=1,a[c-2-h]=(a[c-1-h]/2|0)+d;a[0]=b[0];m[0]=Array(a[0]);g[0]=Array(a[0]);for(h=1;h<c;++h)a[h]>2*a[h-1]+b[h]&&(a[h]=2*a[h-1]+b[h]),m[h]=Array(a[h]),g[h]=Array(a[h]);for(l=0;l<d;++l)k[l]=c;for(q=0;q<a[c-1];++q)m[c-
1][q]=e[q],g[c-1][q]=q;for(l=0;l<c;++l)p[l]=0;1===b[c-1]&&(--k[0],++p[c-1]);for(h=c-2;0<=h;--h){t=l=0;w=p[h+1];for(q=0;q<a[h];q++)t=m[h+1][w]+m[h+1][w+1],t>e[l]?(m[h][q]=t,g[h][q]=d,w+=2):(m[h][q]=e[l],g[h][q]=l,++l);p[h]=0;1===b[h]&&f(h)}return k}
function pa(e){var d=new (C?Uint16Array:Array)(e.length),c=[],f=[],a=0,b,k,m,g;b=0;for(k=e.length;b<k;b++)c[e[b]]=(c[e[b]]|0)+1;b=1;for(k=16;b<=k;b++)f[b]=a,a+=c[b]|0,a<<=1;b=0;for(k=e.length;b<k;b++){a=f[e[b]];f[e[b]]+=1;m=d[b]=0;for(g=e[b];m<g;m++)d[b]=d[b]<<1|a&1,a>>>=1}return d};ba("Zlib.RawDeflate",ka);ba("Zlib.RawDeflate.prototype.compress",ka.prototype.h);var Ka={NONE:0,FIXED:1,DYNAMIC:ma},V,La,$,Ma;if(Object.keys)V=Object.keys(Ka);else for(La in V=[],$=0,Ka)V[$++]=La;$=0;for(Ma=V.length;$<Ma;++$)La=V[$],ba("Zlib.RawDeflate.CompressionType."+La,Ka[La]);}).call(this);

/** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */(function() {var k=void 0,aa=this;function r(c,d){var a=c.split("."),b=aa;!(a[0]in b)&&b.execScript&&b.execScript("var "+a[0]);for(var e;a.length&&(e=a.shift());)!a.length&&d!==k?b[e]=d:b=b[e]?b[e]:b[e]={}};var t="undefined"!==typeof Uint8Array&&"undefined"!==typeof Uint16Array&&"undefined"!==typeof Uint32Array&&"undefined"!==typeof DataView;function u(c){var d=c.length,a=0,b=Number.POSITIVE_INFINITY,e,f,g,h,l,n,m,p,s,x;for(p=0;p<d;++p)c[p]>a&&(a=c[p]),c[p]<b&&(b=c[p]);e=1<<a;f=new (t?Uint32Array:Array)(e);g=1;h=0;for(l=2;g<=a;){for(p=0;p<d;++p)if(c[p]===g){n=0;m=h;for(s=0;s<g;++s)n=n<<1|m&1,m>>=1;x=g<<16|p;for(s=n;s<e;s+=l)f[s]=x;++h}++g;h<<=1;l<<=1}return[f,a,b]};function w(c,d){this.g=[];this.h=32768;this.c=this.f=this.d=this.k=0;this.input=t?new Uint8Array(c):c;this.l=!1;this.i=y;this.p=!1;if(d||!(d={}))d.index&&(this.d=d.index),d.bufferSize&&(this.h=d.bufferSize),d.bufferType&&(this.i=d.bufferType),d.resize&&(this.p=d.resize);switch(this.i){case A:this.a=32768;this.b=new (t?Uint8Array:Array)(32768+this.h+258);break;case y:this.a=0;this.b=new (t?Uint8Array:Array)(this.h);this.e=this.u;this.m=this.r;this.j=this.s;break;default:throw Error("invalid inflate mode");
}}var A=0,y=1;
w.prototype.t=function(){for(;!this.l;){var c=B(this,3);c&1&&(this.l=!0);c>>>=1;switch(c){case 0:var d=this.input,a=this.d,b=this.b,e=this.a,f=d.length,g=k,h=k,l=b.length,n=k;this.c=this.f=0;if(a+1>=f)throw Error("invalid uncompressed block header: LEN");g=d[a++]|d[a++]<<8;if(a+1>=f)throw Error("invalid uncompressed block header: NLEN");h=d[a++]|d[a++]<<8;if(g===~h)throw Error("invalid uncompressed block header: length verify");if(a+g>d.length)throw Error("input buffer is broken");switch(this.i){case A:for(;e+g>
b.length;){n=l-e;g-=n;if(t)b.set(d.subarray(a,a+n),e),e+=n,a+=n;else for(;n--;)b[e++]=d[a++];this.a=e;b=this.e();e=this.a}break;case y:for(;e+g>b.length;)b=this.e({o:2});break;default:throw Error("invalid inflate mode");}if(t)b.set(d.subarray(a,a+g),e),e+=g,a+=g;else for(;g--;)b[e++]=d[a++];this.d=a;this.a=e;this.b=b;break;case 1:this.j(ba,ca);break;case 2:for(var m=B(this,5)+257,p=B(this,5)+1,s=B(this,4)+4,x=new (t?Uint8Array:Array)(C.length),Q=k,R=k,S=k,v=k,M=k,F=k,z=k,q=k,T=k,q=0;q<s;++q)x[C[q]]=
B(this,3);if(!t){q=s;for(s=x.length;q<s;++q)x[C[q]]=0}Q=u(x);v=new (t?Uint8Array:Array)(m+p);q=0;for(T=m+p;q<T;)switch(M=D(this,Q),M){case 16:for(z=3+B(this,2);z--;)v[q++]=F;break;case 17:for(z=3+B(this,3);z--;)v[q++]=0;F=0;break;case 18:for(z=11+B(this,7);z--;)v[q++]=0;F=0;break;default:F=v[q++]=M}R=t?u(v.subarray(0,m)):u(v.slice(0,m));S=t?u(v.subarray(m)):u(v.slice(m));this.j(R,S);break;default:throw Error("unknown BTYPE: "+c);}}return this.m()};
var E=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],C=t?new Uint16Array(E):E,G=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258],H=t?new Uint16Array(G):G,I=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0],J=t?new Uint8Array(I):I,K=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],L=t?new Uint16Array(K):K,N=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,
13],O=t?new Uint8Array(N):N,P=new (t?Uint8Array:Array)(288),U,da;U=0;for(da=P.length;U<da;++U)P[U]=143>=U?8:255>=U?9:279>=U?7:8;var ba=u(P),V=new (t?Uint8Array:Array)(30),W,ea;W=0;for(ea=V.length;W<ea;++W)V[W]=5;var ca=u(V);function B(c,d){for(var a=c.f,b=c.c,e=c.input,f=c.d,g=e.length,h;b<d;){if(f>=g)throw Error("input buffer is broken");a|=e[f++]<<b;b+=8}h=a&(1<<d)-1;c.f=a>>>d;c.c=b-d;c.d=f;return h}
function D(c,d){for(var a=c.f,b=c.c,e=c.input,f=c.d,g=e.length,h=d[0],l=d[1],n,m;b<l&&!(f>=g);)a|=e[f++]<<b,b+=8;n=h[a&(1<<l)-1];m=n>>>16;if(m>b)throw Error("invalid code length: "+m);c.f=a>>m;c.c=b-m;c.d=f;return n&65535}
w.prototype.j=function(c,d){var a=this.b,b=this.a;this.n=c;for(var e=a.length-258,f,g,h,l;256!==(f=D(this,c));)if(256>f)b>=e&&(this.a=b,a=this.e(),b=this.a),a[b++]=f;else{g=f-257;l=H[g];0<J[g]&&(l+=B(this,J[g]));f=D(this,d);h=L[f];0<O[f]&&(h+=B(this,O[f]));b>=e&&(this.a=b,a=this.e(),b=this.a);for(;l--;)a[b]=a[b++-h]}for(;8<=this.c;)this.c-=8,this.d--;this.a=b};
w.prototype.s=function(c,d){var a=this.b,b=this.a;this.n=c;for(var e=a.length,f,g,h,l;256!==(f=D(this,c));)if(256>f)b>=e&&(a=this.e(),e=a.length),a[b++]=f;else{g=f-257;l=H[g];0<J[g]&&(l+=B(this,J[g]));f=D(this,d);h=L[f];0<O[f]&&(h+=B(this,O[f]));b+l>e&&(a=this.e(),e=a.length);for(;l--;)a[b]=a[b++-h]}for(;8<=this.c;)this.c-=8,this.d--;this.a=b};
w.prototype.e=function(){var c=new (t?Uint8Array:Array)(this.a-32768),d=this.a-32768,a,b,e=this.b;if(t)c.set(e.subarray(32768,c.length));else{a=0;for(b=c.length;a<b;++a)c[a]=e[a+32768]}this.g.push(c);this.k+=c.length;if(t)e.set(e.subarray(d,d+32768));else for(a=0;32768>a;++a)e[a]=e[d+a];this.a=32768;return e};
w.prototype.u=function(c){var d,a=this.input.length/this.d+1|0,b,e,f,g=this.input,h=this.b;c&&("number"===typeof c.o&&(a=c.o),"number"===typeof c.q&&(a+=c.q));2>a?(b=(g.length-this.d)/this.n[2],f=258*(b/2)|0,e=f<h.length?h.length+f:h.length<<1):e=h.length*a;t?(d=new Uint8Array(e),d.set(h)):d=h;return this.b=d};
w.prototype.m=function(){var c=0,d=this.b,a=this.g,b,e=new (t?Uint8Array:Array)(this.k+(this.a-32768)),f,g,h,l;if(0===a.length)return t?this.b.subarray(32768,this.a):this.b.slice(32768,this.a);f=0;for(g=a.length;f<g;++f){b=a[f];h=0;for(l=b.length;h<l;++h)e[c++]=b[h]}f=32768;for(g=this.a;f<g;++f)e[c++]=d[f];this.g=[];return this.buffer=e};
w.prototype.r=function(){var c,d=this.a;t?this.p?(c=new Uint8Array(d),c.set(this.b.subarray(0,d))):c=this.b.subarray(0,d):(this.b.length>d&&(this.b.length=d),c=this.b);return this.buffer=c};r("Zlib.RawInflate",w);r("Zlib.RawInflate.prototype.decompress",w.prototype.t);var X={ADAPTIVE:y,BLOCK:A},Y,Z,$,fa;if(Object.keys)Y=Object.keys(X);else for(Z in Y=[],$=0,X)Y[$++]=Z;$=0;for(fa=Y.length;$<fa;++$)Z=Y[$],r("Zlib.RawInflate.BufferType."+Z,X[Z]);}).call(this);

}

;(function() {
	var zlibObj;
	if (typeof globalThis !== 'undefined' && globalThis.Zlib) zlibObj = globalThis.Zlib;
	else if (typeof module !== 'undefined' && module.exports && module.exports.Zlib) zlibObj = module.exports.Zlib;
	else if (typeof this !== 'undefined' && this && this.Zlib) zlibObj = this.Zlib;
	else if (typeof Zlib !== 'undefined') zlibObj = Zlib;

	if (zlibObj) {
		if (typeof globalThis !== 'undefined' && globalThis.Build && globalThis.Build.Scripts) {
			globalThis.Build.Scripts.ZLIB = zlibObj;
		} else if (typeof Build !== 'undefined' && Build && Build.Scripts) {
			Build.Scripts.ZLIB = zlibObj;
		}
	}
})();

Build.Enums.AnimationType = {
    Oscilating: 1,
    Forward: 2,
    Backward: 3
}

Build.Enums.ByteVersion = {
    DOS_1_3               : 1,
    DOS_1_3_1_4_Plutonium : 27,
    DOS_1_4_Plutonium     : 116,
    DOS_1_3_1_5_Engine    : 28,
    DOS_1_5_Atomic        : 117,
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
    HDUKE                 : 252,
    HDUKE_TDM             : 253,
    HDUKE_FORTS           : 254,
    PRODUKE               : 150,
    XDUKE_19_7_OR_HDUKE: (version) => {
        return [
            Build.Enums.ByteVersion.XDUKE_19_7,
            Build.Enums.ByteVersion.HDUKE_1,
            Build.Enums.ByteVersion.HDUKE_2,
            Build.Enums.ByteVersion.HDUKE_3,
            Build.Enums.ByteVersion.HDUKE_4,
            Build.Enums.ByteVersion.HDUKE_5,
            Build.Enums.ByteVersion.HDUKE_6,
            Build.Enums.ByteVersion.HDUKE,
            Build.Enums.ByteVersion.HDUKE_TDM,
            Build.Enums.ByteVersion.HDUKE_FORTS
        ].some(v => v == version);
    }
}

Build.Enums.DemoType = {
    DMO: "DMO"
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

Build.Enums.MapType = {
    DNM: "DNM", // dn, rr, sw, fury
    BLM: "BLM", // blood
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

    // TO-DO => figure out if there is a simpler way to do this (check xduke source code)
    static isolate = (v, s, e) => (v >> s) & (1 << e - s + 1) - 1;
    static attach = (v, s, e, n) => (v & ~(((1 << (e - s + 1)) - 1) << s)) | ((n & ((1 << (e - s + 1)) - 1)) << s);
    
    constructor () {
        this.Version = 1;
        this.Length = 0;
        this.Start = 0;
        this.End = 0;
        this.Tiles = [];
    }

    static Unserialize (bytes) {

        const art = new Art();

        const reader = new Build.Scripts.ByteReader(bytes);

        art.Version = reader.uint32();
        art.Length = reader.uint32();
        art.Start = reader.uint32();
        art.End = reader.uint32();

        const numtiles = art.End - art.Start + 1;

        art.Tiles = new Array(numtiles);

        for (let i = 0; i < numtiles; i++) art.Tiles[i] = {};

        const sizex = [];

        for (let i = 0; i < numtiles; i++) sizex.push(reader.uint16()); 

        const sizey = [];
        
        for (let i = 0; i < numtiles; i++) sizey.push(reader.uint16());
    
        for (let i = 0; i < numtiles; i++) {
            const animation = reader.uint32();
            art.Tiles[i].animation = {
                frames: Art.isolate(animation, 0, 5) & 0x3F, // uint6
                type: Art.isolate(animation, 6, 7), // int2
                offsetX: (Art.isolate(animation, 8, 15) << 24) >> 24, // int8
                offsetY: (Art.isolate(animation, 16, 23) << 24) >> 24, // int8
                speed: Art.isolate(animation, 24, 27) & 0x0F, // uint4
                unused: Art.isolate(animation, 28, 31) // int4
            };
        }

        for (let i = 0; i < numtiles; i++) {
            art.Tiles[i].pixels = [];
            for (let x = 0; x < sizex[i] ; x++) {
                art.Tiles[i].pixels[x] = [];
                for (let y = 0; y < sizey[i]; y++) {
                    art.Tiles[i].pixels[x][y] = reader.uint8();
                }
            }
        }

        return art;

    }

    static Serialize(art) {

        const numtiles = art.End - art.Start + 1

        const writer = new Build.Scripts.ByteWriter(
            4 + // version
            4 + // length (numtiles)
            4 + // start
            4 + // end
            numtiles * 2 + // sizex
            numtiles * 2 + // sizey
            numtiles * 4 + // animations
            art.Tiles.reduce((a, t) => a + (t.pixels && t.pixels.length > 0 ? t.pixels.length * t.pixels[0].length : 0), 0) * 1 // pixels
        );

        writer.int32(art.Version);
        writer.int32(art.End - art.Start + 1);
        writer.int32(art.Start);
        writer.int32(art.End);
        
        for (let i = 0; i < art.Tiles.length; i++) {
            writer.int16(art.Tiles[i].pixels.length);
        }

        for (let i = 0; i < art.Tiles.length; i++) {
            writer.int16(art.Tiles[i].pixels.length > 0 ? art.Tiles[i].pixels[0].length : 0);
        }        

        for (let i = 0; i < art.Tiles.length; i++) {
            let animation = 0;
            animation = Art.attach(animation, 0, 5, art.Tiles[i].animation.frames);
            animation = Art.attach(animation, 6, 7, art.Tiles[i].animation.type);
            animation = Art.attach(animation, 8, 15, art.Tiles[i].animation.offsetX);
            animation = Art.attach(animation, 16, 23, art.Tiles[i].animation.offsetY);
            animation = Art.attach(animation, 24, 27, art.Tiles[i].animation.speed);
            animation = Art.attach(animation, 28, 31, art.Tiles[i].animation.unused);
            writer.int32(animation);
        }

        for (let i = 0; i < art.Tiles.length; i++) {
            for (let x = 0; x < art.Tiles[i].pixels.length ; x++) {
                for (let y = 0; y < art.Tiles[i].pixels[x].length; y++) {
                    writer.int8(art.Tiles[i].pixels[x][y]);
                }
            }
        }

        return writer.bytes;

    };

}

Build.Models.Demo = class Demo {

    // create empty demo object based on type
    constructor(type) {
        if (type) {
            switch (type) {
                case Build.Enums.DemoType.DMO: return new DMO();
            }
        }  
    }

    // transforms demo object into byte array
    static Serialize (demo) {

        // this looks stupid but it makes it easier to use outside when bundled into lib format
        switch (demo.constructor.name) {
            case "DMO": return Build.Models.Demo.DMO.Serialize(demo);
        }

    }

    // transforms byte array into demo object
    static Unserialize (bytes) {        
        return Build.Models.Demo.DMO.Unserialize(bytes);
    }

}

// reference: https://moddingwiki.shikadi.net/wiki/Duke_Nukem_3D_Palette_Format

Build.Models.Map = class Map {

    // create empty map object based on type
    constructor(type) {
        if (type) {
            switch (type) {
                case Build.Enums.MapType.DNM: return new DNM();
                case Build.Enums.MapType.BLM: return new BLM();
            }
        }  
    }

    // transforms map object into byte array
    static Serialize (map) {

        // this looks stupid but it makes it easier to use outside when bundled into lib format
        switch (map.constructor.name) {
            case "DNM": return Build.Models.Map.DNM.Serialize(map);
            case "BLM": return Build.Models.Map.BLM.Serialize(map);
        }

    }

    // transforms byte array into map object
    static Unserialize (bytes) {

        // blm
        if (String.fromCharCode(...bytes.slice(0, 4)) === "BLM\x1a") {
            return Build.Models.Map.BLM.Unserialize(bytes);
        }

        // dnm
        return Build.Models.Map.DNM.Unserialize(bytes);

    }

}

// reference: https://moddingwiki.shikadi.net/wiki/Duke_Nukem_3D_Palette_Format

Build.Models.Storage = class Storage {

    // create empty storage object based on type
    constructor (type) {
        if (type) {
            switch (type) {
                case Build.Enums.StorageType.GRP: return new GRP();
                case Build.Enums.StorageType.PK3: return new PK3();
                case Build.Enums.StorageType.RFF: return new RFF();
                case Build.Enums.StorageType.SSI: return new SSI();
            }
        }        
    }

    // add file to storage (this is the same for all storage types)
    AddFile (name, bytes) {
        this.Files.push({
            name: name,
            size: bytes.length,
            bytes: bytes
        });
    }
       
    // transforms storage object into byte array
    static Serialize (storage) {

        // this looks stupid but it makes it easier to use outside when bundled into lib format
        switch (storage.constructor.name) {
            case "GRP": return Build.Models.Storage.GRP.Serialize(storage);
            case "PK3": return Build.Models.Storage.PK3.Serialize(storage);
            case "RFF": return Build.Models.Storage.RFF.Serialize(storage);
            case "SSI": return Build.Models.Storage.SSI.Serialize(storage);
        }

    }

    // transforms byte array into storage object
    static Unserialize (bytes) {

        // grp / prg
        if (String.fromCharCode(...bytes.slice(0, 12)) === "KenSilverman") {
            return Build.Models.Storage.GRP.Unserialize(bytes);
        }
        
        // pk3
        if (String.fromCharCode(...bytes.slice(0, 4)) === "PK\x03\x04") {
            return Build.Models.Storage.PK3.Unserialize(bytes);
        }

        // rff
        if (String.fromCharCode(...bytes.slice(0, 4)) === "RFF\x1a") {
            return Build.Models.Storage.RFF.Unserialize(bytes);
        }

        // ssi
        if (((bytes[0] << 0) | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) === 2) {
            return Build.Models.Storage.SSI.Unserialize(bytes);
        }

    }

}

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
    static XSpriteSize = 56;
    static XWallSize = 24;

    // reference: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L203
    static decrypt = (bytes, key) => {

        const output = Uint8Array.from(bytes);

        for (let i = 0; i < bytes.length; i++) {
            output[i] ^= key;
            key++;
        }

        return output;

    };

    // we can use the same algorithm since the encryption is symmetrical
    static encrypt = (bytes, key) => BLM.decrypt(bytes, key);

    // create empty map object
    constructor () {
        super();
        this.Signature = "BLM\x1a";
        this.Version = 0;
        this.X = 0;
        this.Y = 0;
        this.Z = 0;
        this.A = 0;
        this.S = 0;
        this.SkyBits = 0;
        this.Visibility = 0;
        this.Song = 0;
        this.Parallax = 0;
        this.Revision = 0;
        this.Sectors = [];
        this.Walls = [];
        this.Sprites = [];
        this.XPadStart = 0;
        this.XSectorSize = 0;
        this.XWallSize = 0;
        this.XSpriteSize = 0;
        this.XPadEnd = 0;
        this.SkyOffsets = [];
    }

    // transforms byte array into map object
    static Unserialize (bytes) {

        // create empty map object
        const map = new BLM();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);

        // read BLM\x1a signature
        map.Signature = reader.string(4);
        
        // read map version
        map.Version = reader.int16();

        // version flag?
        map.byte1A76C8 = (map.Version & 0xff00) === 0x700;
        map.byte1A76C7 = false;
        map.byte1A76C6 = false;

        // read header bytes
        let headerBytes = reader.read(BLM.HeaderSize);

        // get int32 key (where the "song id" would be)
        map.at16 = (headerBytes[23] << 0) | (headerBytes[24] << 8) | (headerBytes[25] << 16) | (headerBytes[26] << 24);

        // check if decryption is needed
        if (map.at16 !== 0 && map.at16 !== BLM.NewKey && map.at16 !== BLM.OldKey) {

            // decrypt header bytes
            headerBytes = BLM.decrypt(headerBytes, BLM.NewKey);

            // ecryption flag?
            map.byte1A76C7 = true;

        }

        // create header reader
        const headerReader = new Build.Scripts.ByteReader(headerBytes);

        // read map header
        map.X = headerReader.int32();
        map.Y = headerReader.int32();
        map.Z = headerReader.int32();
        map.A = headerReader.int16();
        map.S = headerReader.int16();
        map.SkyBits = headerReader.int16();
        map.Visibility = headerReader.int32();
        map.Song = headerReader.int32();
        map.Parallax = headerReader.int8();
        map.Revision = headerReader.int32();

        // get number of structs
        map.Sectors = new Array(headerReader.uint16());
        map.Walls = new Array(headerReader.uint16());
        map.Sprites = new Array(headerReader.uint16());

        // another flag?
        if (map.byte1A76C8) {
            if (map.at16 === BLM.NewKey || map.at16 === BLM.OldKey) {                
                map.byte1A76C6 = true;
            } else if (!map.at16) {
                map.byte1A76C6 = false;
            }
        }

        // read extra flags header
        if (map.byte1A76C8) {
            const extraReader = new Build.Scripts.ByteReader(BLM.decrypt(reader.read(BLM.ExtraHeaderSize), map.Walls.length));
            map.XPadStart = extraReader.read(64);
            map.XSectorSize = extraReader.uint32();
            map.XWallSize = extraReader.uint32();
            map.XSpriteSize = extraReader.uint32();
            map.XPadEnd = extraReader.read(52);
        }

        // sky offsets
        map.SkyOffsets = new Array((1 << map.SkyBits));

        // read sky bytes (read 2 bytes per offset because it is a int16 array)
        let skyBytes = reader.read(map.SkyOffsets.length * 2);

        // check if sky bytes needs to be decrypted
        if (map.byte1A76C8) {

            // decrypt sky bytes
            skyBytes = BLM.decrypt(skyBytes, map.SkyOffsets.length * 2);

        }

        // read sky offsets (int16 array)
        for (let i = 0; i < map.SkyOffsets.length; i++) {
            map.SkyOffsets[i] = skyBytes[i*2] << 0 | skyBytes[(i*2)+1] << 8;
        }

        // read sectors
        for (let i = 0; i < map.Sectors.length; i++) {

            // read sector bytes
            let sectorBytes = reader.read(BLM.SectorSize);

            // check if sector bytes needs to be decrypted
            if (map.byte1A76C8) {

                // decrypt sector bytes
                sectorBytes = BLM.decrypt(sectorBytes, map.Revision * BLM.SectorSize);

            }

            // creater sector reader
            const sectorReader = new Build.Scripts.ByteReader(sectorBytes);

            // read sector struct
            map.Sectors[i] = {
                wallptr: sectorReader.int16(),
                wallnum: sectorReader.int16(),
                ceilingz: sectorReader.int32(),
                floorz: sectorReader.int32(),
                ceilingstat: sectorReader.int16(),
                floorstat: sectorReader.int16(),
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
            if (map.Sectors[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                map.Sectors[i].xsector = reader.read(map.byte1A76C8 ? map.XSectorSize : BLM.XSectorSize);

            }

        }

        // read walls
        for (let i = 0; i < map.Walls.length; i++) {

            // read wall bytes
            let wallBytes = reader.read(BLM.WallSize);

            // check if wall bytes needs to be decrypted
            if (map.byte1A76C8) {

                // decrypt wall bytes
                wallBytes = BLM.decrypt(wallBytes, map.Revision * BLM.WallSize);

            }

            // creater wall reader
            const wallReader = new Build.Scripts.ByteReader(wallBytes);

            // read wall struct
            map.Walls[i] = {
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
            if (map.Walls[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1973
                map.Walls[i].xwall = reader.read(map.byte1A76C8 ? map.XWallSize : BLM.XWallSize);

            }

        }

        // read sprites
        for (let i = 0; i < map.Sprites.length; i++) {

            // read sprite bytes
            let spriteBytes = reader.read(BLM.SpriteSize);

            // check if sprite bytes needs to be decrypted
            if (map.byte1A76C8) {

                // decrypt sprite bytes
                spriteBytes = BLM.decrypt(spriteBytes, map.Revision * BLM.SpriteSize);

            }

            // creater sprite reader
            const spriteReader = new Build.Scripts.ByteReader(spriteBytes);

            // read wall struct
            map.Sprites[i] = {
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
            if (map.Sprites[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L2060
                map.Sprites[i].xsprite = reader.read(map.byte1A76C8 ? map.XSpriteSize : BLM.XSpriteSize);

            }

        }

        // return filled map object
        return map;

    }

    // transforms map object into byte array
    static Serialize (map) {

        // create byte writer
        const writer = new Build.Scripts.ByteWriter(
            4 + // signature
            2 + // version
            BLM.HeaderSize +
            BLM.ExtraHeaderSize +
            map.SkyOffsets.length * 2 +
            map.Sectors.length * BLM.SectorSize +
            map.Sectors.filter(s => s.extra > 0).length * (map.byte1A76C8 ? map.XSectorSize : BLM.XSectorSize) +
            map.Walls.length * BLM.WallSize +
            map.Walls.filter(w => w.extra > 0).length * (map.byte1A76C8 ? map.XWallSize : BLM.XWallSize) +
            map.Sprites.length * BLM.SpriteSize +
            map.Sprites.filter(s => s.extra > 0).length * (map.byte1A76C8 ? map.XSpriteSize : BLM.XSpriteSize)
        );

        // write BLM\x1a signature
        writer.string(map.Signature, 4);
        
        // write map version
        writer.int16(map.Version);

        // create header writer
        const headerWriter = new Build.Scripts.ByteWriter(BLM.HeaderSize);

        // write map header bytes to local writer
        headerWriter.int32(map.X);
        headerWriter.int32(map.Y);
        headerWriter.int32(map.Z);
        headerWriter.int16(map.A);
        headerWriter.int16(map.S);
        headerWriter.int16(map.SkyBits);
        headerWriter.int32(map.Visibility);
        headerWriter.int32(map.Song);
        headerWriter.int8(map.Parallax);
        headerWriter.int32(map.Revision);
        headerWriter.int16(map.Sectors.length);
        headerWriter.int16(map.Walls.length);
        headerWriter.int16(map.Sprites.length);

        // check if header bytes needs to be encrypted
        if (map.byte1A76C7) {

            // encrypt header bytes
            headerWriter.bytes = BLM.encrypt(headerWriter.bytes, BLM.NewKey);

        }

        // write header bytes
        writer.write(headerWriter.bytes);

        // write extra flags header
        if (map.byte1A76C8) {
            const extraWriter = new Build.Scripts.ByteWriter(BLM.ExtraHeaderSize);
            extraWriter.write(map.XPadStart); // 64
            extraWriter.int32(map.XSectorSize);
            extraWriter.int32(map.XWallSize);
            extraWriter.int32(map.XSpriteSize);
            extraWriter.write(map.XPadEnd); // 52
            writer.write(BLM.encrypt(extraWriter.bytes, map.Walls.length));
        }

        // create sky writer
        const skyWriter = new Build.Scripts.ByteWriter(map.SkyOffsets.length * 2);

        // write sky bytes to local writer
        for (let i = 0; i < map.SkyOffsets.length; i++) {
            skyWriter.int16(map.SkyOffsets[i]);            
        }

        // check if sky bytes needs to be encrypted
        if (map.byte1A76C8) {

            // decrypt sky bytes
            skyWriter.bytes = BLM.encrypt(skyWriter.bytes, map.SkyOffsets.length * 2);

        }

        // write sky bytes
        writer.write(skyWriter.bytes);

        // write sectors
        for (let i = 0; i < map.Sectors.length; i++) {

            const sectorWriter = new Build.Scripts.ByteWriter(BLM.SectorSize);

            // write sector struct
            sectorWriter.int16(map.Sectors[i].wallptr);
            sectorWriter.int16(map.Sectors[i].wallnum);
            sectorWriter.int32(map.Sectors[i].ceilingz);
            sectorWriter.int32(map.Sectors[i].floorz);
            sectorWriter.int16(map.Sectors[i].ceilingstat);
            sectorWriter.int16(map.Sectors[i].floorstat);
            sectorWriter.int16(map.Sectors[i].ceilingpicnum);
            sectorWriter.int16(map.Sectors[i].ceilingheinum);
            sectorWriter.int8(map.Sectors[i].ceilingshade);
            sectorWriter.int8(map.Sectors[i].ceilingpal);
            sectorWriter.int8(map.Sectors[i].ceilingxpanning);
            sectorWriter.int8(map.Sectors[i].ceilingypanning);
            sectorWriter.int16(map.Sectors[i].floorpicnum);
            sectorWriter.int16(map.Sectors[i].floorheinum);
            sectorWriter.int8(map.Sectors[i].floorshade);
            sectorWriter.int8(map.Sectors[i].floorpal);
            sectorWriter.int8(map.Sectors[i].floorxpanning);
            sectorWriter.int8(map.Sectors[i].floorypanning);
            sectorWriter.int8(map.Sectors[i].visibility);
            sectorWriter.int8(map.Sectors[i].filler);
            sectorWriter.int16(map.Sectors[i].lotag);
            sectorWriter.int16(map.Sectors[i].hitag);
            sectorWriter.int16(map.Sectors[i].extra);

            // check if sector extra needs to be written
            if (map.Sectors[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(map.Sectors[i].xsector);

            }

            // check if sector bytes needs to be decrypted
            if (map.byte1A76C8) {

                // encrypt sector bytes
                sectorWriter.bytes = BLM.encrypt(sectorWriter.bytes, map.Revision * BLM.SectorSize);

            }

            // write sector bytes
            writer.write(sectorWriter.bytes);

        }

        // write walls
        for (let i = 0; i < map.Walls.length; i++) {

            const wallWriter = new Build.Scripts.ByteWriter(BLM.WallSize);

            // write wall struct
            wallWriter.int32(map.Walls[i].x);
            wallWriter.int32(map.Walls[i].y);
            wallWriter.int16(map.Walls[i].point2);
            wallWriter.int16(map.Walls[i].nextwall);
            wallWriter.int16(map.Walls[i].nextsector);
            wallWriter.int16(map.Walls[i].cstat);
            wallWriter.int16(map.Walls[i].picnum);
            wallWriter.int16(map.Walls[i].overpicnum);
            wallWriter.int8(map.Walls[i].shade);
            wallWriter.int8(map.Walls[i].pal);
            wallWriter.int8(map.Walls[i].xrepeat);
            wallWriter.int8(map.Walls[i].yrepeat);
            wallWriter.int8(map.Walls[i].xpanning);
            wallWriter.int8(map.Walls[i].ypanning);
            wallWriter.int16(map.Walls[i].lotag);
            wallWriter.int16(map.Walls[i].hitag);
            wallWriter.int16(map.Walls[i].extra);

            // check if wall extra needs to be written
            if (map.Walls[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(map.Walls[i].xwall);

            }

            // check if wall bytes needs to be decrypted
            if (map.byte1A76C8) {

                // encrypt wall bytes
                wallWriter.bytes = BLM.encrypt(wallWriter.bytes, map.Revision * BLM.WallSize);

            }

            // write wall bytes
            writer.write(wallWriter.bytes);

        }

        // write sprites
        for (let i = 0; i < map.Sprites.length; i++) {

            const spriteWriter = new Build.Scripts.ByteWriter(BLM.SpriteSize);

            // write sprite struct
            spriteWriter.int32(map.Sprites[i].x);
            spriteWriter.int32(map.Sprites[i].y);
            spriteWriter.int32(map.Sprites[i].z);
            spriteWriter.int16(map.Sprites[i].cstat);
            spriteWriter.int16(map.Sprites[i].picnum);
            spriteWriter.int8(map.Sprites[i].shade);
            spriteWriter.int8(map.Sprites[i].pal);
            spriteWriter.int8(map.Sprites[i].clipdist);
            spriteWriter.int8(map.Sprites[i].filler);
            spriteWriter.int8(map.Sprites[i].xrepeat);
            spriteWriter.int8(map.Sprites[i].yrepeat);
            spriteWriter.int8(map.Sprites[i].xoffset);
            spriteWriter.int8(map.Sprites[i].yoffset);
            spriteWriter.int16(map.Sprites[i].sectnum);
            spriteWriter.int16(map.Sprites[i].statnum);
            spriteWriter.int16(map.Sprites[i].ang);
            spriteWriter.int16(map.Sprites[i].owner);
            spriteWriter.int16(map.Sprites[i].xvel);
            spriteWriter.int16(map.Sprites[i].yvel);
            spriteWriter.int16(map.Sprites[i].zvel);
            spriteWriter.int16(map.Sprites[i].lotag);
            spriteWriter.int16(map.Sprites[i].hitag);
            spriteWriter.int16(map.Sprites[i].extra);

            // check if sprite extra needs to be written
            if (map.Sprites[i].extra > 0) {

                // TODO => https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L1852
                writer.write(map.Sprites[i].xsprite);

            }

            // check if sprite bytes needs to be decrypted
            if (map.byte1A76C8) {

                // encrypt sprite bytes
                spriteWriter.bytes = BLM.encrypt(spriteWriter.bytes, map.Revision * BLM.SpriteSize);

            }

            // write sprite bytes
            writer.write(spriteWriter.bytes);

        }
        
        // return map bytes
        return writer.bytes;

    }

}

// reference: https://moddingwiki.shikadi.net/wiki/MAP_Format_(Build)
Build.Models.Map.DNM = class DNM extends Build.Models.Map {

    static SectorSize = 40;
    static WallSize = 32;
    static SpriteSize = 44;

    constructor (version) {
        super();
        this.Version = version;
        this.X = 0;
        this.Y = 0;
        this.Z = 0;
        this.A = 0;
        this.S = 0;   
        this.Sectors = [];
        this.Walls = [];
        this.Sprites = [];
    }

    static Unserialize (bytes) {

        const map = new DNM(0);
        
        const reader = new Build.Scripts.ByteReader(bytes);

        map.Version = reader.int32();
        map.X = reader.int32();
        map.Y = reader.int32();
        map.Z = reader.int32();
        map.A = reader.int16();
        map.S = reader.int16();   

        map.Sectors = new Array(reader.uint16());

        for (let i = 0; i < map.Sectors.length; i++) {
            map.Sectors[i] = {
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

        map.Walls = new Array(reader.uint16());

        for (let i = 0; i < map.Walls.length; i++) {
            map.Walls[i] = {
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

        map.Sprites = new Array(reader.uint16());

        for (let i = 0; i < map.Sprites.length; i++) {
            map.Sprites[i] = {
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

        return map;

    }

    static Serialize (map) {

        const writer = new Build.Scripts.ByteWriter(
            4 + // version
            4 + // x
            4 + // y
            4 + // z
            2 + // a
            2 + // s
            2 + map.Sectors.length * DNM.SectorSize + // numsectors + sectors
            2 + map.Walls.length * DNM.WallSize + // numwalls + walls
            2 + map.Sprites.length * DNM.SpriteSize // numsprites + sprites
        );

        writer.int32(map.Version);
        writer.int32(map.X);
        writer.int32(map.Y);
        writer.int32(map.Z);
        writer.int16(map.A);
        writer.int16(map.S);

        writer.int16(map.Sectors.length);

        for (let i = 0; i < map.Sectors.length; i++) {
            writer.int16(map.Sectors[i].wallptr);
            writer.int16(map.Sectors[i].wallnum);
            writer.int32(map.Sectors[i].ceilingz);
            writer.int32(map.Sectors[i].floorz);
            writer.int16(map.Sectors[i].ceilingstat);
            writer.int16(map.Sectors[i].floorstat);
            writer.int16(map.Sectors[i].ceilingpicnum);
            writer.int16(map.Sectors[i].ceilingheinum);
            writer.int8(map.Sectors[i].ceilingshade);
            writer.int8(map.Sectors[i].ceilingpal);
            writer.int8(map.Sectors[i].ceilingxpanning);
            writer.int8(map.Sectors[i].ceilingypanning);
            writer.int16(map.Sectors[i].floorpicnum);
            writer.int16(map.Sectors[i].floorheinum);
            writer.int8(map.Sectors[i].floorshade);
            writer.int8(map.Sectors[i].floorpal);
            writer.int8(map.Sectors[i].floorxpanning);
            writer.int8(map.Sectors[i].floorypanning);
            writer.int8(map.Sectors[i].visibility);
            writer.int8(map.Sectors[i].filler);
            writer.int16(map.Sectors[i].lotag);
            writer.int16(map.Sectors[i].hitag);
            writer.int16(map.Sectors[i].extra);
        }

        writer.int16(map.Walls.length);

        for (let i = 0; i < map.Walls.length; i++) {
            writer.int32(map.Walls[i].x);
            writer.int32(map.Walls[i].y);
            writer.int16(map.Walls[i].point2);
            writer.int16(map.Walls[i].nextwall);
            writer.int16(map.Walls[i].nextsector);
            writer.int16(map.Walls[i].cstat);
            writer.int16(map.Walls[i].picnum);
            writer.int16(map.Walls[i].overpicnum);
            writer.int8(map.Walls[i].shade);
            writer.int8(map.Walls[i].pal);
            writer.int8(map.Walls[i].xrepeat);
            writer.int8(map.Walls[i].yrepeat);
            writer.int8(map.Walls[i].xpanning);
            writer.int8(map.Walls[i].ypanning);
            writer.int16(map.Walls[i].lotag);
            writer.int16(map.Walls[i].hitag);
            writer.int16(map.Walls[i].extra);
        }

        writer.int16(map.Sprites.length);

        for (let i = 0; i < map.Sprites.length; i++) {
            writer.int32(map.Sprites[i].x);
            writer.int32(map.Sprites[i].y);
            writer.int32(map.Sprites[i].z);
            writer.int16(map.Sprites[i].cstat);
            writer.int16(map.Sprites[i].picnum);
            writer.int8(map.Sprites[i].shade);
            writer.int8(map.Sprites[i].pal);
            writer.int8(map.Sprites[i].clipdist);
            writer.int8(map.Sprites[i].filler);
            writer.int8(map.Sprites[i].xrepeat);
            writer.int8(map.Sprites[i].yrepeat);
            writer.int8(map.Sprites[i].xoffset);
            writer.int8(map.Sprites[i].yoffset);
            writer.int16(map.Sprites[i].sectnum);
            writer.int16(map.Sprites[i].statnum);
            writer.int16(map.Sprites[i].ang);
            writer.int16(map.Sprites[i].owner);
            writer.int16(map.Sprites[i].xvel);
            writer.int16(map.Sprites[i].yvel);
            writer.int16(map.Sprites[i].zvel);
            writer.int16(map.Sprites[i].lotag);
            writer.int16(map.Sprites[i].hitag);
            writer.int16(map.Sprites[i].extra);
        }

        return writer.bytes;

    }

}

// reference: https://moddingwiki.shikadi.net/wiki/GRP_Format
Build.Models.Storage.GRP = class GRP extends Build.Models.Storage {

    // header sizes
    static HeaderSize = 16;
    static FileHeaderSize = 16;

    // create empty grp object
    constructor () {
        super();
        this.Signature = "KenSilverman";
        this.Files = [];
    }

    // transforms byte array into grp object
    static Unserialize (bytes) {

        // create empty grp object
        const grp = new GRP();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);

        // read ken silverman signature
        grp.Signature = reader.string(12);

        // read number of files
        grp.Files = new Array(reader.uint32());

        // read file names and sizes
        for (let i = 0; i < grp.Files.length; i++) {
            grp.Files[i] = {
                name: reader.string(12),
                size: reader.uint32(),
                bytes: null
            };
        }

        // read file bytes
        for (let i = 0; i < grp.Files.length; i++) {
            grp.Files[i].bytes = reader.read(grp.Files[i].size);
        }

        // return filled grp object
        return grp;

    }

    // transforms grp object into byte array
    static Serialize (grp) {

        // create byte writer
        const writer = new Build.Scripts.ByteWriter(
            GRP.HeaderSize + 
            grp.Files.length * GRP.FileHeaderSize + 
            grp.Files.reduce((sum, f) => sum + f.bytes.length, 0)
        );

        // write ken silverman string
        writer.string(grp.Signature, 12);

        // write number of files
        writer.int32(grp.Files.length);
        
        // write file names and sizes
        for (let i = 0; i < grp.Files.length; i++) {

            // name
            writer.string(grp.Files[i].name, 12);

            // size
            writer.int32(grp.Files[i].bytes.length);
            
        }

        // write file bytes
        for (let i = 0; i < grp.Files.length; i++) {            
            writer.write(grp.Files[i].bytes);
        }

        // return array of bytes
        return writer.bytes;

    }

}

// pk3 (zip) -> code 90% generated by chatgpt
Build.Models.Storage.PK3 = class PK3 extends Build.Models.Storage {

    // create empty pk3 object
    constructor() {
        super();    
    }

    // transform byte array into pk3 object
    static Unserialize (bytes) {

        // create empty pk3 object
        const pk3 = new PK3();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);
        
        pk3.Signature === "PK3";
        pk3.Files = [];

        while (reader.index < bytes.length) {

            const sig = reader.uint32();

            if (sig !== 0x04034b50) break;

            const version = reader.uint16();
            const flags = reader.uint16();
            const compression = reader.uint16();
            const time = reader.uint16();
            const date = reader.uint16();
            const crc32 = reader.uint32();
            const compressedSize = reader.uint32();
            const uncompressedSize = reader.uint32();
            const nameLength = reader.uint16();
            const extraLength = reader.uint16();

            const name = reader.string(nameLength);
            reader.index += extraLength;

            const compressedData = reader.read(compressedSize);
            let uncompressedData = null;

            if (compression === 0) {
                uncompressedData = compressedData;
            } else if (compression === 8) {
                uncompressedData = (new Build.Scripts.ZLIB.RawInflate(compressedData)).decompress();
            } else {
                throw new Error("Unsupported compression type: " + compression);
            }

            pk3.Files.push({
                name: name,
                size: uncompressedData.length,
                bytes: uncompressedData
            });

        }

        // return filled pk3 object
        return pk3;

    }

    // transform pk3 into byte array
    static Serialize (pk3) {

        let writerLength = 0;
        let centralDirLength = 0;

        const deflatedFiles = [];

        for (const i in pk3.Files) {
            const file = pk3.Files[i];
            const nameBytes = new TextEncoder().encode(file.name);
            const content = new Uint8Array(file.bytes);
            // the following line is VERY slow
            const deflated = (new Build.Scripts.ZLIB.RawDeflate(content)).compress();
            deflatedFiles[i] = deflated;
            const compressedLength = deflated.length;
            writerLength += 30 + nameBytes.length + compressedLength;
            centralDirLength += 46 + nameBytes.length;
        }

        writerLength += centralDirLength + 22;

        const writer = new Build.Scripts.ByteWriter(writerLength);
        const centralDirectory = new Build.Scripts.ByteWriter(centralDirLength);

        const localOffsets = [];
        let offset = 0;

        for (const i in pk3.Files) {

            const file = pk3.Files[i];

            const nameBytes = new TextEncoder().encode(file.name);
            const content = new Uint8Array(file.bytes);
            const deflated = deflatedFiles[i];
            const compressed = deflated;
            const compression = 8;

            localOffsets.push(offset);

            // local file header
            writer.int32(0x04034b50); // signature
            writer.int16(20); // version needed
            writer.int16(0);  // general purpose bit flag
            writer.int16(compression); // compression method
            writer.int16(0); // mod time
            writer.int16(0); // mod date
            writer.int32(0); // CRC32 (0 por simplicidade)
            writer.int32(compressed.length);
            writer.int32(content.length);
            writer.int16(nameBytes.length);
            writer.int16(0); // extra field length
            writer.write(nameBytes);
            writer.write(compressed);

            offset = writer.bytes.length;

            // central directory
            centralDirectory.int32(0x02014b50); // central dir sig
            centralDirectory.int16(0x0317); // made by
            centralDirectory.int16(20); // version needed
            centralDirectory.int16(0);  // flags
            centralDirectory.int16(compression);
            centralDirectory.int16(0); // mod time
            centralDirectory.int16(0); // mod date
            centralDirectory.int32(0); // CRC32
            centralDirectory.int32(compressed.length);
            centralDirectory.int32(content.length);
            centralDirectory.int16(nameBytes.length);
            centralDirectory.int16(0); // extra length
            centralDirectory.int16(0); // comment length
            centralDirectory.int16(0); // disk number start
            centralDirectory.int16(0); // internal attrs
            centralDirectory.int32(0); // external attrs
            centralDirectory.int32(localOffsets[localOffsets.length - 1]); // offset
            centralDirectory.write(nameBytes);

        }

        const centralOffset = writer.bytes.length;
        writer.write(centralDirectory.bytes);
        const centralSize = writer.bytes.length - centralOffset;

        // end of central directory
        writer.int32(0x06054b50);
        writer.int16(0); // disk number
        writer.int16(0); // start disk
        writer.int16(pk3.Files.length);
        writer.int16(pk3.Files.length);
        writer.int32(centralSize);
        writer.int32(centralOffset);
        writer.int16(0); // comment length

        return writer.bytes;

    }

}

// reference: https://github.com/camoto-project/gamearchivejs/blob/master/formats/arc-rff-blood-common.js
Build.Models.Storage.RFF = class RFF extends Build.Models.Storage {

    // sizes
    static HeaderSize = 32;
    static FileHeaderSize = 48;

    // reference: https://github.com/camoto-project/gamecompjs/blob/master/formats/enc-xor-blood.js
    static decrypt = (bytes, options) => {

        const output = Uint8Array.from(bytes);
        const offset = parseInt(options.offset || 0);
        const seed = parseInt(options.seed || 0);
        const limit = options.limit === undefined ? 256 : parseInt(options.limit);
        const length = limit === 0 ? bytes.length : Math.min(limit, bytes.length);

        for (let i = 0; i < length; i++) {
            output[i] ^= seed + ((i + offset) >> 1);
        }

        return output;

    };

    // we can use the same algorithm since the encryption is symmetrical
    static encrypt = (bytes, options) => RFF.decrypt(bytes, options);

    // util
    static toUnixTime = d => d.valueOf() / 1000 - new Date().getTimezoneOffset() * 60;

    // create empty rff object
    constructor() {
        super();
        this.Signature = "RFF\x1A";
        this.Version = 0;
        this.Padding1 = new Uint8Array(2).fill(0);
        this.Offset = 0;
        this.Files = [];
        this.Padding2 = new Uint8Array(16).fill(0);        
    }

    // transform byte array into rff object
    static Unserialize (bytes) {

        // create empty rff object
        const rff = new RFF();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);

        // read RFF\x1a signature
        rff.Signature = reader.string(4);

        // read version
        // 0x0200 - shareware 0.99 (CD version) - FAT is not encrypted
        // 0x0300 - registered 1.00 - FAT is encrypted
        // 0x0301 - patches for registered and later shareware releases - FAT is encrypted
        rff.Version = reader.uint16();

        // unused
        rff.Padding1 = reader.read(2);

        // read fat offset (file headers offset)
        rff.Offset = reader.uint32();

        // read number of files
        rff.Files = new Array(reader.uint32());

        // unused
        rff.Padding2 = reader.read(16);

        // decrypt chunk of file headers bytes (these are located AFTER the file contents)
        const fileHeadersBytes = RFF.decrypt(reader.bytes.slice(rff.Offset, rff.Offset + rff.Files.length * RFF.FileHeaderSize), {
            seed: rff.Offset & 0xFF,
            offset: 0,
            limit: 0
        });

        // create file header reader
        const fileHeaderReader = new Build.Scripts.ByteReader(fileHeadersBytes);

        // read files headers
        for (let i = 0; i < rff.Files.length; i++) {
            rff.Files[i] = {
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
            rff.Files[i].name += `.${rff.Files[i].type}`;
        }

        // read files contents
        for (let i = 0; i < rff.Files.length; i++) {
            const bytes = reader.bytes.slice(rff.Files[i].offset, rff.Files[i].offset + rff.Files[i].size);
            rff.Files[i].bytes = (rff.Files[i].flags & 16) ? RFF.decrypt(bytes, { seed: 0, offset: 0, limit: 256 }) : bytes;
        }

        // return filled rff object
        return rff;

    }

    // transform rff object into byte array
    static Serialize (rff) {

        // file content size offsets (initialize pointing to after the rff header)
        let offset = RFF.HeaderSize;

        // encrypt file contents before performing any calculations
        for (let i = 0; i < rff.Files.length; i++) {
            rff.Files[i].flags |= 16;
            rff.Files[i].bytes = (rff.Files[i].flags & 16) ? RFF.encrypt(rff.Files[i].bytes, { seed: 0, offset: 0, limit: 256 }) : rff.Files[i].bytes;
            rff.Files[i].size = rff.Files[i].bytes.length;
            rff.Files[i].offset = offset;
            offset += rff.Files[i].size;
        }

        // create byte writer
        const writer = new Build.Scripts.ByteWriter(
            RFF.HeaderSize + 
            rff.Files.reduce((sum, f) => sum += f.size , 0) + 
            rff.Files.length * RFF.FileHeaderSize
        );

        // write RFF\x1A signature
        writer.string(rff.Signature, 4);

        // write version
        // 0x0200 - shareware 0.99 (CD version) - FAT is not encrypted
        // 0x0300 - registered 1.00 - FAT is encrypted
        // 0x0301 - patches for registered and later shareware releases - FAT is encrypted
        writer.int16(rff.Version);

        // unused
        writer.write(rff.Padding1);

        // write fat offset (file headers offset)
        writer.int32(RFF.HeaderSize + rff.Files.reduce((sum, f) => sum += f.size , 0));

        // write number of files
        writer.int32(rff.Files.length);

        // unused
        writer.write(rff.Padding2);                

        // write file contents
        for (let i = 0; i < rff.Files.length; i++) {            
            writer.write(rff.Files[i].bytes);
            //const bytes = rff.Files[i].flags & 16 ? encrypt(rff.Files[i].bytes, { seed: 0, offset: 0, limit: 256 }) : rff.Files[i].bytes;
            //writer.write(bytes);
            //rff.Files[i].offset = offset;
            // this needs to be calculated here because of the encryption
            //offset += bytes.length;
        }

        // create file header writer
        const fileHeaderWriter = new Build.Scripts.ByteWriter(rff.Files.length * RFF.FileHeaderSize);

        // write files headers
        for (let i = 0; i < rff.Files.length; i++) {
            fileHeaderWriter.write(rff.Files[i].cache || new Uint8Array(16).fill(0)); // unused
            fileHeaderWriter.int32(rff.Files[i].offset);
            fileHeaderWriter.int32(rff.Files[i].size);
            fileHeaderWriter.int32(rff.Files[i].packedSize); // packed size
            fileHeaderWriter.int32(rff.Files[i].time || RFF.toUnixTime(new Date())); // last modified
            fileHeaderWriter.int8(rff.Files[i].flags);
            fileHeaderWriter.string(rff.Files[i].name.split(".")[1], 3); // extension
            fileHeaderWriter.string(rff.Files[i].name.split(".")[0], 8); // name
            fileHeaderWriter.int32(rff.Files[i].id || 0);
        }

        // encrypt chunks of file headers
        writer.write(RFF.encrypt(fileHeaderWriter.bytes, {
            seed: offset & 0xFF,
            offset: 0,
            limit: 0
        }));

        // return bytes
        return writer.bytes;

    }

}

// reference: http://dukertcm.com/knowledge-base/downloads-rtcm/general-tools/unpackssi.zip
Build.Models.Storage.SSI = class SSI extends Build.Models.Storage {

    constructor() {
        super();
        this.Version = 0;
        this.Files = [];
        this.Title = "";
        this.RunFile = "";
        this.Description = [];
    }

    // transform byte array into ssi object
    static Unserialize(bytes) {

        // create empty ssi object
        const ssi = new SSI();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);

        // read file version (1 or 2)
        ssi.Version = reader.uint32();

        // read number of files
        ssi.Files = new Array(reader.uint32());

        // title
        const numcharsTitle = reader.uint8();
        ssi.Title = reader.string(32).slice(0, numcharsTitle);

        // runfile
        if (ssi.Version === 2) {
            const numcharsRunFile = reader.uint8();
            ssi.RunFile = reader.string(12).slice(0, numcharsRunFile);
        }

        // description
        ssi.Description = [];

        for (let i = 0; i < 3; i++) {
            const numcharsDescription = reader.uint8();
            ssi.Description[i] = reader.string(70).slice(0, numcharsDescription);
        }

        // read file names and sizes
        for (let i = 0; i < ssi.Files.length; i++) {
            const numchars = reader.uint8();
            ssi.Files[i] = {
                name: reader.string(12).slice(0, numchars),
                size: reader.uint32(),
                fill: reader.read(34+1+69), // unknown
                bytes: null
            }
        }

        // read file bytes
        for (let i = 0; i < ssi.Files.length; i++) {
            ssi.Files[i].bytes = reader.read(ssi.Files[i].size);
        }

        // return filled object
        return ssi;

    }

    // transform ssi object into byte array
    static Serialize(ssi) {

        // create byte writer
        const writer = new Build.Scripts.ByteWriter(4 +
            4 +
            1 +
            32 +
            (ssi.Version === 2 ? 1 + 12 : 0) + 
            1 + 
            70 +
            1 + 
            70 + 
            1 + 
            70 + 
            ssi.Files.length * (1+12+4+34+1+69) + 
            ssi.Files.reduce((sum, f) => sum + f.bytes.length, 0)
        );

        // write version
        writer.int32(ssi.Version);

        // write number of files
        writer.int32(ssi.Files.length);

        // title length
        writer.int8(ssi.Title.length);

        // title
        writer.string(ssi.Title, 32);

        // runfile
        if (ssi.Version === 2) {
            writer.int8(ssi.RunFile.length);
            writer.string(ssi.RunFile, 12);
        }

        // description
        for (let i = 0; i < 3; i++) {
            writer.int8(ssi.Description[i].length);
            writer.string(ssi.Description[i], 70);
        }

        // write file names and sizes
        for (let i = 0; i < ssi.Files.length; i++) {
            writer.int8(ssi.Files[i].name.length);
            writer.string(ssi.Files[i].name, 12);
            writer.int32(ssi.Files[i].bytes.length);
            writer.write(ssi.Files[i].fill || new Array(34+1+69).fill(0));
        }

        // write file bytes
        for (let i = 0; i < ssi.Files.length; i++) {            
            writer.write(ssi.Files[i].bytes);
        }

        // return array of bytes
        return writer.bytes;

    };

}