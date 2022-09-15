const {
    deploy,
    getAccount,
    getValueFromBigMap,
    setQuiet,
    expectToThrow,
    exprMichelineToJson,
    setMockupNow,
    getEndpoint,
    isMockup,
    setEndpoint,
} = require('@completium/completium-cli');
const { errors, mkTransferPermit, mkApproveForAllSingle, mkDeleteApproveForAllSingle, mkTransferGaslessArgs } = require('./utils');
const { BigNumber } = require('bignumber.js');
const assert = require('assert');

require('mocha/package.json');
const mochaLogger = require('mocha-logger');

setQuiet('false');

const mockup_mode = true;

if (mockup_mode) {
    const now = Date.now() / 1000
    setMockupNow(now)
}

// contracts
let sv;

// accounts
const ama = getAccount(mockup_mode ? 'bootstrap1' : 'bootstrap1');
const kofi = getAccount(mockup_mode ? 'bootstrap2' : 'bootstrap2');
const abena = getAccount(mockup_mode ? 'bootstrap3' : 'bootstrap3');
const kwame = getAccount(mockup_mode ? 'bootstrap4' : 'bootstrap4');
const kwasi = getAccount(mockup_mode ? 'bootstrap5' : 'bootstrap5')

let owner1 = ama;
let owner2 = kofi;
let owner = owner1;
let minter1 = kwame;
let minter2 = abena;
let outsider = kwasi;
let tokenId = 0;
let amount = 1000000000;
let amount2 = 1000000;
let amount3 = 1000;
let burnAmount = 100;
let amaAmount = 9999;
let outsiderAmount = 1000;
let zero = 0;
let firstToken = 1;
let secondToken = 2;
let thirdToken = 3;
let invalidToken = 99;

//set endpointhead 
setEndpoint(mockup_mode ? 'mockup' : 'https://ithacanet.smartpy.io');

async function expectToThrowMissigned(f, e) {
    const m = 'Failed to throw' + (e !== undefined ? e : '');
    try {
        await f();
        throw new Error(m);
    } catch (ex) {
        if ((ex.message && e !== undefined) || (ex && e !== undefined)) {
            if (ex.message)
                assert(
                    ex.message.includes(e),
                    `${e} was not found in the error message`
                );
            else
                assert(
                    ex.includes(e),
                    `${e} was not found in the error message`
                );
        } else if (ex.message === m) {
            throw e;
        }
    }
}

function generatorLength(generator) {
    let c = 0;
    generator.forEach(e => c++);
    return c;
}

function hasBigNumber(bignumbers, n) {
    for (const b of bignumbers) {
        if (b.comparedTo(n) == 0) return true;
    }
    return false;
}

function bigNumberListComp(n1, n2) {
    for (let i = 0; i < n1.length; i++) {
        if (n1[i].comparedTo(n2[i]) != 0) return false;
    }
    return true;
}

describe('Contract Deployment', async () => {
    it('SV private collection contract deployment should succeed', async () => {
        [sv, _] = await deploy(
            '../contract/voted-simple.arl',
            {
                parameters: {
                    owner: owner.pkh,
                },
                as: owner.pkh,
            }
        );
    });
});


describe('Contract Metadata', async () => {

    it('Set metadata called by not owner should fail', async () => {
        await expectToThrow(async () => {
            const argM = `(Pair "key" 0x)`;
            await sv.set_metadata({
                argMichelson: argM,
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    });

    it('Set metadata with empty content should succeed', async () => {
        const argM = `(Pair "key" 0x)`;
        const storage = await sv.getStorage();
        await sv.set_metadata({
            argMichelson: argM,
            as: owner.pkh,
        });
        var metadata = await getValueFromBigMap(
            parseInt(storage.metadata),
            exprMichelineToJson(`""`),
            exprMichelineToJson(`string'`)
        );
        assert(metadata.bytes == '');
    });

    it('Set metadata with valid content should succeed', async () => {
        const bytes =
            '0x05070707070a00000016016a5569553c34c4bfe352ad21740dea4e2faad3da000a00000004f5f466ab070700000a000000209aabe91d035d02ffb550bb9ea6fe19970f6fb41b5e69459a60b1ae401192a2dc';
        const argM = `(Pair "" ${bytes})`;
        const storage = await sv.getStorage();

        await sv.set_metadata({
            argMichelson: argM,
            as: owner.pkh,
        });

        var metadata = await getValueFromBigMap(
            parseInt(storage.metadata),
            exprMichelineToJson(`""`),
            exprMichelineToJson(`string'`)
        );
        assert('0x' + metadata.bytes == bytes);
    });

});


describe('Ownership Transfer', async () => {
    it('Transfer ownership as non-owner should fail', async () => {
        await expectToThrow(async () => {
            await sv.transfer_ownership({
                argMichelson: `"${outsider.pkh}"`,
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    });

    it('Accepts ownership before transfer ownership should fail', async () => {
        let storage = await sv.getStorage();
        assert(storage.owner_candidate == null);
        await expectToThrow(async () => {
            await sv.accept_ownership({
                as: owner2.pkh,
            });
        }, errors.NO_CANDIDATE);
    });

    it('Transfer ownership as owner should succeed', async () => {
        let storage = await sv.getStorage();
        assert(storage.owner == owner.pkh);
        await sv.transfer_ownership({
            argMichelson: `"${owner2.pkh}"`,
            as: owner.pkh,
        });
    });

    it('Accepts ownership as non-new-onwer should fail', async () => {
        await expectToThrow(async () => {
            await sv.accept_ownership({
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    });

    it('Accept ownership as new owner should succeed', async () => {
        let storage = await sv.getStorage();
        assert(storage.owner_candidate == owner2.pkh);
        await sv.accept_ownership({
            as: owner2.pkh,
        });
        storage = await sv.getStorage();
        assert(storage.owner == owner2.pkh);
        assert(storage.owner_candidate == null);
        owner = owner2;
    });

});


describe('Contract Pause', async () => {

    it('Pause contract as non-owner should fail', async () => {
        let storage = await sv.getStorage();
        assert(storage.paused == false);
        await expectToThrow(async () => {
            await sv.pause({
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    });

    it('Pause contract as owner should succeed', async () => {
        let storage = await sv.getStorage();
        assert(storage.paused == false);
        await sv.pause({
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        assert(storage.paused = true)
    });

    it('Pause already paused contract should fail', async () => {
        let storage = await sv.getStorage();
        assert(storage.paused == true);
        await expectToThrow(async () => {
            await sv.pause({
                as: owner.pkh,
            });
        }, errors.CONTRACT_PAUSED);
    });

    it('Unpause contract as non-owner should fail', async () => {
        let storage = await sv.getStorage();
        assert(storage.paused == true);
        await expectToThrow(async () => {
            await sv.unpause({
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    });

    it('Unpause contract as owner should succeed', async () => {
        let storage = await sv.getStorage();
        assert(storage.paused == true);
        await sv.unpause({
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        assert(storage.paused == false)
    });

    it('Unpause already paused contract should fail', async () => {
        let storage = await sv.getStorage();
        assert(storage.paused == false);
        await expectToThrow(async () => {
            await sv.unpause({
                as: owner.pkh,
            });
        }, errors.CONTRACT_NOT_PAUSED);
    });
});

describe('Add Minter', async () => {
    it('Add minter as non-owner should fail', async () => {
        await expectToThrow(async () => {
            await sv.add_minter({
                argMichelson: `"${minter1.pkh}"`,
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    })

    it('Add minter as owner should succeed', async () => {
        let storage = await sv.getStorage();
        assert(generatorLength(storage.minters) == 0);
        await sv.add_minter({
            argMichelson: `"${minter1.pkh}"`,
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        assert(generatorLength(storage.minters) == 1);
        assert(storage.minters.has(minter1.pkh));
        await sv.add_minter({
            argMichelson: `"${outsider.pkh}"`,
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        assert(generatorLength(storage.minters) == 2);
        assert(storage.minters.has(outsider.pkh));
    });

});

describe('Mint', async () => {
    it('Mint as non-minter should fail', async () => {
        let storage = await sv.getStorage();
        assert(!storage.minters.has(owner.pkh));
        const currentTokenId = tokenId++;
        await expectToThrow(async () => {
            await sv.mint({
                arg: {
                    itokenid: currentTokenId,
                    rate: [1, 10],
                    iamount: amount,
                    expiration: "2022-09-31T12:00:00Z",
                    custodial: true,
                    itokenMetadata: [{ key: '', value: '0x' }]
                },
                as: owner.pkh,
            });
        }, errors.INVALID_CALLER)
    });

    it('Mint with expiration date less than now should fail', async () => {
        let storage = await sv.getStorage();
        assert(!storage.minters.has(owner.pkh));
        const currentTokenId = tokenId++;
        await expectToThrow(async () => {
            await sv.mint({
                arg: {
                    itokenid: currentTokenId,
                    rate: [1, 10],
                    iamount: amount,
                    expiration: "1995-03-20T00:00:00Z",
                    custodial: true,
                    itokenMetadata: [{ key: '', value: '0x' }]
                },
                as: minter1.pkh,
            });
        }, errors.MINT_DATE_LOWER)
    });

    it('Mint with amount <= 0 should fail', async () => {
        let storage = await sv.getStorage();
        assert(!storage.minters.has(owner.pkh));
        const currentTokenId = tokenId++;
        await expectToThrow(async () => {
            await sv.mint({
                arg: {
                    itokenid: currentTokenId,
                    rate: [1, 10],
                    iamount: zero,
                    expiration: "2023-03-20T00:00:00Z",
                    custodial: true,
                    itokenMetadata: [{ key: '', value: '0x' }]
                },
                as: minter1.pkh,
            });
        }, errors.MINT_AMOUNT_LOWER)
    });

    it('Mint with rate <= 0 should fail', async () => {
        let storage = await sv.getStorage();
        assert(!storage.minters.has(owner.pkh));
        const currentTokenId = tokenId++;
        await expectToThrow(async () => {
            await sv.mint({
                arg: {
                    itokenid: currentTokenId,
                    rate: [0, 10],
                    iamount: amount2,
                    expiration: "2023-03-20T00:00:00Z",
                    custodial: true,
                    itokenMetadata: [{ key: '', value: '0x' }]
                },
                as: minter1.pkh,
            });
        }, errors.MINT_RATE_LOWER)
    });

    it('Mint with contract paused should fail', async () => {
        let storage = await sv.getStorage();
        assert(!storage.minters.has(owner.pkh));
        const currentTokenId = tokenId++;
        await sv.pause({
            as: owner.pkh,
        });
        await expectToThrow(async () => {
            await sv.mint({
                arg: {
                    itokenid: currentTokenId,
                    rate: [1, 10],
                    iamount: amount,
                    expiration: "2022-09-31T12:00:00Z",
                    custodial: true,
                    itokenMetadata: [{ key: '', value: '0x' }]
                },
                as: minter1.pkh,
            });
        }, errors.CONTRACT_PAUSED)
        await sv.unpause({
            as: owner.pkh,
        });
    });

    it('Mint as minter should succeed', async () => {
        let storage = await sv.getStorage();
        assert(storage.minters.has(minter1.pkh));
        let currentTokenId = tokenId++;
        await sv.mint({
            arg: {
                itokenid: currentTokenId,
                rate: [1, 10],
                iamount: amount,
                expiration: "2022-09-31T12:00:00Z",
                custodial: true,
                itokenMetadata: [{ key: '', value: '0x' }]
            },
            as: minter1.pkh,
        });
        storage = await sv.getStorage();
        let bigId = new BigNumber(currentTokenId);
        assert(hasBigNumber(storage.minters.get(minter1.pkh), bigId))
        let balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${currentTokenId} "${minter1.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(balance.int) == amount);
        firstToken = currentTokenId;

        currentTokenId++;
        await sv.mint({
            arg: {
                itokenid: currentTokenId,
                rate: [1, 10],
                iamount: amount2,
                expiration: "2022-09-31T12:00:00Z",
                custodial: true,
                itokenMetadata: [{ key: '', value: '0x' }]
            },
            as: outsider.pkh,
        });
        storage = await sv.getStorage();
        bigId = new BigNumber(currentTokenId);
        assert(hasBigNumber(storage.minters.get(outsider.pkh), bigId))
        balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${currentTokenId} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(balance.int) == amount2);
        secondToken = currentTokenId;

        currentTokenId++;
        await sv.mint({
            arg: {
                itokenid: currentTokenId,
                rate: [1, 10],
                iamount: amount3,
                expiration: "2022-10-31T12:00:00Z",
                custodial: false,
                itokenMetadata: [{ key: '', value: '0x' }]
            },
            as: outsider.pkh,
        });
        storage = await sv.getStorage();
        bigId = new BigNumber(currentTokenId);
        assert(hasBigNumber(storage.minters.get(outsider.pkh), bigId))
        balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${currentTokenId} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(balance.int) == amount3);
        thirdToken = currentTokenId;
    });

    it('Mint already minted tokenid should fail', async () => {

        await expectToThrow(async () => {
            await sv.mint({
                arg: {
                    itokenid: firstToken,
                    rate: [1, 10],
                    iamount: amount,
                    expiration: "2022-09-31T12:00:00Z",
                    custodial: true,
                    itokenMetadata: [{ key: '', value: '0x' }]
                },
                as: minter1.pkh,
            });
        }, errors.NO_DOUBLE_MINTING)
    });
});


describe('Transfer', async () => {
    it('Transfer a token not owned should fail', async () => {
        await expectToThrow(async () => {
            await sv.transfer({
                arg: {
                    txs: [[ama.pkh, [[outsider.pkh, [firstToken, amount]]]]],
                },
                as: ama.pkh,
            });
        }, errors.FA2_NOT_OPERATOR);
    });

    it('Transfer a token from another user without being operator should fail', async () => {
        await expectToThrow(async () => {
            await sv.transfer({
                arg: {
                    txs: [[ama.pkh, [[outsider.pkh, [firstToken, 1]]]]],
                },
                as: outsider.pkh,
            });
        }, errors.FA2_NOT_OPERATOR);
    });

    it('Transfer more tokens than owned should fail', async () => {
        await expectToThrow(async () => {
            await sv.transfer({
                arg: {
                    txs: [[minter1.pkh, [[outsider.pkh, [firstToken, amount + 1]]]]],
                },
                as: minter1.pkh,
            });
        }, errors.FA2_INSUFFICIENT_BALANCE);
    });

    it('Transfer tokens whilst contract paused should fail', async () => {
        await sv.pause({
            as: owner.pkh,
        });
        await expectToThrow(async () => {
            await sv.transfer({
                arg: {
                    txs: [[minter1.pkh, [[outsider.pkh, [firstToken, 1]]]]],
                },
                as: minter1.pkh,
            });
        }, errors.CONTRACT_PAUSED);
        await sv.unpause({
            as: owner.pkh,
        });
    });

    it('Transfer tokens whilst token frozen should fail', async () => {
        await sv.freeze_token({
            argMichelson: `${firstToken}`,
            as: owner.pkh,
        });
        await expectToThrow(async () => {
            await sv.transfer({
                arg: {
                    txs: [[minter1.pkh, [[outsider.pkh, [firstToken, 1]]]]],
                },
                as: minter1.pkh,
            });
        }, errors.TOKEN_FROZEN);
        await sv.unfreeze_token({
            argMichelson: `${firstToken}`,
            as: owner.pkh,
        });
    });

    it('Transfer a token should succeed', async () => {
        let storage = await sv.getStorage();
        let balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${minter1.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(balance.int) == amount)


        await sv.transfer({
            arg: {
                txs: [
                    [minter1.pkh, [[outsider.pkh, [firstToken, outsiderAmount]]]],
                    [minter1.pkh, [[ama.pkh, [firstToken, amaAmount]]]]
                ],
            },
            as: minter1.pkh,
        });
        amount = amount - amaAmount - outsiderAmount;
        storage = await sv.getStorage();
        balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${minter1.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(balance.int) == amount)
        let outsiderBalance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(outsiderBalance.int) == outsiderAmount)
        let amaBalance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${ama.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(amaBalance.int) == amaAmount)

        storage = await sv.getStorage();
        outsiderBalance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(outsiderBalance.int) == outsiderAmount)
        await sv.transfer({
            arg: {
                txs: [
                    [outsider.pkh, [[minter1.pkh, [firstToken, outsiderAmount]]]],
                ],
            },
            as: outsider.pkh,
        });
        amount = amount + outsiderAmount;
        outsiderBalance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(outsiderBalance == null);

        await sv.transfer({
            arg: {
                txs: [
                    [minter1.pkh, [[outsider.pkh, [firstToken, outsiderAmount]]]],
                    [minter1.pkh, [[ama.pkh, [firstToken, amaAmount]]]]
                ],
            },
            as: minter1.pkh,
        });
        amount = amount - amaAmount - outsiderAmount;
        storage = await sv.getStorage();
        balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${minter1.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(balance.int) == amount)
        outsiderBalance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(outsiderBalance.int) == outsiderAmount)
        amaBalance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${ama.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(amaBalance.int) == amaAmount * 2)
    });

    it('Transfer tokens between casual holders with intertransfer-false should fail', async () => {
        await expectToThrow(async () => {
            await sv.transfer({
                arg: {
                    txs: [[ama.pkh, [[outsider.pkh, [firstToken, 1]]]]],
                },
                as: ama.pkh,
            });
        }, errors.NO_INTER_TRANSFER);
    });

    it('Transfer tokens between casual holders with intertransfer-true should succeed', async () => {
        let storage = await sv.getStorage();
        let outsiderBalance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(outsiderBalance.int) == outsiderAmount)
        await sv.resume_inter_transfer({
            argMichelson: `${firstToken}`,
            as: owner.pkh,
        });
        await sv.transfer({
            arg: {
                txs: [
                    [outsider.pkh, [[ama.pkh, [firstToken, 1]]]],
                ],
            },
            as: outsider.pkh,
        });
        outsiderAmount = outsiderAmount - 1;
        outsiderBalance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(outsiderBalance.int) == outsiderAmount)
    });

    it('Transfer tokens between casual holders with intertransfer-expiry-false after expiry should fail', async () => {
        if (mockup_mode) {
            const d = new Date();
            d.setFullYear(2030);
            setMockupNow(d)
        }
        await expectToThrow(async () => {
            await sv.transfer({
                arg: {
                    txs: [[ama.pkh, [[outsider.pkh, [firstToken, 1]]]]],
                },
                as: ama.pkh,
            });
        }, errors.NO_INTER_TRANSFER_AFTER_EXPIRY);
    });

    it('Transfer tokens between casual holders with intertransfer-expiry-true should succeed', async () => {
        let storage = await sv.getStorage();
        let outsiderBalance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(outsiderBalance.int) == outsiderAmount)
        await sv.resume_itr_after_expiry({
            argMichelson: `${firstToken}`,
            as: owner.pkh,
        });
        await sv.transfer({
            arg: {
                txs: [
                    [outsider.pkh, [[ama.pkh, [firstToken, 1]]]],
                ],
            },
            as: outsider.pkh,
        });
        outsiderAmount = outsiderAmount - 1;
        outsiderBalance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(outsiderBalance.int) == outsiderAmount)
        await sv.pause_itr_after_expiry({
            argMichelson: `${firstToken}`,
            as: owner.pkh,
        });
        await sv.pause_inter_transfer({
            argMichelson: `${firstToken}`,
            as: owner.pkh,
        });
        if (mockup_mode) {
            const now = Date.now() / 1000
            setMockupNow(now)
        }
    });

    it('Transfer tokens by minter on behalf of holder with minter not operator should fail', async () => {
        await sv.unset_minter_as_operator({
            argMichelson: `${firstToken}`,
            as: owner.pkh,
        });
        await expectToThrow(async () => {
            await sv.transfer({
                arg: {
                    txs: [
                        [outsider.pkh, [[minter1.pkh, [firstToken, 1]]]],
                    ],
                },
                as: minter1.pkh,
            });
        }, errors.FA2_NOT_OPERATOR);
        await sv.set_minter_as_operator({
            argMichelson: `${firstToken}`,
            as: owner.pkh,
        });
    });

    it('Transfer tokens by minter on behalf of holder with minter as operator should succeed', async () => {
        let storage = await sv.getStorage();
        let balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(balance.int) == outsiderAmount)
        await sv.transfer({
            arg: {
                txs: [
                    [outsider.pkh, [[minter1.pkh, [firstToken, 1]]]],
                ],
            },
            as: minter1.pkh,
        });
        outsiderAmount = outsiderAmount -  1;
        storage = await sv.getStorage();
        balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${firstToken} "${outsider.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(balance.int) == outsiderAmount)
    });

})

describe('Replace Minter', async () => {
    it('Replace minter as non-owner should fail', async () => {
        await expectToThrow(async () => {
            await sv.replace_minter({
                arg: {
                    ominter: outsider.pkh,
                    nminter: minter2.pkh
                },
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    })

    it('Replace non-existent minter should fail', async () => {
        await expectToThrow(async () => {
            await sv.replace_minter({
                arg: {
                    ominter: minter2.pkh,
                    nminter: owner1.pkh
                },
                as: owner.pkh,
            });
        }, errors.OLD_MINTER_NOT_EXIST);
    })

    it('Replace with existent minter should fail', async () => {
        await expectToThrow(async () => {
            await sv.replace_minter({
                arg: {
                    ominter: outsider.pkh,
                    nminter: minter1.pkh
                },
                as: owner.pkh,
            });
        }, errors.NEW_MINTER_EXIST);
    })

    it('Replace minter as owner should succeed', async () => {
        let storage = await sv.getStorage();
        assert(!storage.minters.has(minter2.pkh));
        assert(storage.minters.has(outsider.pkh));
        const oldMinterTokens = storage.minters.get(outsider.pkh);
        const oldMinterTokenBalances = {};
        for (const tokenId of oldMinterTokens) {
            const balance = await getValueFromBigMap(
                parseInt(storage.ledger),
                exprMichelineToJson(`(Pair ${tokenId} "${outsider.pkh}")`),
                exprMichelineToJson(`(pair nat address)'`)
            );
            oldMinterTokenBalances[tokenId] = parseInt(balance.int);
        }
        await sv.replace_minter({
            arg: {
                ominter: outsider.pkh,
                nminter: minter2.pkh
            },
            as: owner.pkh,
        });

        storage = await sv.getStorage();
        assert(storage.minters.has(minter2.pkh));
        assert(!storage.minters.has(outsider.pkh));
        const newMinterTokens = storage.minters.get(minter2.pkh);
        assert(bigNumberListComp(oldMinterTokens, newMinterTokens));
        for (const n of newMinterTokens) {
            const tMeta = await getValueFromBigMap(
                parseInt(storage.token_metadata),
                exprMichelineToJson(`${n}`),
                exprMichelineToJson(`nat'`)
            );
            assert(tMeta.args[1].string == minter2.pkh);
            const oldBalance = await getValueFromBigMap(
                parseInt(storage.ledger),
                exprMichelineToJson(`(Pair ${n} "${outsider.pkh}")`),
                exprMichelineToJson(`(pair nat address)'`)
            );
            assert(oldBalance == null);
            const newBalance = await getValueFromBigMap(
                parseInt(storage.ledger),
                exprMichelineToJson(`(Pair ${n} "${minter2.pkh}")`),
                exprMichelineToJson(`(pair nat address)'`)
            );
            assert(parseInt(newBalance.int) == oldMinterTokenBalances[n]);
        }
    })

});


describe('Minter as Operator', async () => {
    it('Set minter as Operator as non-owner should fail', async () => {
        await expectToThrow(async () => {
            await sv.set_minter_as_operator({
                argMichelson: `${thirdToken}`,
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    })

    it('Set minter as Operator as owner should succeed', async () => {
        let storage = await sv.getStorage();
        let tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[8].prim == 'False');
        await sv.set_minter_as_operator({
            argMichelson: `${thirdToken}`,
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[8].prim == 'True');
    })

    it('Unset minter as Operator as non-owner should fail', async () => {
        await expectToThrow(async () => {
            await sv.unset_minter_as_operator({
                argMichelson: `${thirdToken}`,
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    })

    it('Unset minter as Operator as owner should succeed', async () => {
        let storage = await sv.getStorage();
        let tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[8].prim == 'True');
        await sv.unset_minter_as_operator({
            argMichelson: `${thirdToken}`,
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[8].prim == 'False');
    })
});


describe('Freeze Token', async () => {
    it('Freeze Token as non-owner should fail', async () => {
        await expectToThrow(async () => {
            await sv.freeze_token({
                argMichelson: `${firstToken}`,
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    })

    it('Freeze Token as owner should succeed', async () => {
        let storage = await sv.getStorage();
        let tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${firstToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[7].prim == 'False');
        await sv.freeze_token({
            argMichelson: `${firstToken}`,
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${firstToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[7].prim == 'True');
    })

    it('Freeze frozen token should fail', async () => {
        await expectToThrow(async () => {
            await sv.freeze_token({
                argMichelson: `${firstToken}`,
                as: owner.pkh,
            });
        }, errors.TOKEN_FROZEN);
    })

    it('Unfreeze Token as non-owner should fail', async () => {
        await expectToThrow(async () => {
            await sv.unfreeze_token({
                argMichelson: `${firstToken}`,
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    })

    it('Unfreeze Token as owner should succeed', async () => {
        let storage = await sv.getStorage();
        let tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${firstToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[7].prim == 'True');
        await sv.unfreeze_token({
            argMichelson: `${firstToken}`,
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${firstToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[7].prim == 'False');
    })

    it('Unfreeze unfrozen token should fail', async () => {
        await expectToThrow(async () => {
            await sv.unfreeze_token({
                argMichelson: `${firstToken}`,
                as: owner.pkh,
            });
        }, errors.TOKEN_NOT_FROZEN);
    })
})


describe('Bond Intertransfer Pause', async () => {

    it('Pause intertransfer as non-owner should fail', async () => {
        await expectToThrow(async () => {
            await sv.pause_inter_transfer({
                argMichelson: `${thirdToken}`,
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    })

    it('Pause intertransfer as owner should succeed', async () => {
        let storage = await sv.getStorage();
        let tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[5].prim == 'False');
        await sv.pause_inter_transfer({
            argMichelson: `${thirdToken}`,
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[5].prim == 'True');
    })

    it('Pause intertransfer for intertransfer-paused-token should fail', async () => {
        await expectToThrow(async () => {
            await sv.pause_inter_transfer({
                argMichelson: `${thirdToken}`,
                as: owner.pkh,
            });
        }, errors.INTER_TRANSFER_PAUSED);
    })

    it('Resume intertransfer as non-owner should fail', async () => {
        await expectToThrow(async () => {
            await sv.resume_inter_transfer({
                argMichelson: `${thirdToken}`,
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    })

    it('Resume intertransfer as owner should succeed', async () => {
        let storage = await sv.getStorage();
        let tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[5].prim == 'True');
        await sv.resume_inter_transfer({
            argMichelson: `${thirdToken}`,
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[5].prim == 'False');
    })

    it('Resume intertransfer for unpaused-intertransfer-token should fail', async () => {
        await expectToThrow(async () => {
            await sv.resume_inter_transfer({
                argMichelson: `${thirdToken}`,
                as: owner.pkh,
            });
        }, errors.INTER_TRANSFER_NOT_PAUSED);
    })

})


describe('Bond Intertransfer after Expiry Pause', async () => {

    it('Resume intertransfer-expiry as non-owner should fail', async () => {
        await expectToThrow(async () => {
            await sv.resume_itr_after_expiry({
                argMichelson: `${thirdToken}`,
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    })

    it('Resume intertransfer-expiry as owner should succeed', async () => {
        let storage = await sv.getStorage();
        let tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[6].prim == 'True');
        await sv.resume_itr_after_expiry({
            argMichelson: `${thirdToken}`,
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[6].prim == 'False');
    })

    it('Resume intertransfer-expiry for unpaused-intertransfer-expiry-token should fail', async () => {
        await expectToThrow(async () => {
            await sv.resume_itr_after_expiry({
                argMichelson: `${thirdToken}`,
                as: owner.pkh,
            });
        }, errors.INTER_TRANSFER_AFTER_EXPIRY_NOT_PAUSED);
    })

    it('Pause intertransfer-expiry as non-owner should fail', async () => {
        await expectToThrow(async () => {
            await sv.pause_itr_after_expiry({
                argMichelson: `${thirdToken}`,
                as: outsider.pkh,
            });
        }, errors.INVALID_CALLER);
    })

    it('Pause intertransfer-expiry as owner should succeed', async () => {
        let storage = await sv.getStorage();
        let tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[6].prim == 'False');
        await sv.pause_itr_after_expiry({
            argMichelson: `${thirdToken}`,
            as: owner.pkh,
        });
        storage = await sv.getStorage();
        tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta.args[6].prim == 'True');
    })

    it('Pause intertransfer-expiry for intertransfer-expiry-paused-token should fail', async () => {
        await expectToThrow(async () => {
            await sv.pause_itr_after_expiry({
                argMichelson: `${thirdToken}`,
                as: owner.pkh,
            });
        }, errors.INTER_TRANSFER_AFTER_EXPIRY_PAUSED);
    })

})


describe('Burn Token', async () => {
    it('Burn as non-minter should fail', async () => {
        await expectToThrow(async () => {
            await sv.burn({
                arg: {
                    itokenid: thirdToken,
                    iamount: burnAmount,
                },
                as: owner.pkh,
            });
        }, errors.INVALID_CALLER);
    })

    it('Burn in paused mode should fail', async () => {
        await sv.pause({
            as: owner.pkh,
        });
        await expectToThrow(async () => {
            await sv.burn({
                arg: {
                    itokenid: thirdToken,
                    iamount: burnAmount,
                },
                as: minter2.pkh,
            });
        }, errors.CONTRACT_PAUSED);
        await sv.unpause({
            as: owner.pkh,
        });
    })

    it('Burn amount <= 0 should fail', async () => {
        await expectToThrow(async () => {
            await sv.burn({
                arg: {
                    itokenid: thirdToken,
                    iamount: zero,
                },
                as: minter2.pkh,
            });
        }, errors.BURN_AMOUNT_LOWER);
    })

    it('Burn amount greater than token amount should fail', async () => {
        await expectToThrow(async () => {
            await sv.burn({
                arg: {
                    itokenid: thirdToken,
                    iamount: amount2,
                },
                as: minter2.pkh,
            });
        }, errors.FA2_INSUFFICIENT_BALANCE);
    })

    it('Burn with non-existent token should fail', async () => {
        await expectToThrow(async () => {
            await sv.burn({
                arg: {
                    itokenid: invalidToken,
                    iamount: amount3,
                },
                as: minter2.pkh,
            });
        }, errors.FA2_INSUFFICIENT_BALANCE);
    })

    it('Burn token by non-minter should fail', async () => {
        await expectToThrow(async () => {
            await sv.burn({
                arg: {
                    itokenid: firstToken,
                    iamount: amount,
                },
                as: minter2.pkh,
            });
        }, errors.FA2_INSUFFICIENT_BALANCE);
    })

    it('Burn token should succeed', async () => {
        let storage = await sv.getStorage();
        let balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${thirdToken} "${minter2.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(balance.int) == amount3);
        await sv.burn({
            arg: {
                itokenid: thirdToken,
                iamount: burnAmount,
            },
            as: minter2.pkh,
        });
        amount3 = amount3 - burnAmount;
        storage = await sv.getStorage();
        balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${thirdToken} "${minter2.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(balance.int) == amount3);
    })

    it('Burn all token should remove token & metadata should succeed ', async () => {
        let storage = await sv.getStorage();
        let balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${thirdToken} "${minter2.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(parseInt(balance.int) == amount3);
        let tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta != null);
        await sv.burn({
            arg: {
                itokenid: thirdToken,
                iamount: amount3,
            },
            as: minter2.pkh,
        });
        storage = await sv.getStorage();
        balance = await getValueFromBigMap(
            parseInt(storage.ledger),
            exprMichelineToJson(`(Pair ${thirdToken} "${minter2.pkh}")`),
            exprMichelineToJson(`(pair nat address)'`)
        );
        assert(balance == null);
        tMeta = await getValueFromBigMap(
            parseInt(storage.token_metadata),
            exprMichelineToJson(`${thirdToken}`),
            exprMichelineToJson(`nat'`)
        );
        assert(tMeta == null);
    })
});

describe('Operator', async () => {
    it('Add an operator for ourself should succeed', async () => {
        const storage = await sv.getStorage();
        let initialOperators = await getValueFromBigMap(
            parseInt(storage.operator),
            exprMichelineToJson(
                `(Pair "${sv.address}" (Pair ${firstToken} "${outsider.pkh}"))`
            ),
            exprMichelineToJson(`(pair address (pair nat address))'`)
        );
        assert(initialOperators == null);
        await sv.update_operators({
            argMichelson: `{Left (Pair "${outsider.pkh}" "${sv.address}" ${firstToken})}`,
            as: outsider.pkh,
        });
        let operatorsAfterAdd = await getValueFromBigMap(
            parseInt(storage.operator),
            exprMichelineToJson(
                `(Pair "${sv.address}" (Pair ${firstToken} "${outsider.pkh}"))`
            ),
            exprMichelineToJson(`(pair address (pair nat address))'`)
        );
        assert(operatorsAfterAdd.prim == 'Unit');
    });

    it('Remove a non existing operator should succeed', async () => {
        await sv.update_operators({
            argMichelson: `{Right (Pair "${outsider.pkh}" "${ama.pkh}" ${firstToken})}`,
            as: outsider.pkh,
        });
    });

    it('Remove an existing operator for another user should fail', async () => {
        await expectToThrow(async () => {
            await sv.update_operators({
                argMichelson: `{Right (Pair "${outsider.pkh}" "${sv.address}" ${firstToken})}`,
                as: ama.pkh,
            });
        }, errors.CALLER_NOT_OWNER);
    });

    it('Add operator for another user should fail', async () => {
        await expectToThrow(async () => {
            await sv.update_operators({
                argMichelson: `{Left (Pair "${owner.pkh}" "${sv.address}" ${firstToken})}`,
                as: outsider.pkh,
            });
        }, errors.CALLER_NOT_OWNER);
    });

    it('Remove an existing operator should succeed', async () => {
        const storage = await sv.getStorage();
        var initialOperators = await getValueFromBigMap(
            parseInt(storage.operator),
            exprMichelineToJson(
                `(Pair "${sv.address}" (Pair ${firstToken} "${outsider.pkh}"))`
            ),
            exprMichelineToJson(`(pair address (pair nat address))'`)
        );
        assert(initialOperators.prim == 'Unit');
        await sv.update_operators({
            argMichelson: `{Right (Pair "${outsider.pkh}" "${sv.address}" ${firstToken})}`,
            as: outsider.pkh,
        });
        var operatorsAfterRemoval = await getValueFromBigMap(
            parseInt(storage.operator),
            exprMichelineToJson(
                `(Pair "${sv.address}" (Pair ${firstToken} "${outsider.pkh}"))`
            ),
            exprMichelineToJson(`(pair address (pair nat address))'`)
        );
        assert(operatorsAfterRemoval == null);
    });

});


describe('Operator for All', async () => {
    it('Add an operator for all for ourself should succeed', async () => {
        const storage = await sv.getStorage();
        var initialOperators = await getValueFromBigMap(
            parseInt(storage.operator_for_all),
            exprMichelineToJson(
                `(Pair "${sv.address}" "${outsider.pkh}"))`
            ),
            exprMichelineToJson(`(pair address address)'`)
        );
        assert(initialOperators == null);
        await sv.update_operators_for_all({
            argJsonMichelson: mkApproveForAllSingle(sv.address),
            as: outsider.pkh
        });
        var operatorsAfterAdd = await getValueFromBigMap(
            parseInt(storage.operator_for_all),
            exprMichelineToJson(
                `(Pair "${sv.address}" "${outsider.pkh}")`
            ),
            exprMichelineToJson(`(pair address address)'`)
        );
        assert(operatorsAfterAdd.prim == 'Unit');
    });

    it('Remove a non existing operator should succeed', async () => {
        await sv.update_operators_for_all({
            argJsonMichelson: mkDeleteApproveForAllSingle(ama.pkh),
            as: outsider.pkh
        });
    });

    it('Remove an existing operator should succeed', async () => {
        const storage = await sv.getStorage();
        var initialOperators = await getValueFromBigMap(
            parseInt(storage.operator_for_all),
            exprMichelineToJson(
                `(Pair "${sv.address}" "${outsider.pkh}")`
            ),
            exprMichelineToJson(`(pair address address)'`)
        );
        assert(initialOperators.prim == "Unit");
        await sv.update_operators_for_all({
            argJsonMichelson: mkDeleteApproveForAllSingle(sv.address),
            as: outsider.pkh
        });
        var operatorsAfterRemoval = await getValueFromBigMap(
            parseInt(storage.operator_for_all),
            exprMichelineToJson(
                `(Pair "${sv.address}" "${outsider.pkh}")`
            ),
            exprMichelineToJson(`(pair address address)'`)
        );
        assert(operatorsAfterRemoval == null);
    });

});
