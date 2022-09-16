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

export interface Category {
    category_title: string;
    category_description: string;
    category_vote_limit: number;
}

export interface Candidate {
    candidate_title: string;
    candidate_description: string;
    candidate_category_id: string;
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
    election_id_param: string;
    election_organizer_param: string;
    election_title_param: string;
    election_description_param: string;
    election_start_time_param: string; //  microseconds
    election_stop_time_param: string; // microseconds
    election_pub_keys_param: string[];
    election_mode_param: ELECTION_MODE;
    election_active_param: boolean;
    election_cost_per_vote_param: number;
    election_visibility_param: ELECTION_VISIBILITY;
    election_categories_param: { [key: string]: Category };
    election_candidates_param: { [key: string]: Candidate };
}

function isType<T>(obj: any, prop: string): obj is T {
    return obj[prop] !== undefined;
}

function buildElection(election: Election): any[] {
    return [
        election.election_id_param,
        election.election_organizer_param,
        election.election_title_param,
        election.election_description_param,
        election.election_start_time_param, // iso string
        election.election_stop_time_param, // iso string
        election.election_pub_keys_param,
        election.election_mode_param,
        election.election_active_param,
        election.election_cost_per_vote_param,
        election.election_visibility_param,
        buildMap(election.election_categories_param),
        buildMap(election.election_candidates_param),
    ];
};

function buildCandidate(candidate: Candidate): any[] {
    return [
        candidate.candidate_title,
        candidate.candidate_description,
        candidate.candidate_category_id
    ];

}

function buildCategory(category: Category): any[] {
    return [
        category.category_title,
        category.category_description,
        category.category_vote_limit
    ]
}

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
    const fresh_map: MichelsonMap<string, any[]> = new MichelsonMap();
    for (const [k, v] of Object.entries(mapargs)) {
        fresh_map.set(k, v);
    }
    return fresh_map;
}


export class SimpleVoteContractClient {

    private tezos: TezosToolkit;
    private contract?: WalletContract;
    private signerSet: boolean = false;
    private contractAddress: string;

    constructor(
        contractAddress: string,
        privateKey: string,
        rpcUrl?: string,
    ) {
        this.contractAddress = contractAddress;
        this.tezos = new TezosToolkit(rpcUrl ?? 'https://ghostnet.ecadinfra.com');
        this.setSigner(privateKey);
    }

    setPrivateKey(privateKey: string) {
        this.setSigner(privateKey);
    }

    hasSigner(): boolean {
        return this.signerSet;
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
        const election = await st.election.get(electionId);
        return election;
    }

    async electionExists(electionId: string): Promise<boolean> {
        const election = await this.getElectionData(electionId);        
        return election != undefined;
    }

    async createElection(
        electionDetails: Election
    ): Promise<string | undefined> {
        try {
            await this.setContract();
            const electionData = buildElection(electionDetails);
            const op = await this.contract?.methods.create_election(...electionData).send();
            await op?.confirmation();
            return op?.opHash;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }

    async updateElection(
        electionDetails: Election
    ): Promise<string | undefined> {
        try {
            await this.setContract();
            const electionData = buildElection(electionDetails);
            const op =  await this.contract?.methods.update_election(...electionData).send();
            await op?.confirmation();
            return op?.opHash;
        } catch (error) {
            console.log(error);
            return undefined;
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
            console.log(election, pubKeys);
            
            for (const pubk of pubKeys) {
                if (verifySignature(data, pubk, signature)) return true;
            }
            return false;
        } catch (error) {
            console.log(error);
            return false;
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

    async addPubKey(
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

    async getVoteData(electionId: string): Promise<any> {
        const election = await this.getElectionData(electionId);
        return election;
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

    async generateTokens(
        numberOfTokens: number
    ): Promise<{ tokens: (string | null)[], pubKey: string } | null> {
        const signer: InMemorySigner = this.getKeyStore();
        const tokens = await Promise.all(
            Array(numberOfTokens)
                .fill(0, 0, numberOfTokens)
                .map((e) => this.generateToken(signer))
        );
        const pubKey = await signer.publicKey();
        
        return { tokens, pubKey };
    }

}