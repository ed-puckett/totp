// base32.js

// See: https://datatracker.ietf.org/doc/html/rfc4648 "The Base16, Base32, and Base64 Data Encodings"


export function decode_base32(base32_string, verbose=false) {
    if (base32_string.length % 8 !== 0) {
        throw new Error('base32_string must be a multiple of 8 characters in length');
    }
    // note that 0-length base32_string is supported
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const pad_char = '=';
    const valid_padding_lengths = [0, 6, 4, 3, 1];
    const validator_re = new RegExp(`^(?<codes>[${alphabet}]*)(?<padding>(${valid_padding_lengths.map(n => `[${pad_char}]{${n}}`).join('|')}))$`);
    const match = base32_string.match(validator_re);
    if (!match) {
        throw new Error('illegal format for base32_string');
    }
    const { codes, padding } = match.groups;
    const result_values = [];  // array of byte values
    let bits = 0;
    let bit_count = 0;
    function emit_most_significant_bits(count) {
        if (verbose) {
            console.log('decode_base32:', { bits: bits.toString(2).padStart(bit_count, '0'), bit_count, count });
        }
        if (count > bit_count) {
            throw new Error(`unexpected: count = ${count} > bit_count = ${bit_count}`);
        }
        bit_count -= count;
        result_values.push(bits >> bit_count);  // emit count most significant bits
        bits &= ~(~0 << bit_count);  // mask out emitted bits
    }
    for (const code of codes) {
        bits = (bits << 5) | alphabet.indexOf(code);
        bit_count += 5;
        if (bit_count >= 8) {
            emit_most_significant_bits(8);  // bit_count will always be less than 8 after this statement
        }
    }
    // encoding was done in blocks of 8 encoded bytes, each encoded byte representing 5 encoded bits (40 encoded bits)
    // each block encodes 5 original bytes = 40 original bits
    // padding pads out to a final 8-encoded-byte boundary
    const unpadded_length = 8 - padding.length;  // 8 byte block less padding length
    const padded_bits = 5*unpadded_length % 8;
    if (bit_count !== padded_bits) {
        throw new Error(`unexpected: after decoding, bit_count ${bit_count} !== padded_bits = ${padded_bits}`);
    }
    if (bits !== 0) {
        throw new Error(`after decoding base32_string, bits = ${bits} !== 0; the last encoded bits must have been improperly padded`);
    }
    const result = Uint8Array.from(result_values);
    if (verbose) {
        console.log('decode_base32:', { base32_string, result_values, result, result_length: result.length });
    }
    return result;
}


//======================================================================
// TESTING
//
// BACKGROUND
// ==========
// > const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
// > for (i in alphabet) console.log(alphabet[i], (+i).toString(2).padStart(5, '0'))
//
// A 00000   I 01000   Q 10000   Y 11000
// B 00001   J 01001   R 10001   Z 11001
// C 00010   K 01010   S 10010   2 11010
// D 00011   L 01011   T 10011   3 11011
// E 00100   M 01100   U 10100   4 11100
// F 00101   N 01101   V 10101   5 11101
// G 00110   O 01110   W 10110   6 11110
// H 00111   P 01111   X 10111   7 11111
//
// {
//   base32_string: '3RRURZ2HPRUSAROP',
//   result_values: [
//     220,  99,  72, 231,
//      71, 124, 105,  32,
//      69, 207
//   ],
//   result: <Buffer dc 63 48 e7 47 7c 69 20 45 cf>
// }
//
// 3 11011
// R 10001
// R 10001
// U 10100
// R 10001
// Z 11001
// 2 11010
// H 00111
// P 01111
// R 10001
// U 10100
// S 10010
// A 00000
// R 10001
// O 01110
// P 01111
//
// |-3-||-R-||-R-||-U-||-R-||-Z-||-2-||-H-||-P-||-R-||-U-||-S-||-A-||-R-||-O-||-P-|
// 11011100011000110100100011100111010001110111110001101001001000000100010111001111
// |------||------||------||------||------||------||------||------||------||------|
//    dc      63      48      e7      47      7c      69      20      45      cf
//
// "dc6348e7477c692045cf"
// "DC6348E7477C692045CF"
//
// ===
//
// 0xa5       = 0b1010_0101                               = 0b10100_101                              ==> 10100 10100                               ==> UU======
// 0xa5a5     = 0b1010_0101_1010_0101                     = 0b10100_10110_10010_1                    ==> 10100 10110 10010 10000                   ==> UWSQ====
// 0xa5a5a5   = 0b1010_0101_1010_0101_1010_0101           = 0b10100_10110_10010_11010_0101           ==> 10100 10110 10010 11010 01010             ==> UWS2K===
// 0xa5a5a5a5 = 0b1010_0101_1010_0101_1010_0101_1010_0101 = 0b10100_10110_10010_11010_01011_01001_01 ==> 10100 10110 10010 11010 01011 01001 01000 ==> UWS2LJI=
//
// "PRUSAROP"         ==> 7c 69 20 45 cf
// "PRUSAROPUU======" ==> 7c 69 20 45 cf a5
// "PRUSAROPUWSQ====" ==> 7c 69 20 45 cf a5 a5
// "PRUSAROPUWS2K===" ==> 7c 69 20 45 cf a5 a5 a5
// "PRUSAROPUWS2LJI=" ==> 7c 69 20 45 cf a5 a5 a5 a5

function buffer_equal(b1, b2) {
    if (b1.length !== b2.length) {
        return false;
    }
    for (let i = 0; i < b1.length; i++) {
        if (b1[i] !== b2[i]) {
            return false;
        }
    }
    return true;
}

export async function test() {
    const process = await import('node:process');

    let fail_count = 0;

    for (const [ base32_string, expected_bytes ] of [
        [ "",                 Uint8Array.from([]) ],
        [ "AA======",         Uint8Array.from([ 0 ]) ],
        [ "AE======",         Uint8Array.from([ 1 ]) ],
        [ "PRUSAROP",         Uint8Array.from([ 0x7c, 0x69, 0x20, 0x45, 0xcf ]) ],
        [ "PRUSAROPUU======", Uint8Array.from([ 0x7c, 0x69, 0x20, 0x45, 0xcf, 0xa5 ]) ],
        [ "PRUSAROPUWSQ====", Uint8Array.from([ 0x7c, 0x69, 0x20, 0x45, 0xcf, 0xa5, 0xa5 ]) ],
        [ "PRUSAROPUWS2K===", Uint8Array.from([ 0x7c, 0x69, 0x20, 0x45, 0xcf, 0xa5, 0xa5, 0xa5 ]) ],
        [ "PRUSAROPUWS2LJI=", Uint8Array.from([ 0x7c, 0x69, 0x20, 0x45, 0xcf, 0xa5, 0xa5, 0xa5, 0xa5 ]) ],
    ]) {
        const expected = Uint8Array.from(expected_bytes);

        let result;
        let error;
        try {
            result = decode_base32(base32_string);
        } catch (e) {
            error = e;
        }

        let verdict;
        if (!error && buffer_equal(expected, result)) {
            verdict = 'PASS';
        } else {
            fail_count++;
            verdict = 'FAIL';
        }

        console.log('----------------------------------------------------------------------');
        console.log('base32:  ', (base32_string ? base32_string : '""'));
        console.log('expected:', expected);
        console.log('result:  ', (error ? `ERROR: ${error.message}` : result), `[${verdict}]`);
    }

    console.log();
    if (fail_count === 0) {
        console.log('ALL BASE32 TESTS PASSED');
    } else {
        console.log(`** ${fail_count} base32 test${(fail_count !== 1) ? 's' : ''} failed`);
        process.exit(Math.min(127, fail_count));
    }
}
