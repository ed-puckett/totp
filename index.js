#! /usr/bin/env node

// See:
// https://datatracker.ietf.org/doc/html/rfc6238 "TOTP: Time-Based One-Time Password Algorithm"
// https://datatracker.ietf.org/doc/html/rfc4226 "HOTP: An HMAC-Based One-Time Password Algorithm"
// https://datatracker.ietf.org/doc/html/rfc2104 "HMAC: Keyed-Hashing for Message Authentication"

import { readFileSync } from 'node:fs';
import { Buffer       } from 'node:buffer';
import { createHmac   } from 'node:crypto';


// note: process.argv[0] is the path to the node executable
//       process.argv[1] is the path to this program file

function get_program_name() {
    const program_path = process.argv[1];
    return program_path.slice(program_path.lastIndexOf('/') + 1);
}

const args = process.argv.slice(2);

const verbose_switch = '-v';
const verbose = args[0] === verbose_switch;
if (verbose) {
    args.shift();  // remove verbose_switch
}


function seconds_from_date_time_units(since_time_zero) {  // note: date time units = milliseconds
    return Math.floor(since_time_zero / 1000);
}


const config_spec_file_specifier = '@';
const time_argument_now          = 'now';


const max_t0_representation = '2000-01-01T00:00:00Z';
const max_t0 = seconds_from_date_time_units(new Date(max_t0_representation).getTime());

const valid_digits = [ 6, 7, 8 ];

const valid_algorithm = [ 'sha1', 'sha256', 'sha512' ];

const config_definition = {
    t0: {
        default_value: 0,
        description:   `an integer from 0 to ${max_t0}; (${max_t0} represents ${max_t0_representation})`,
        is_valid:      value => (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max_t0),
    },
    period: {
        default_value: 30,
        description:   `a positive integer`,
        is_valid:      value => (typeof value === 'number' && Number.isInteger(value) && value > 0),
    },
    digits: {
        default_value: 6,
        description:   `one of: ${valid_digits.join(', ')}`,
        is_valid:      value => (typeof value === 'number' && valid_digits.includes(value)),
    },
    algorithm: {
        default_value: 'sha1',
        description:   `one of: "${valid_algorithm.join('", "')}"`,
        is_valid:      value => (typeof value === 'string' && valid_algorithm.includes(value)),
    },
    secret: {
        // must be specified; no default_value
        description:   `a non-empty string`,
        is_valid:      value => (typeof value === 'string' && value.length > 0),
    }
};

function show_usage(message, output=console.error) {
    if (message) {
        output(`** ${message}\n`);
    }
    output(`Usage: ${get_program_name()} [ ${verbose_switch} ] {config} [ {time} ... ]`);
    output();
    output(`${verbose_switch} turns on verbose mode`);
    output();
    output(`{config} must be a string representing valid JSON with the following keys:`);
    const max_config_key_length = Math.max( ...Object.keys(config_definition).map(key => key.length) );
    for (const key in config_definition) {
        const definition = config_definition[key];
        const default_value = definition.default_value;
        const required = (typeof default_value === 'undefined');
        const default_value_display = (typeof default_value === 'string') ? `"${default_value}"` : default_value;
        const spacing = ' '.repeat(max_config_key_length - key.length);
        if (required) {
            output(`    "${key}": ${spacing}(required) ${definition.description}`);
        } else {
            output(`    "${key}": ${spacing}(default: ${default_value_display}) ${definition.description}`);
        }
    }
    output();
    output(`(Please refer to rfc6238 for the exact meaning of the configuration parameters.)`);
    output();
    output(`If the {config} argument starts with "${config_spec_file_specifier}", then the remainder of the argument is`);
    output(`assumed to be a path to a file that contains the JSON for the configuration.`);
    output();
    output(`If no {time} arguments are given, then the TOTP for the current time is output.`);
    output(`Otherwise, a TOTP value will be output for each {time} argument given.`);
    output();
    output(`Each {time} argument must be either an integer representing the elapsed time in`);
    output(`seconds since the beginning of the Unix epoch (1970-01-01T00:00:00Z), or the`);
    output(`string "${time_argument_now}" to specify the current time.`);
    process.exit(1);
}

function get_config(config_spec) {
    try {

        const config_json = (config_spec?.[0] === config_spec_file_specifier)
              ? readFileSync(config_spec.slice(config_spec_file_specifier.length), { encoding: 'utf8' })
              : config_spec;

        const config = JSON.parse(config_json);

        const valid_keys = Object.keys(config_definition);
        for (const key in config) {
            if (!(key in config_definition)) {
                throw new Error(`extraneous key "${key}" is not one of: "${Object.keys(config_definition).join('", "')}"`);
            }
        }
        for (const key in config_definition) {
            const definition = config_definition[key];
            if (!(key in config)) {
                default_value = definition.default_value;
                if (typeof default_value === 'undefined') {
                    throw new Error(`"${key}" must be specified and must be ${definition.description}`);
                }
                config[key] = default_value;
            } else {
                if (!definition.is_valid(config[key])) {
                    throw new Error(`"${key}" must be ${definition.description}`);
                }
            }
        }
        return config;

    } catch (error) {
        show_usage(`bad config: ${error.message}`);
    }
}

function get_time_based_counter_string(config, optional_time) {  // optional_time defaults to seconds_from_date_time_units(Date.now())
    const time = (optional_time === time_argument_now || optional_time === null || typeof optional_time === 'undefined')
          ? seconds_from_date_time_units(Date.now())
          : optional_time;
    const periods = Math.floor((time - config.t0) / config.period);
    const counter_string = periods.toString(16).toUpperCase().padStart(16, '0');
    if (verbose) {
        console.log({ config, optional_time, time, periods, counter_string });
    }
    return counter_string;
}

function buffer_from_counter_hex_string(counter_hex_string) {
    if (counter_hex_string.length <= 0 || counter_hex_string.length % 2 !== 0) {
        throw new Error('unexpected: counter_hex_string does not contain an positive even number of characters');
    }
    const bytes = [];
    for (let i = 0; i < counter_hex_string.length; i += 2) {
        bytes.push(16*parseInt(counter_hex_string[i], 16) + parseInt(counter_hex_string[i+1], 16));
    }
    return Buffer.from(bytes);
}

function remove_hex_digit_msb(hex_digit) {
    return '0123456701234567'[parseInt(hex_digit, 16)];
}

function truncate(config, hex_string) {
    if (hex_string.length <= 0 || hex_string.length % 2 !== 0) {
        throw new Error('unexpected: hex_string does not contain an positive even number of characters');
    }
    // truncation algorithm described in rfc4226
    const offset = parseInt(hex_string[hex_string.length-1], 16);  // least significant (last) 4-bits used as offset
    // note that we are using a string of hex digits instead of an array
    // of bytes, so we must double the offsets
    const result_hex_digits = [];
    result_hex_digits.push(remove_hex_digit_msb(hex_string[2*offset]));  // special case for most-significant byte
    result_hex_digits.push(hex_string[2*offset + 1]);
    result_hex_digits.push(hex_string[2*offset + 2]);  // begin next byte
    result_hex_digits.push(hex_string[2*offset + 3]);
    result_hex_digits.push(hex_string[2*offset + 4]);  // begin next byte
    result_hex_digits.push(hex_string[2*offset + 5]);
    result_hex_digits.push(hex_string[2*offset + 6]);  // begin next byte
    result_hex_digits.push(hex_string[2*offset + 7]);

    const result_hex = result_hex_digits.join('');
    const result = parseInt(result_hex, 16);
    const result_decimal_string = result.toString(10).padStart(config.digits, '0');  // note: pad with leading 0s
    const result_digits = result_decimal_string.slice(-config.digits);  // essentially mod 10^config.digits
    if (verbose) {
        console.log({ hex_string, result_hex_digits, result_hex, result, result_decimal_string, result_digits });
    }
    return result_digits;
}

function generate_totp(config, optional_time) {  // optional_time defaults to seconds_from_date_time_units(Date.now())
    const counter = get_time_based_counter_string(config, optional_time);
    const hmac = createHmac(config.algorithm, config.secret);
    hmac.update(buffer_from_counter_hex_string(counter));
    const digest = hmac.digest('hex');
    const totp = truncate(config, digest);
    if (verbose) {
        console.log({ digest, totp });
    }
    return totp
}


// === main ===

if (args.length < 1) {
    show_usage();
}

const config = get_config(args[0]);

if (args.length === 1) {
    console.log(generate_totp(config));
} else {
    for (const arg of args.slice(1)) {
        let time = arg;
        let invalid = false;
        if (time !== time_argument_now) {
            time = +time;
            if (Number.isNaN(time) || typeof time !== 'number' || !Number.isInteger(time) || time < 0) {
                invalid = true;
            }
        }
        if (invalid) {
            console.error(`{time} must be "${time_argument_now}" or a non-negative integer, skipping:`, arg);
        } else {
            console.log(generate_totp(config, time));
        }
    }
}
