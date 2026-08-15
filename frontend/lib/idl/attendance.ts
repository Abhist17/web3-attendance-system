/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/attendance.json`.
 */
export type Attendance = {
  "address": "6p26MgeSFbR7UFdrsUU62sbNH8Zh1bY59ob8NmfdibBc",
  "metadata": {
    "name": "attendance",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createLecture",
      "discriminator": [
        168,
        28,
        254,
        71,
        205,
        206,
        173,
        224
      ],
      "accounts": [
        {
          "name": "professor",
          "writable": true,
          "signer": true
        },
        {
          "name": "lecture",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  101,
                  99,
                  116,
                  117,
                  114,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "lectureId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lectureId",
          "type": "string"
        },
        {
          "name": "subject",
          "type": "string"
        },
        {
          "name": "startTime",
          "type": "i64"
        },
        {
          "name": "attendanceDeadline",
          "type": "i64"
        }
      ]
    },
    {
      "name": "markAttendance",
      "docs": [
        "Marks attendance for the signing student.",
        "",
        "Duplicate submissions are impossible: `attendance_record` is created with",
        "`init`, so a second call for the same (student, lecture) pair fails at the",
        "account-creation step before this handler ever runs."
      ],
      "discriminator": [
        199,
        12,
        21,
        247,
        212,
        114,
        194,
        238
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "attendanceRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  116,
                  116,
                  101,
                  110,
                  100,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "arg",
                "path": "lectureId"
              }
            ]
          }
        },
        {
          "name": "lecture",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  101,
                  99,
                  116,
                  117,
                  114,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "lectureId"
              }
            ]
          }
        },
        {
          "name": "studentProfile",
          "docs": [
            "Proves the signer is a registered student. Deriving the PDA from the",
            "signer's key already binds the two, and the explicit constraint makes the",
            "failure mode readable if the stored wallet ever diverges."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  117,
                  100,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lectureId",
          "type": "string"
        }
      ]
    },
    {
      "name": "registerStudent",
      "discriminator": [
        108,
        126,
        219,
        150,
        153,
        225,
        102,
        92
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "studentProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  117,
                  100,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "studentId",
          "type": "string"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "department",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "attendanceRecord",
      "discriminator": [
        207,
        57,
        71,
        145,
        143,
        128,
        238,
        179
      ]
    },
    {
      "name": "lecture",
      "discriminator": [
        39,
        26,
        252,
        71,
        24,
        228,
        231,
        221
      ]
    },
    {
      "name": "studentProfile",
      "discriminator": [
        185,
        172,
        160,
        26,
        178,
        113,
        216,
        235
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "lectureNotStarted",
      "msg": "Lecture has not started yet"
    },
    {
      "code": 6001,
      "name": "attendanceWindowClosed",
      "msg": "Attendance window is closed"
    },
    {
      "code": 6002,
      "name": "walletMismatch",
      "msg": "Wallet does not match registered student"
    },
    {
      "code": 6003,
      "name": "emptyIdentifier",
      "msg": "Identifier must not be empty"
    },
    {
      "code": 6004,
      "name": "nameTooLong",
      "msg": "Name too long (max 64 chars)"
    },
    {
      "code": 6005,
      "name": "deptTooLong",
      "msg": "Department name too long (max 64 chars)"
    },
    {
      "code": 6006,
      "name": "subjectTooLong",
      "msg": "Subject too long (max 100 chars)"
    },
    {
      "code": 6007,
      "name": "studentIdTooLong",
      "msg": "Student ID too long (max 32 chars)"
    },
    {
      "code": 6008,
      "name": "lectureIdTooLong",
      "msg": "Lecture ID too long (max 32 chars)"
    },
    {
      "code": 6009,
      "name": "invalidDeadline",
      "msg": "Deadline must be after start time"
    }
  ],
  "types": [
    {
      "name": "attendanceRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "student",
            "type": "pubkey"
          },
          {
            "name": "studentProfile",
            "type": "pubkey"
          },
          {
            "name": "lectureId",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "lecture",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lectureId",
            "type": "string"
          },
          {
            "name": "professor",
            "type": "pubkey"
          },
          {
            "name": "subject",
            "type": "string"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "attendanceDeadline",
            "type": "i64"
          },
          {
            "name": "attendanceCount",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "studentProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "studentId",
            "type": "string"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "department",
            "type": "string"
          },
          {
            "name": "registeredAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
