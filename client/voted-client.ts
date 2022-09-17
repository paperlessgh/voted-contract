import { InMemorySigner } from "@taquito/signer";
import { MichelsonMap, TezosToolkit, WalletContract } from "@taquito/taquito";
import { b58cencode, Prefix, prefix, verifySignature } from '@taquito/utils';
import { hex2buf } from "@taquito/utils";
import base58 from "bs58";
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { packDataBytes, MichelsonData, MichelsonType, unpackData } from '@taquito/michel-codec';
import { randomBytes } from 'crypto';

export enum ELECTION_MODE {
    free = 0,
    paid = 1
}

export enum ELECTION_VISIBILITY {
    public = 0,
    private = 1
}

interface Idea {
    title: string,
    description: string,
}

export interface Category {
    title: string;
    description: string;
    vote_limit: number;
}

export interface Candidate {
    title: string;
    description: string;
    category_id: string;
}

export interface VoteParam {
    vote_canditate_id: string;
    vote_category_id: string;
    number_of_votes: number;
}

export interface Vote {
    vote_election_id: string;
    vote_params: VoteParam[];
    vote_token: string | null;
}

export interface Election {
    id: string;
    organizer: string;
    titlle: string;
    description: string;
    start_time: string; //  microseconds
    stop_time: string; // microseconds
    pub_keys: string[];
    mode: ELECTION_MODE;
    active: boolean;
    cost_per_vote: number;
    visibility: ELECTION_VISIBILITY;
    categories: { [key: string]: Category };
    candidates: { [key: string]: Candidate };
}

function isType<T>(obj: any, prop: string): obj is T {
    return obj[prop] !== undefined;
}

function buildElection(election: Election): any[] {
    return [
        election.id,
        election.organizer,
        strCut(election.titlle, 30),
        strCut(election.description, 140),
        election.start_time, // microseconds
        election.stop_time, // microseconds
        election.pub_keys,
        election.mode,
        election.active,
        election.cost_per_vote,
        election.visibility,
        buildMap(election.categories),
        buildMap(election.candidates),
    ];
};

function buildVote(vote: Vote): any[] {
    return [
        vote.vote_election_id,
        vote.vote_params,
        vote.vote_token
    ];
}

function buildVoteParam(voteParam: VoteParam): any[] {
    return [
        voteParam.vote_canditate_id,
        voteParam.vote_category_id,
        voteParam.number_of_votes
    ];

}

function buildMap(mapargs: { [key: string]: any }): MichelsonMap<string, any[]> {
    const fresh_map: MichelsonMap<string, any> = new MichelsonMap();
    for (const [k, v] of Object.entries(mapargs)) {
        fresh_map.set(k, parseIdea(v));
    }
    return fresh_map;
}

function  strCut(str: string, maxLen: number) {
    if (str.length > maxLen) {
        return str.slice(0, maxLen) + "..."
    } else {
        return str;
    }
}

function parseIdea(idea: Idea) {
    idea.title = strCut(idea.title, 140);
    idea.description = strCut(idea.description, 140);
    return idea;
}


export class SimpleVoteContractClient {

    private tezos: TezosToolkit;
    private contract?: WalletContract;
    private signerSet: boolean = false;
    private contractAddress: string;

    constructor(
        contractAddress: string,
        privateKey: string,
        rpcUrl: string,
    ) {
        this.contractAddress = contractAddress;
        this.tezos = new TezosToolkit(rpcUrl);
        this.setSigner(privateKey);
    }

    private setSigner(privateKey: string) {
        this.tezos.setSignerProvider(new InMemorySigner(privateKey));
        this.signerSet = true;
    }

    private async setContract() {
        if (this.contract === undefined) {
            this.contract = await this.tezos.wallet.at(this.contractAddress);
        }
    }

    private async getElectionData(electionId: string): Promise<any> {
        await this.setContract();
        const st = (await this.contract?.storage()) as any;
        const election = await st.election_metadata.get(electionId);
        return election;
    }

    private async prepareElectionData(
        electionDetails: Election
    ): Promise<any[]> {
        await this.setContract();
        electionDetails.organizer = await this.tezos?.signer.publicKeyHash();
        return buildElection(electionDetails);
    }

    private async generateRandomBytes(): Promise<string> {
        return new Promise((resolve, reject) => {
            randomBytes(4, (err, buf) => {
                if (err) throw err;
                resolve(buf.toString('hex'));
            });
        });
    }

    private async generateToken(signer: InMemorySigner): Promise<string | null> {
        try {
            const bytes = await this.generateRandomBytes();
            const signature = await signer.sign(bytes);
            const dataJSON = {
                prim: 'Pair',
                args: [{ bytes: bytes }, { string: signature.prefixSig }],
            };
            const typeJSON = {
                prim: 'pair',
                args: [{ prim: 'bytes' }, { prim: 'string' }],
            };
            const pdata = packDataBytes(dataJSON as MichelsonData, typeJSON as MichelsonType);
            return base58.encode(hex2buf(pdata.bytes));
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    private getKeyStore(): InMemorySigner {
        const mnemonic = bip39.generateMnemonic();

        const seed = bip39.mnemonicToSeedSync(mnemonic).toString('hex');

        const { key, chainCode } = derivePath("m/44'/1729'/0'/0'", seed);

        return new InMemorySigner(b58cencode(key, prefix[Prefix.EDSK2]));
    }

    private async addPubKey(
        electionId: string,
        pubKey: string
    ): Promise<string | null> {
        try {
            await this.setContract();
            const prams = this.contract?.methods.add_pub_key(electionId, pubKey).toTransferParams();
            console.log(JSON.stringify(prams, null, 2));

            const op = await this.contract?.methods.add_pub_key(electionId, pubKey).send();
            await op?.confirmation();
            return op!.opHash;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    async publishElection(
        electionDetails: Election,
    ): Promise<string | undefined> {
        try {
            const electionData = await this.prepareElectionData(electionDetails);
            const electionExists = await this.electionExists(electionDetails.id);
            let op;
            if (electionExists) {
                op = await this.contract?.methods.update_election(...electionData).send();
            } else {
                op = await this.contract?.methods.create_election(...electionData).send();
            }
            await op?.confirmation();
            return op?.opHash;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }

    async recordVote(
        voteDetails: Vote
    ): Promise<string | null> {
        try {
            await this.setContract();
            const op = await this.contract?.methods
                .register_vote(...buildVote(voteDetails)).send();
            await op?.confirmation();
            return op!.opHash;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    async validateToken(
        electionId: string,
        token: string
    ): Promise<boolean> {
        try {
            const election = await this.getElectionData(electionId);
            const tokenDecode = base58.decode(token);
            const unpkaced = unpackData(tokenDecode) as any;
            const data = unpkaced["args"][0]["bytes"];
            const signature = unpkaced["args"][1]["string"];
            const pubKeys: string[] = election.election_pub_keys;
            for (const pubk of pubKeys) {
                if (verifySignature(data, pubk, signature)) return true;
            }
            return false;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    async getVoteData(electionId: string): Promise<any> {
        const election = await this.getElectionData(electionId);
        return election;
    }

    async generateTokens(
        electionId: string,
        numberOfTokens: number
    ): Promise<(string | null)[] | null> {
        const electionExists = await this.electionExists(electionId);
        if (!electionExists) return null;
        const signer: InMemorySigner = this.getKeyStore();
        const tokens = await Promise.all(
            Array(numberOfTokens)
                .fill(0, 0, numberOfTokens)
                .map((e) => this.generateToken(signer))
        );
        const pubKey = await signer.publicKey();
        const pubKeyAdded = await this.addPubKey(electionId, pubKey);
        if (pubKeyAdded == null) return null;
        return tokens;
    }

    async electionExists(electionId: string): Promise<boolean> {
        const election = await this.getElectionData(electionId);
        return election != undefined;
    }

}