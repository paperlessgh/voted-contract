import { Candidate, Category, Election, ELECTION_MODE, ELECTION_VISIBILITY, Vote, VoteParam } from "./voted-client";


const ca1: Category = {
    category_title: "Favorite Color",
    category_description: "what is your favorite color",
    category_vote_limit: 3,
}

const ca2: Category = {
    category_title: "Brightest Color",
    category_description: "What color is brightest to you",
    category_vote_limit: 3,
}

const ca3: Category = {
    category_title: "Disliked Color",
    category_description: "what color do you dislike the most",
    category_vote_limit: 3,
}

const categories: {[key:string]:Category}= {
    "1": ca1,
    "2": ca2,
    "3": ca3
};

const cd1: Candidate = {
    candidate_title: "Red",
    candidate_description: "color red",
    candidate_category_id: "1"
};

const cd2: Candidate = {
    candidate_title: "Gold",
    candidate_description: "color red",
    candidate_category_id: "1"
};

const cd3: Candidate = {
    candidate_title: "Red",
    candidate_description: "color red",
    candidate_category_id: "1"
};

const cd4: Candidate = {
    candidate_title: "Red",
    candidate_description: "color red",
    candidate_category_id: "2"
};

const cd5: Candidate = {
    candidate_title: "Gold",
    candidate_description: "color red",
    candidate_category_id: "2"
};

const cd6: Candidate = {
    candidate_title: "Red",
    candidate_description: "color red",
    candidate_category_id: "2"
};

const cd7: Candidate = {
    candidate_title: "Red",
    candidate_description: "color red",
    candidate_category_id: "3"
};

const cd8: Candidate = {
    candidate_title: "Gold",
    candidate_description: "color red",
    candidate_category_id: "3"
};

const cd9: Candidate = {
    candidate_title: "Red",
    candidate_description: "color red",
    candidate_category_id: "3"
};

// cadidate key is generated with `${categoryId}${candidateId}`
const candidates: {[key:string]: Candidate} = {
    "11": cd1,
    "12": cd2,
    "13": cd3,
    "21": cd4,
    "22": cd5,
    "23": cd6,
    "31": cd7,
    "32": cd8,
    "33": cd9
};

const start = new Date();
start.setDate(start.getDate() + 1);
const start_value = Math.floor(start.getTime() / 1000).toString();

const end = new Date();
end.setDate(end.getDate() + 8);
const end_value = Math.floor(end.getTime() / 1000).toString()

export const electionData: Election =  {
    election_id_param: "simple-voting",
    election_organizer_param: "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
    election_title_param: "Paperless Voting",
    election_description_param: "Simple Paperless Voting",
    election_start_time_param: start_value,
    election_stop_time_param: end_value,
    election_pub_keys_param: [],
    election_mode_param: ELECTION_MODE.free,
    election_active_param: true,
    election_cost_per_vote_param: 0,
    election_visibility_param: ELECTION_VISIBILITY.private,
    election_categories_param: categories,
    election_candidates_param: candidates,
};


//// ================== correct vote ========================
const vp1: VoteParam =  {
    vote_canditate_id: "11",
    vote_category_id: "1",
    number_of_votes: 1
}

const vp2: VoteParam =  {
    vote_canditate_id: "21",
    vote_category_id: "2",
    number_of_votes: 1
}

const vp3: VoteParam =  {
    vote_canditate_id: "21",
    vote_category_id: "3",
    number_of_votes: 1
}

export const v1: Vote = {
    vote_election_id: electionData.election_id_param,
    vote_params: [vp1, vp2, vp3],
    vote_token: null,
}