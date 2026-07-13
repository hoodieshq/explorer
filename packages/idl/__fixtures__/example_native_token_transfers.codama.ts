// GENERATED literal Codama root — rootNodeFromAnchor over example_native_token_transfers.json with the
// program address injected (legacy IDLs carry none). The as-const literal drives getDecodedData inference.
export const exampleNativeTokenTransfersIdl = {
    "additionalPrograms": [],
    "kind": "rootNode",
    "program": {
        "accounts": [
            {
                "data": {
                    "fields": [
                        {
                            "defaultValue": {
                                "data": "9b0caae01efacc82",
                                "encoding": "base16",
                                "kind": "bytesValueNode"
                            },
                            "defaultValueStrategy": "omitted",
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "discriminator",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 8,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "bump",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [
                                "Owner of the program."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "owner",
                            "type": {
                                "kind": "publicKeyTypeNode"
                            }
                        },
                        {
                            "docs": [
                                "Pending next owner (before claiming ownership)."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "pendingOwner",
                            "type": {
                                "fixed": false,
                                "item": {
                                    "kind": "publicKeyTypeNode"
                                },
                                "kind": "optionTypeNode",
                                "prefix": {
                                    "endian": "le",
                                    "format": "u8",
                                    "kind": "numberTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [
                                "Mint address of the token managed by this program."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "mint",
                            "type": {
                                "kind": "publicKeyTypeNode"
                            }
                        },
                        {
                            "docs": [
                                "Address of the token program (token or token22). This could always be queried",
                                "from the [`mint`] account's owner, but storing it here avoids an indirection",
                                "on the client side."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "tokenProgram",
                            "type": {
                                "kind": "publicKeyTypeNode"
                            }
                        },
                        {
                            "docs": [
                                "The mode that this program is running in. This is used to determine",
                                "whether the program is burning tokens or locking tokens."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "mode",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "mode"
                            }
                        },
                        {
                            "docs": [
                                "The chain id of the chain that this program is running on. We don't",
                                "hardcode this so that the program is deployable on any potential SVM",
                                "forks."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "chainId",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "chainId"
                            }
                        },
                        {
                            "docs": [
                                "The next transceiver id to use when registering an transceiver."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "nextTransceiverId",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [
                                "The number of transceivers that must attest to a transfer before it is",
                                "accepted."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "threshold",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [
                                "Bitmap of enabled transceivers.",
                                "The maximum number of transceivers is equal to [`Bitmap::BITS`]."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "enabledTransceivers",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "bitmap"
                            }
                        },
                        {
                            "docs": [
                                "Pause the program. This is useful for upgrades and other maintenance."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "paused",
                            "type": {
                                "kind": "booleanTypeNode",
                                "size": {
                                    "endian": "le",
                                    "format": "u8",
                                    "kind": "numberTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [
                                "The custody account that holds tokens in locking mode."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "custody",
                            "type": {
                                "kind": "publicKeyTypeNode"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                },
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "accountNode",
                "name": "config"
            },
            {
                "data": {
                    "fields": [
                        {
                            "defaultValue": {
                                "data": "703e3021986fe715",
                                "encoding": "base16",
                                "kind": "bytesValueNode"
                            },
                            "defaultValueStrategy": "omitted",
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "discriminator",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 8,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "bump",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "address",
                            "type": {
                                "kind": "publicKeyTypeNode"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                },
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "accountNode",
                "name": "lUT",
                "size": 41
            },
            {
                "data": {
                    "fields": [
                        {
                            "defaultValue": {
                                "data": "44adb4606cb61b52",
                                "encoding": "base16",
                                "kind": "bytesValueNode"
                            },
                            "defaultValueStrategy": "omitted",
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "discriminator",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 8,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "bump",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "address",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 32,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "tokenDecimals",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                },
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [
                    "A peer on another chain. Stored in a PDA seeded by the chain id."
                ],
                "kind": "accountNode",
                "name": "nttManagerPeer",
                "size": 42
            },
            {
                "data": {
                    "fields": [
                        {
                            "defaultValue": {
                                "data": "2673de65ab0cf2a9",
                                "encoding": "base16",
                                "kind": "bytesValueNode"
                            },
                            "defaultValueStrategy": "omitted",
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "discriminator",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 8,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "bump",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "pendingAuthority",
                            "type": {
                                "kind": "publicKeyTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "rentPayer",
                            "type": {
                                "kind": "publicKeyTypeNode"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                },
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "accountNode",
                "name": "pendingTokenAuthority",
                "size": 73
            },
            {
                "data": {
                    "fields": [
                        {
                            "defaultValue": {
                                "data": "ed8dcc67bb7a395c",
                                "encoding": "base16",
                                "kind": "bytesValueNode"
                            },
                            "defaultValueStrategy": "omitted",
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "discriminator",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 8,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "init",
                            "type": {
                                "kind": "booleanTypeNode",
                                "size": {
                                    "endian": "le",
                                    "format": "u8",
                                    "kind": "numberTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "bump",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "amount",
                            "type": {
                                "endian": "le",
                                "format": "u64",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "recipientAddress",
                            "type": {
                                "kind": "publicKeyTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "votes",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "bitmap"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "releaseStatus",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "releaseStatus"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                },
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "accountNode",
                "name": "inboxItem"
            },
            {
                "data": {
                    "fields": [
                        {
                            "defaultValue": {
                                "data": "efd0e8ca4a07ebfc",
                                "encoding": "base16",
                                "kind": "bytesValueNode"
                            },
                            "defaultValueStrategy": "omitted",
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "discriminator",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 8,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "bump",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "rateLimit",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "rateLimitState"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                },
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [
                    "Inbound rate limit per chain.",
                    "SECURITY: must check the PDA (since there are multiple PDAs, namely one for each chain.)"
                ],
                "kind": "accountNode",
                "name": "inboxRateLimit",
                "size": 33
            },
            {
                "data": {
                    "fields": [
                        {
                            "defaultValue": {
                                "data": "081a7e4479ccbcc6",
                                "encoding": "base16",
                                "kind": "bytesValueNode"
                            },
                            "defaultValueStrategy": "omitted",
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "discriminator",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 8,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "amount",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "trimmedAmount"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "sender",
                            "type": {
                                "kind": "publicKeyTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "recipientChain",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "chainId"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "recipientNttManager",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 32,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "recipientAddress",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 32,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "releaseTimestamp",
                            "type": {
                                "endian": "le",
                                "format": "i64",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "released",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "bitmap"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                },
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "accountNode",
                "name": "outboxItem",
                "size": 139
            },
            {
                "data": {
                    "fields": [
                        {
                            "defaultValue": {
                                "data": "5a3600482fba1b58",
                                "encoding": "base16",
                                "kind": "bytesValueNode"
                            },
                            "defaultValueStrategy": "omitted",
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "discriminator",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 8,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "rateLimit",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "rateLimitState"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                },
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "accountNode",
                "name": "outboxRateLimit",
                "size": 32
            },
            {
                "data": {
                    "fields": [
                        {
                            "defaultValue": {
                                "data": "e768b660a82bd814",
                                "encoding": "base16",
                                "kind": "bytesValueNode"
                            },
                            "defaultValueStrategy": "omitted",
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "discriminator",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 8,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "bump",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "id",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "transceiverAddress",
                            "type": {
                                "kind": "publicKeyTypeNode"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                },
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "accountNode",
                "name": "registeredTransceiver",
                "size": 42
            },
            {
                "data": {
                    "fields": [
                        {
                            "defaultValue": {
                                "data": "b2300746026c55c9",
                                "encoding": "base16",
                                "kind": "bytesValueNode"
                            },
                            "defaultValueStrategy": "omitted",
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "discriminator",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 8,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "bump",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "address",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 32,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                },
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [
                    "A peer on another chain. Stored in a PDA seeded by the chain id."
                ],
                "kind": "accountNode",
                "name": "transceiverPeer",
                "size": 41
            },
            {
                "data": {
                    "fields": [
                        {
                            "defaultValue": {
                                "data": "2c96d2d0824723ae",
                                "encoding": "base16",
                                "kind": "bytesValueNode"
                            },
                            "defaultValueStrategy": "omitted",
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "discriminator",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 8,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [
                                "The current guardian set index, used to decide which signature sets to accept."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "guardianSetIndex",
                            "type": {
                                "endian": "le",
                                "format": "u32",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [
                                "Lamports in the collection account"
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "lastLamports",
                            "type": {
                                "endian": "le",
                                "format": "u64",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [
                                "Bridge configuration, which is set once upon initialization."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "config",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "bridgeConfig"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                },
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "accountNode",
                "name": "bridgeData",
                "size": 32
            }
        ],
        "definedTypes": [
            {
                "docs": [],
                "kind": "definedTypeNode",
                "name": "bitmap",
                "type": {
                    "fields": [
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "map",
                            "type": {
                                "endian": "le",
                                "format": "u128",
                                "kind": "numberTypeNode"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                }
            },
            {
                "docs": [],
                "kind": "definedTypeNode",
                "name": "releaseInboundArgs",
                "type": {
                    "fields": [
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "revertWhenNotReady",
                            "type": {
                                "kind": "booleanTypeNode",
                                "size": {
                                    "endian": "le",
                                    "format": "u8",
                                    "kind": "numberTypeNode"
                                }
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                }
            },
            {
                "docs": [],
                "kind": "definedTypeNode",
                "name": "transferArgs",
                "type": {
                    "fields": [
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "amount",
                            "type": {
                                "endian": "le",
                                "format": "u64",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "recipientChain",
                            "type": {
                                "kind": "definedTypeLinkNode",
                                "name": "chainId"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "recipientAddress",
                            "type": {
                                "kind": "fixedSizeTypeNode",
                                "size": 32,
                                "type": {
                                    "kind": "bytesTypeNode"
                                }
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "shouldQueue",
                            "type": {
                                "kind": "booleanTypeNode",
                                "size": {
                                    "endian": "le",
                                    "format": "u8",
                                    "kind": "numberTypeNode"
                                }
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                }
            },
            {
                "docs": [
                    "The status of an InboxItem. This determines whether the tokens are minted/unlocked to the recipient. As",
                    "such, this must be used as a state machine that moves forward in a linear manner. A state",
                    "should never \"move backward\" to a previous state (e.g. should never move from `Released` to",
                    "`ReleaseAfter`)."
                ],
                "kind": "definedTypeNode",
                "name": "releaseStatus",
                "type": {
                    "kind": "enumTypeNode",
                    "size": {
                        "endian": "le",
                        "format": "u8",
                        "kind": "numberTypeNode"
                    },
                    "variants": [
                        {
                            "kind": "enumEmptyVariantTypeNode",
                            "name": "notApproved"
                        },
                        {
                            "kind": "enumTupleVariantTypeNode",
                            "name": "releaseAfter",
                            "tuple": {
                                "items": [
                                    {
                                        "endian": "le",
                                        "format": "i64",
                                        "kind": "numberTypeNode"
                                    }
                                ],
                                "kind": "tupleTypeNode"
                            }
                        },
                        {
                            "kind": "enumEmptyVariantTypeNode",
                            "name": "released"
                        }
                    ]
                }
            },
            {
                "docs": [],
                "kind": "definedTypeNode",
                "name": "rateLimitState",
                "type": {
                    "fields": [
                        {
                            "docs": [
                                "The maximum capacity of the rate limiter."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "limit",
                            "type": {
                                "endian": "le",
                                "format": "u64",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [
                                "The capacity of the rate limiter at `last_tx_timestamp`.",
                                "The actual current capacity is calculated in `capacity_at`, by",
                                "accounting for the time that has passed since `last_tx_timestamp` and",
                                "the refill rate."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "capacityAtLastTx",
                            "type": {
                                "endian": "le",
                                "format": "u64",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [
                                "The timestamp of the last transaction that counted towards the current",
                                "capacity. Transactions that exceeded the capacity do not count, they are",
                                "just delayed."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "lastTxTimestamp",
                            "type": {
                                "endian": "le",
                                "format": "i64",
                                "kind": "numberTypeNode"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                }
            },
            {
                "docs": [],
                "kind": "definedTypeNode",
                "name": "chainId",
                "type": {
                    "fields": [
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "id",
                            "type": {
                                "endian": "le",
                                "format": "u16",
                                "kind": "numberTypeNode"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                }
            },
            {
                "docs": [],
                "kind": "definedTypeNode",
                "name": "mode",
                "type": {
                    "kind": "enumTypeNode",
                    "size": {
                        "endian": "le",
                        "format": "u8",
                        "kind": "numberTypeNode"
                    },
                    "variants": [
                        {
                            "kind": "enumEmptyVariantTypeNode",
                            "name": "locking"
                        },
                        {
                            "kind": "enumEmptyVariantTypeNode",
                            "name": "burning"
                        }
                    ]
                }
            },
            {
                "docs": [],
                "kind": "definedTypeNode",
                "name": "trimmedAmount",
                "type": {
                    "fields": [
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "amount",
                            "type": {
                                "endian": "le",
                                "format": "u64",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [],
                            "kind": "structFieldTypeNode",
                            "name": "decimals",
                            "type": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                }
            },
            {
                "docs": [],
                "kind": "definedTypeNode",
                "name": "bridgeConfig",
                "type": {
                    "fields": [
                        {
                            "docs": [
                                "Period for how long a guardian set is valid after it has been replaced by a new one.  This",
                                "guarantees that VAAs issued by that set can still be submitted for a certain period.  In",
                                "this period we still trust the old guardian set."
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "guardianSetExpirationTime",
                            "type": {
                                "endian": "le",
                                "format": "u32",
                                "kind": "numberTypeNode"
                            }
                        },
                        {
                            "docs": [
                                "Amount of lamports that needs to be paid to the protocol to post a message"
                            ],
                            "kind": "structFieldTypeNode",
                            "name": "fee",
                            "type": {
                                "endian": "le",
                                "format": "u64",
                                "kind": "numberTypeNode"
                            }
                        }
                    ],
                    "kind": "structTypeNode"
                }
            }
        ],
        "docs": [],
        "errors": [
            {
                "code": 6000,
                "docs": [
                    "CantReleaseYet: CantReleaseYet"
                ],
                "kind": "errorNode",
                "message": "CantReleaseYet",
                "name": "cantReleaseYet"
            },
            {
                "code": 6001,
                "docs": [
                    "InvalidPendingOwner: InvalidPendingOwner"
                ],
                "kind": "errorNode",
                "message": "InvalidPendingOwner",
                "name": "invalidPendingOwner"
            },
            {
                "code": 6002,
                "docs": [
                    "InvalidChainId: InvalidChainId"
                ],
                "kind": "errorNode",
                "message": "InvalidChainId",
                "name": "invalidChainId"
            },
            {
                "code": 6003,
                "docs": [
                    "InvalidRecipientAddress: InvalidRecipientAddress"
                ],
                "kind": "errorNode",
                "message": "InvalidRecipientAddress",
                "name": "invalidRecipientAddress"
            },
            {
                "code": 6004,
                "docs": [
                    "InvalidTransceiverPeer: InvalidTransceiverPeer"
                ],
                "kind": "errorNode",
                "message": "InvalidTransceiverPeer",
                "name": "invalidTransceiverPeer"
            },
            {
                "code": 6005,
                "docs": [
                    "InvalidNttManagerPeer: InvalidNttManagerPeer"
                ],
                "kind": "errorNode",
                "message": "InvalidNttManagerPeer",
                "name": "invalidNttManagerPeer"
            },
            {
                "code": 6006,
                "docs": [
                    "InvalidRecipientNttManager: InvalidRecipientNttManager"
                ],
                "kind": "errorNode",
                "message": "InvalidRecipientNttManager",
                "name": "invalidRecipientNttManager"
            },
            {
                "code": 6007,
                "docs": [
                    "TransferAlreadyRedeemed: TransferAlreadyRedeemed"
                ],
                "kind": "errorNode",
                "message": "TransferAlreadyRedeemed",
                "name": "transferAlreadyRedeemed"
            },
            {
                "code": 6008,
                "docs": [
                    "TransferCannotBeRedeemed: TransferCannotBeRedeemed"
                ],
                "kind": "errorNode",
                "message": "TransferCannotBeRedeemed",
                "name": "transferCannotBeRedeemed"
            },
            {
                "code": 6009,
                "docs": [
                    "TransferNotApproved: TransferNotApproved"
                ],
                "kind": "errorNode",
                "message": "TransferNotApproved",
                "name": "transferNotApproved"
            },
            {
                "code": 6010,
                "docs": [
                    "MessageAlreadySent: MessageAlreadySent"
                ],
                "kind": "errorNode",
                "message": "MessageAlreadySent",
                "name": "messageAlreadySent"
            },
            {
                "code": 6011,
                "docs": [
                    "InvalidMode: InvalidMode"
                ],
                "kind": "errorNode",
                "message": "InvalidMode",
                "name": "invalidMode"
            },
            {
                "code": 6012,
                "docs": [
                    "InvalidMintAuthority: InvalidMintAuthority"
                ],
                "kind": "errorNode",
                "message": "InvalidMintAuthority",
                "name": "invalidMintAuthority"
            },
            {
                "code": 6013,
                "docs": [
                    "TransferExceedsRateLimit: TransferExceedsRateLimit"
                ],
                "kind": "errorNode",
                "message": "TransferExceedsRateLimit",
                "name": "transferExceedsRateLimit"
            },
            {
                "code": 6014,
                "docs": [
                    "Paused: Paused"
                ],
                "kind": "errorNode",
                "message": "Paused",
                "name": "paused"
            },
            {
                "code": 6015,
                "docs": [
                    "DisabledTransceiver: DisabledTransceiver"
                ],
                "kind": "errorNode",
                "message": "DisabledTransceiver",
                "name": "disabledTransceiver"
            },
            {
                "code": 6016,
                "docs": [
                    "InvalidDeployer: InvalidDeployer"
                ],
                "kind": "errorNode",
                "message": "InvalidDeployer",
                "name": "invalidDeployer"
            },
            {
                "code": 6017,
                "docs": [
                    "BadAmountAfterTransfer: BadAmountAfterTransfer"
                ],
                "kind": "errorNode",
                "message": "BadAmountAfterTransfer",
                "name": "badAmountAfterTransfer"
            },
            {
                "code": 6018,
                "docs": [
                    "BadAmountAfterBurn: BadAmountAfterBurn"
                ],
                "kind": "errorNode",
                "message": "BadAmountAfterBurn",
                "name": "badAmountAfterBurn"
            },
            {
                "code": 6019,
                "docs": [
                    "ZeroThreshold: ZeroThreshold"
                ],
                "kind": "errorNode",
                "message": "ZeroThreshold",
                "name": "zeroThreshold"
            },
            {
                "code": 6020,
                "docs": [
                    "OverflowExponent: OverflowExponent"
                ],
                "kind": "errorNode",
                "message": "OverflowExponent",
                "name": "overflowExponent"
            },
            {
                "code": 6021,
                "docs": [
                    "OverflowScaledAmount: OverflowScaledAmount"
                ],
                "kind": "errorNode",
                "message": "OverflowScaledAmount",
                "name": "overflowScaledAmount"
            },
            {
                "code": 6022,
                "docs": [
                    "BitmapIndexOutOfBounds: BitmapIndexOutOfBounds"
                ],
                "kind": "errorNode",
                "message": "BitmapIndexOutOfBounds",
                "name": "bitmapIndexOutOfBounds"
            },
            {
                "code": 6023,
                "docs": [
                    "NoRegisteredTransceivers: NoRegisteredTransceivers"
                ],
                "kind": "errorNode",
                "message": "NoRegisteredTransceivers",
                "name": "noRegisteredTransceivers"
            },
            {
                "code": 6024,
                "docs": [
                    "NotPaused: NotPaused"
                ],
                "kind": "errorNode",
                "message": "NotPaused",
                "name": "notPaused"
            },
            {
                "code": 6025,
                "docs": [
                    "InvalidPendingTokenAuthority: InvalidPendingTokenAuthority"
                ],
                "kind": "errorNode",
                "message": "InvalidPendingTokenAuthority",
                "name": "invalidPendingTokenAuthority"
            },
            {
                "code": 6026,
                "docs": [
                    "IncorrectRentPayer: IncorrectRentPayer"
                ],
                "kind": "errorNode",
                "message": "IncorrectRentPayer",
                "name": "incorrectRentPayer"
            },
            {
                "code": 6027,
                "docs": [
                    "InvalidMultisig: InvalidMultisig"
                ],
                "kind": "errorNode",
                "message": "InvalidMultisig",
                "name": "invalidMultisig"
            },
            {
                "code": 6028,
                "docs": [
                    "ThresholdTooHigh: ThresholdTooHigh"
                ],
                "kind": "errorNode",
                "message": "ThresholdTooHigh",
                "name": "thresholdTooHigh"
            },
            {
                "code": 6029,
                "docs": [
                    "InvalidTransceiverProgram: InvalidTransceiverProgram"
                ],
                "kind": "errorNode",
                "message": "InvalidTransceiverProgram",
                "name": "invalidTransceiverProgram"
            }
        ],
        "instructions": [
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "deployer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "programData"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "rateLimit"
                    },
                    {
                        "docs": [
                            "In any case, this function is used to set the Config and initialize the program so we",
                            "assume the caller of this function will have total control over the program.",
                            "",
                            "TODO: Using `UncheckedAccount` here leads to \"Access violation in stack frame ...\".",
                            "Could refactor code to use `Box<_>` to reduce stack size."
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": true,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "multisigTokenAuthority"
                    },
                    {
                        "docs": [
                            "The custody account that holds tokens in locking mode and temporarily",
                            "holds tokens in burning mode.",
                            "function if the token account has already been created."
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "custody"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splToken",
                            "kind": "publicKeyValueNode",
                            "publicKey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        "docs": [
                            "associated token account for the given mint."
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "associatedTokenProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "bpfLoaderUpgradeableProgram"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "afaf6d1f0d989bed",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "chainId",
                        "type": {
                            "endian": "le",
                            "format": "u16",
                            "kind": "numberTypeNode"
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "limit",
                        "type": {
                            "endian": "le",
                            "format": "u64",
                            "kind": "numberTypeNode"
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "mode",
                        "type": {
                            "kind": "definedTypeLinkNode",
                            "name": "mode"
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "initialize",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "defaultValue": {
                            "kind": "identityValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "authority"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "lutAddress"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "lut"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "lutProgram"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "entriesConfig"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "entriesCustody"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "entriesTokenProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "entriesMint"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "entriesTokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "entriesOutboxRateLimit"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "entriesWormholeBridge"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "entriesWormholeFeeCollector"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "entriesWormholeSequence"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "entriesWormholeProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "entriesWormholeSystemProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "entriesWormholeClock"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "entriesWormholeRent"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "9b70c6707e91695d",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "recentSlot",
                        "type": {
                            "endian": "le",
                            "format": "u64",
                            "kind": "numberTypeNode"
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "initializeLut",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "7641c3c681d8fcc0",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "version",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [
                            "account can spend these tokens."
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "from"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splToken",
                            "kind": "publicKeyValueNode",
                            "publicKey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "outboxItem"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "outboxRateLimit"
                    },
                    {
                        "docs": [
                            "Tokens are always transferred to the custody account first regardless of",
                            "the mode.",
                            "For an explanation, see the note in [`transfer_burn`]."
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "custody"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "inboxRateLimit"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "peer"
                    },
                    {
                        "docs": [
                            "See [`crate::SESSION_AUTHORITY_SEED`] for an explanation of the flow."
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "sessionAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenAuthority"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "4b901ae8270c4bde",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "args",
                        "type": {
                            "kind": "definedTypeLinkNode",
                            "name": "transferArgs"
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "transferBurn",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [
                            "account can spend these tokens."
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "from"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splToken",
                            "kind": "publicKeyValueNode",
                            "publicKey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "outboxItem"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "outboxRateLimit"
                    },
                    {
                        "docs": [
                            "Tokens are always transferred to the custody account first regardless of",
                            "the mode.",
                            "For an explanation, see the note in [`transfer_burn`]."
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "custody"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "inboxRateLimit"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "peer"
                    },
                    {
                        "docs": [
                            "See [`crate::SESSION_AUTHORITY_SEED`] for an explanation of the flow."
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "sessionAuthority"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "b39e9294972eb0c8",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "args",
                        "type": {
                            "kind": "definedTypeLinkNode",
                            "name": "transferArgs"
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "transferLock",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "peer"
                    },
                    {
                        "docs": [
                            "`Account<T>` and `owner` constraints are mutually-exclusive"
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "transceiverMessage"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "transceiver"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [
                            "NOTE: This account is content-addressed (PDA seeded by the message hash).",
                            "This is because in a multi-transceiver configuration, the different",
                            "transceivers \"vote\" on messages (by delivering them). By making the inbox",
                            "items content-addressed, we can ensure that disagreeing votes don't",
                            "interfere with each other.",
                            "On the first call to [`redeem()`], [`InboxItem`] will be allocated and initialized with",
                            "default values.",
                            "On subsequent calls, we want to modify the `InboxItem` by \"voting\" on it. Therefore the",
                            "program should not fail which would occur when using the `init` constraint.",
                            "The [`InboxItem::init`] field is used to guard against malicious or accidental modification",
                            "InboxItem fields that should remain constant."
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "inboxItem"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "inboxRateLimit"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "outboxRateLimit"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "b80c569546c461e1",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "redeem",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "inboxItem"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "recipient"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splToken",
                            "kind": "publicKeyValueNode",
                            "publicKey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "custody"
                    },
                    {
                        "docs": [],
                        "isOptional": true,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "multisigTokenAuthority"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "0ce94a413ca83178",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "args",
                        "type": {
                            "kind": "definedTypeLinkNode",
                            "name": "releaseInboundArgs"
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "releaseInboundMint",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "inboxItem"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "recipient"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splToken",
                            "kind": "publicKeyValueNode",
                            "publicKey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "custody"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "b6a23ecec5895362",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "args",
                        "type": {
                            "kind": "definedTypeLinkNode",
                            "name": "releaseInboundArgs"
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "releaseInboundUnlock",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "newOwner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "upgradeLock"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "programData"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "bpfLoaderUpgradeableProgram"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "41b1d749352d632f",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "transferOwnership",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "newOwner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "upgradeLock"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "programData"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "bpfLoaderUpgradeableProgram"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "82e186f14e9e04f7",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "transferOwnershipOneStepUnchecked",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "upgradeLock"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "newOwner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "programData"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "bpfLoaderUpgradeableProgram"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "eca6efde0e2d8ffe",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "claimOwnership",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": true,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "multisigTokenAuthority"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splToken",
                            "kind": "publicKeyValueNode",
                            "publicKey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "currentAuthority"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "01561422f95a87e3",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "acceptTokenAuthority",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": true,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "multisigTokenAuthority"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splToken",
                            "kind": "publicKeyValueNode",
                            "publicKey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "currentMultisigAuthority"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "8890a480d15fb393",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "acceptTokenAuthorityFromMultisig",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": true,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "multisigTokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "newAuthority"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splToken",
                            "kind": "publicKeyValueNode",
                            "publicKey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenProgram"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "5f4779a09eaf6828",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "setTokenAuthorityOneStepUnchecked",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": true,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "multisigTokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "newAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "rentPayer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "pendingTokenAuthority"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "fcf9bdb15b0ac6c2",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "setTokenAuthority",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": true,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "multisigTokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "rentPayer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "pendingTokenAuthority"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splToken",
                            "kind": "publicKeyValueNode",
                            "publicKey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenProgram"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "fc85ff075b7af4bf",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "revertTokenAuthority",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": true,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "multisigTokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "rentPayer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "pendingTokenAuthority"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splToken",
                            "kind": "publicKeyValueNode",
                            "publicKey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenProgram"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "newAuthority"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "4f581f97f7eb6aaf",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "claimTokenAuthority",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": true,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "multisigTokenAuthority"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "rentPayer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "pendingTokenAuthority"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splToken",
                            "kind": "publicKeyValueNode",
                            "publicKey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "tokenProgram"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "newMultisigAuthority"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "7e78bfbc1e3850e2",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "claimTokenAuthorityToMultisig",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "5b3c7dc0b0e1a6da",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "pause",
                        "type": {
                            "kind": "booleanTypeNode",
                            "size": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "setPaused",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "peer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "inboxRateLimit"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "2046b8e5c873e3b1",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "chainId",
                        "type": {
                            "kind": "definedTypeLinkNode",
                            "name": "chainId"
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "address",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 32,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "limit",
                        "type": {
                            "endian": "le",
                            "format": "u64",
                            "kind": "numberTypeNode"
                        }
                    },
                    {
                        "docs": [
                            "The token decimals on the peer chain."
                        ],
                        "kind": "instructionArgumentNode",
                        "name": "tokenDecimals",
                        "type": {
                            "endian": "le",
                            "format": "u8",
                            "kind": "numberTypeNode"
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "setPeer",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [
                            "used here that wraps the Transceiver account type."
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "transceiver"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "registeredTransceiver"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "ac8d20c86e87ae77",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "registerTransceiver",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "registeredTransceiver"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "0197b2df1cce4c22",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "deregisterTransceiver",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "rateLimit"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "da0801cca7e90a9e",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "limit",
                        "type": {
                            "endian": "le",
                            "format": "u64",
                            "kind": "numberTypeNode"
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "setOutboundLimit",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "rateLimit"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "2d61ac89a41fd159",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "limit",
                        "type": {
                            "endian": "le",
                            "format": "u64",
                            "kind": "numberTypeNode"
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "chainId",
                        "type": {
                            "kind": "definedTypeLinkNode",
                            "name": "chainId"
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "setInboundLimit",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "signer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "outboxItem"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "transceiver"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "5d9893dd34f57c6b",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "markOutboxItemAsReleased",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "9b35f56874a9efa7",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "threshold",
                        "type": {
                            "endian": "le",
                            "format": "u8",
                            "kind": "numberTypeNode"
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "setThreshold",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "owner"
                    },
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "peer"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "61c488213819416d",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "chainId",
                        "type": {
                            "kind": "definedTypeLinkNode",
                            "name": "chainId"
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "address",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 32,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "setWormholePeer",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "peer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "vaa"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "transceiverMessage"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "86d58f44eb66e860",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "receiveWormholeMessage",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "outboxItem"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "transceiver"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "wormholeMessage"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "emitter"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "bridge"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "feeCollector"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "sequence"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "program"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "clock"
                    },
                    {
                        "defaultValue": {
                            "kind": "publicKeyValueNode",
                            "publicKey": "SysvarRent111111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "rent"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "ca5733ad8ea0bccc",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "revertOnDelay",
                        "type": {
                            "kind": "booleanTypeNode",
                            "size": {
                                "endian": "le",
                                "format": "u8",
                                "kind": "numberTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "releaseWormholeOutbound",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "mint"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "wormholeMessage"
                    },
                    {
                        "docs": [
                            "enforced by the [`CpiContext`] call in [`post_message`].",
                            "The seeds constraint ensures that this is the correct address"
                        ],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "emitter"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "bridge"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "feeCollector"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "sequence"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "program"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "clock"
                    },
                    {
                        "defaultValue": {
                            "kind": "publicKeyValueNode",
                            "publicKey": "SysvarRent111111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "rent"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "c796916ebdfa560f",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "broadcastWormholeId",
                "optionalAccountStrategy": "programId"
            },
            {
                "accounts": [
                    {
                        "defaultValue": {
                            "kind": "payerValueNode"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "payer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "config"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "peer"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": true,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "wormholeMessage"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "emitter"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "bridge"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "feeCollector"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": true,
                        "kind": "instructionAccountNode",
                        "name": "sequence"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "program"
                    },
                    {
                        "defaultValue": {
                            "identifier": "splSystem",
                            "kind": "publicKeyValueNode",
                            "publicKey": "11111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "systemProgram"
                    },
                    {
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "clock"
                    },
                    {
                        "defaultValue": {
                            "kind": "publicKeyValueNode",
                            "publicKey": "SysvarRent111111111111111111111111111111111"
                        },
                        "docs": [],
                        "isOptional": false,
                        "isSigner": false,
                        "isWritable": false,
                        "kind": "instructionAccountNode",
                        "name": "rent"
                    }
                ],
                "arguments": [
                    {
                        "defaultValue": {
                            "data": "c9ac2a21c8b0311b",
                            "encoding": "base16",
                            "kind": "bytesValueNode"
                        },
                        "defaultValueStrategy": "omitted",
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "discriminator",
                        "type": {
                            "kind": "fixedSizeTypeNode",
                            "size": 8,
                            "type": {
                                "kind": "bytesTypeNode"
                            }
                        }
                    },
                    {
                        "docs": [],
                        "kind": "instructionArgumentNode",
                        "name": "chainId",
                        "type": {
                            "endian": "le",
                            "format": "u16",
                            "kind": "numberTypeNode"
                        }
                    }
                ],
                "discriminators": [
                    {
                        "kind": "fieldDiscriminatorNode",
                        "name": "discriminator",
                        "offset": 0
                    }
                ],
                "docs": [],
                "kind": "instructionNode",
                "name": "broadcastWormholePeer",
                "optionalAccountStrategy": "programId"
            }
        ],
        "kind": "programNode",
        "name": "exampleNativeTokenTransfers",
        "origin": "anchor",
        "pdas": [],
        "publicKey": "nttiK1SepaQt6sZ4WGW5whvc9tEnGXGxuKeptcQPCcS",
        "version": "3.0.0"
    },
    "standard": "codama",
    "version": "1.5.0"
} as const;
