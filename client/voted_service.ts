import { InMemorySigner } from "@taquito/signer";
import { TezosToolkit, WalletContract } from "@taquito/taquito";
import { b58cencode, Prefix, prefix } from '@taquito/utils';
import { hex2buf } from "@taquito/utils";
import base58 from "bs58";
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Parser, packDataBytes, MichelsonData, MichelsonType, } from '@taquito/michel-codec';
import { randomBytes } from 'crypto';

export enum ELECTION_MODE {
    free,
    paid
}

export enum ELECTION_VISIBILITY {
    public,
    private
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
    election_start_time_param: Date;
    election_stop_time_param: Date;
    election_pub_keys_param: string[];
    election_mode_param: ELECTION_MODE;
    election_active_param: boolean;
    election_cost_per_vote_param: number;
    election_visibility_param: ELECTION_VISIBILITY;
    election_categories_param: Map<string, Category>;
    election_candidates_param: Map<string, Candidate>;
}


export class SimpleVoteContractClient {

    private tezos: TezosToolkit;
    private contract?: WalletContract;
    private signerSet: boolean = false;
    private contractAddress: string;
    private electionId: string;

    constructor(
        contractAddress: string,
        electionId: string,
        privateKey: string,
        rpcUrl?: string,
    ) {
        this.contractAddress = contractAddress;
        this.electionId = electionId;
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

    private async getElectionData(): Promise<any> {
        await this.setContract();
        const st = (await this.contract?.storage()) as any;
        const election = await st.election.get(this.electionId);
        return election;
    }

    async setElection(
        electionDetails: Election
    ): Promise<string | null> {
        try {
            await this.setContract();
            const op = await this.contract?.methods.set_election(electionDetails).send();
            await op?.confirmation();
            return op!.opHash;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    async validateToken(
        token: string
    ): Promise<boolean> {
        try {
            const election = await this.getElectionData();
            const tokenDecode = base58.decode(token);
            return true;
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
            const op = await this.contract?.methods.register_vote(voteDetails).send();
            await op?.confirmation();
            return op!.opHash;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    async addPubKey(
        pubKey: string
    ): Promise<string | null> {
        try {
            await this.setContract();
            const op = await this.contract?.methods.set_election([this.electionId, pubKey]).send();
            await op?.confirmation();
            return op!.opHash;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    async getVoteData(): Promise<any> {
        const election = await this.getElectionData();
    }

    private async generateRandomBytes(): Promise<string> {
        return new Promise((resolve, reject) => {
            randomBytes(256, (err, buf) => {
                if (err) throw err;
                resolve(buf.toString('hex'));
            });
        });
    }

    private async generateToken(signer: InMemorySigner): Promise<string | null> {
        try {
            const bytes = await this.generateRandomBytes();
            const signature = await signer.sign(bytes);
            const p = new Parser();
            const dataJSON = p.parseMichelineExpression(`(pair ${bytes} ${signature.prefixSig})`);
            const typeJSON = p.parseMichelineExpression("(pair bytes signature)");
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

        const { key, chainCode } = derivePath("path", seed);

        return new InMemorySigner(b58cencode(key, prefix[Prefix.EDSK2]));
    }

    async generateTokens(
        numberOfTokens: number
    ): Promise<{tokens: (string | null)[], pubKey: string} | null> {
        const signer: InMemorySigner = this.getKeyStore();
        const tokens = await Promise.all(
            Array(numberOfTokens + 1)
                .fill(0, 0, numberOfTokens + 1)
                .map((e) => this.generateToken(signer))
        );
        const pubKey = await signer.publicKey();
        return {tokens, pubKey};
    }

}