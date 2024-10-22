# TOTP - A Time-based One-Time Password Implementation

This work is based on rfc6238.  See LINKS below.

## INSTALL

Install nodejs.  Then see USAGE below to run.

* Tested on Debian Linux 12
* Works with node v23.0.0
* Works with deno 2.0.2 (stable, release, x86_64-unknown-linux-gnu)

## USAGE

* ==> ./index.js

```
    Usage: index.js [ -v ] {config} [ {time} ... ]

    -v turns on verbose mode

    {config} must be a string representing valid JSON with the following keys:
        "t0":        (default: 0) an integer from 0 to 946684800; (946684800 represents 2000-01-01T00:00:00Z)
        "period":    (default: 30) a positive integer
        "digits":    (default: 6) one of: 6, 7, 8
        "algorithm": (default: "sha1") one of: "sha1", "sha256", "sha512"
        "secret":    (required) a non-empty string

    (Please refer to rfc6238 for the exact meaning of the configuration parameters.)

    If the {config} argument starts with "@", then the remainder of the argument is
    assumed to be a path to a file that contains the JSON for the configuration.

    If no {time} arguments are given, then the TOTP for the current time is output.
    Otherwise, a TOTP value will be output for each {time} argument given.

    Each {time} argument must be either an integer representing the elapsed time in
    seconds since the beginning of the Unix epoch (1970-01-01T00:00:00Z), or the
    string "now" to specify the current time.
```

* ==> cat ./example-config.json

```
    {
        "t0":        0,
        "period":    30,
        "digits":    8,
        "algorithm": "sha1",
        "secret":    "12345678901234567890"
    }
```

* ==> ./index.js @example-config.json 59

```
    94287082
````

* ==> ./index.js '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha1", "secret": "12345678901234567890" }' 59

```
    94287082
````

* ==> ./index.js '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha1", "secret": "12345678901234567890" }'  # now

```
    13083528
````

## SECURITY

You must protect your configuration files.
There will be a configuration file for each site.
I suggest you create a configuration files in a well-controlled location and lock down permissions to them, e.g., chmod 400.

## LINKS

* [rfc6238](https://datatracker.ietf.org/doc/html/rfc6238) TOTP: Time-Based One-Time Password Algorithm
* [rfc4226](https://datatracker.ietf.org/doc/html/rfc4226) HOTP: An HMAC-Based One-Time Password Algorithm
* [rfc2104](https://datatracker.ietf.org/doc/html/rfc2104) HMAC: Keyed-Hashing for Message Authentication
