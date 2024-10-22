#!/bin/bash

declare THIS_FILE=${BASH_SOURCE}
declare THIS_FILE_NAME=${THIS_FILE##*/}
declare THIS_FILE_DIR=${THIS_FILE%/*}

#########################################
# From rfc6238 Appendix B: Test Vectors #
#########################################
#   The test token shared secret uses the ASCII string value
#   "12345678901234567890".  With Time Step X = 30, and the Unix epoch as
#   the initial value to count time steps, where T0 = 0, the TOTP
#   algorithm will display the following values for specified modes and
#   timestamps.
#
#  +-------------+--------------+------------------+----------+--------+
#  |  Time (sec) |   UTC Time   | Value of T (hex) |   TOTP   |  Mode  |
#  +-------------+--------------+------------------+----------+--------+
#  |      59     |  1970-01-01  | 0000000000000001 | 94287082 |  SHA1  |
#  |             |   00:00:59   |                  |          |        |
#  |      59     |  1970-01-01  | 0000000000000001 | 46119246 | SHA256 |
#  |             |   00:00:59   |                  |          |        |
#  |      59     |  1970-01-01  | 0000000000000001 | 90693936 | SHA512 |
#  |             |   00:00:59   |                  |          |        |
#  |  1111111109 |  2005-03-18  | 00000000023523EC | 07081804 |  SHA1  |
#  |             |   01:58:29   |                  |          |        |
#  |  1111111109 |  2005-03-18  | 00000000023523EC | 68084774 | SHA256 |
#  |             |   01:58:29   |                  |          |        |
#  |  1111111109 |  2005-03-18  | 00000000023523EC | 25091201 | SHA512 |
#  |             |   01:58:29   |                  |          |        |
#  |  1111111111 |  2005-03-18  | 00000000023523ED | 14050471 |  SHA1  |
#  |             |   01:58:31   |                  |          |        |
#  |  1111111111 |  2005-03-18  | 00000000023523ED | 67062674 | SHA256 |
#  |             |   01:58:31   |                  |          |        |
#  |  1111111111 |  2005-03-18  | 00000000023523ED | 99943326 | SHA512 |
#  |             |   01:58:31   |                  |          |        |
#  |  1234567890 |  2009-02-13  | 000000000273EF07 | 89005924 |  SHA1  |
#  |             |   23:31:30   |                  |          |        |
#  |  1234567890 |  2009-02-13  | 000000000273EF07 | 91819424 | SHA256 |
#  |             |   23:31:30   |                  |          |        |
#  |  1234567890 |  2009-02-13  | 000000000273EF07 | 93441116 | SHA512 |
#  |             |   23:31:30   |                  |          |        |
#  |  2000000000 |  2033-05-18  | 0000000003F940AA | 69279037 |  SHA1  |
#  |             |   03:33:20   |                  |          |        |
#  |  2000000000 |  2033-05-18  | 0000000003F940AA | 90698825 | SHA256 |
#  |             |   03:33:20   |                  |          |        |
#  |  2000000000 |  2033-05-18  | 0000000003F940AA | 38618901 | SHA512 |
#  |             |   03:33:20   |                  |          |        |
#  | 20000000000 |  2603-10-11  | 0000000027BC86AA | 65353130 |  SHA1  |
#  |             |   11:33:20   |                  |          |        |
#  | 20000000000 |  2603-10-11  | 0000000027BC86AA | 77737706 | SHA256 |
#  |             |   11:33:20   |                  |          |        |
#  | 20000000000 |  2603-10-11  | 0000000027BC86AA | 47863826 | SHA512 |
#  |             |   11:33:20   |                  |          |        |
#  +-------------+--------------+------------------+----------+--------+

declare fail_count=0

function test() {  # -- {config} {time} {expected}
    declare config=$1 time=$2 expected=$3
    declare result=$("${THIS_FILE_DIR}/index.js" "${config}" "${time}")
    declare verdict
    if [[ "${result}" == "${expected}" ]]; then
        verdict=PASS
    else
        (( fail_count++ ))
        verdict=FAIL
    fi
    echo "----------------------------------------------------------------------"
    echo "config:   ${config}"
    echo "time:     ${time}"
    echo "expected: ${expected}"
    echo "result:   ${result} [${verdict}]"
}

# NOTE: rfc6238 Appendix B states that the secret is "12345678901234567890", but that seems to be true only for sha1
declare sha1_secret=12345678901234567890
declare sha256_secret=12345678901234567890123456789012
declare sha512_secret=1234567890123456789012345678901234567890123456789012345678901234

test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha1",   "secret": "'"${sha1_secret}"'"   }' 59          94287082
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha256", "secret": "'"${sha256_secret}"'" }' 59          46119246
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha512", "secret": "'"${sha512_secret}"'" }' 59          90693936
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha1",   "secret": "'"${sha1_secret}"'"   }' 1111111109  07081804
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha256", "secret": "'"${sha256_secret}"'" }' 1111111109  68084774
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha512", "secret": "'"${sha512_secret}"'" }' 1111111109  25091201
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha1",   "secret": "'"${sha1_secret}"'"   }' 1111111111  14050471
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha256", "secret": "'"${sha256_secret}"'" }' 1111111111  67062674
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha512", "secret": "'"${sha512_secret}"'" }' 1111111111  99943326
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha1",   "secret": "'"${sha1_secret}"'"   }' 1234567890  89005924
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha256", "secret": "'"${sha256_secret}"'" }' 1234567890  91819424
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha512", "secret": "'"${sha512_secret}"'" }' 1234567890  93441116
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha1",   "secret": "'"${sha1_secret}"'"   }' 2000000000  69279037
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha256", "secret": "'"${sha256_secret}"'" }' 2000000000  90698825
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha512", "secret": "'"${sha512_secret}"'" }' 2000000000  38618901
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha1",   "secret": "'"${sha1_secret}"'"   }' 20000000000 65353130
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha256", "secret": "'"${sha256_secret}"'" }' 20000000000 77737706
test '{ "t0": 0, "period": 30, "digits": 8, "algorithm": "sha512", "secret": "'"${sha512_secret}"'" }' 20000000000 47863826

echo
if (( fail_count == 0 )); then
    echo "ALL TESTS PASSED"
else
    echo "** ${fail_count} test$( (( fail_count != 1 )) && echo 's' ) failed"
    exit 1
fi
