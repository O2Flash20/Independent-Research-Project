export default /*wgsl*/ `

const workgroups1D = _WORKGROUPS1D;
const timeOffset = _TIMEOFFSET;
const maxSequenceLength = _MAXSEQUENCELENGTH;
const valueOptions = _VALUEOPTIONS;
const numSequences = _NUMSEQUENCES;

const sequences: array<array<u32, maxSequenceLength>, numSequences> = array(_SEQUENCES);
const sequenceLengths: array<u32, numSequences> = array(_SEQUENCELENGTHS);
const probabilities: array<f32, valueOptions> = array(_PROBABILITIES);

_BINS

// adapted from https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-37-efficient-random-number-generation-and-application
fn tauStep(z_ptr: ptr<private, u32>, s1: u32, s2: u32, s3: u32, M: u32) -> u32 {
    let b = (((*z_ptr<<s1)^*z_ptr)>>s2);
    *z_ptr = (((*z_ptr & M) << s3) ^ b);
    return *z_ptr;
}

fn LCGStep(z_ptr: ptr<private, u32>, a: u32, c: u32) -> u32 {
    *z_ptr = a * *z_ptr + c;
    return *z_ptr;
}

var<private> z1: u32 = 0; var<private> z2: u32 = 0; var<private> z3: u32 = 0; var<private> z4: u32 = 0;
fn hybridTaus() -> f32 {
    // Combined period is lcm(p1,p2,p3,p4)~ 2^121
    return 2.3283064365387e-10 * f32(              // Periods
        tauStep(&z1, 13, 19, 12, 4294967294) ^  // p1=2^31-1
        tauStep(&z2, 2, 25, 4, 4294967288) ^    // p2=2^30-1
        tauStep(&z3, 3, 11, 17, 4294967280) ^   // p3=2^28-1
        LCGStep(&z4, 1664525, 1013904223)        // p4=2^32
    );
}

fn pickValueWeighted(random: f32, probabilities: array<f32, valueOptions>) -> u32 {
    var a = random;
    for (var i: u32 = 0; i < valueOptions; i++) {
        a -= probabilities[i];
        if (a <= 0) {
            return i;
        }
    }

    return 0;
}

// when there's a new flip, this one updates the array we're using to keep track of the most recent flips
fn shiftSequence(oldSequence: array<u32, maxSequenceLength>, newValue: u32) -> array<u32, maxSequenceLength> {
    var newSequence = array<u32, maxSequenceLength>();
    for (var i = 0; i < maxSequenceLength-1; i++) {
        newSequence[i] = oldSequence[i+1];
    }
    newSequence[maxSequenceLength-1] = newValue;

    return newSequence;
}

// assuming s1 is the shorter one, and s2 has length maxSequenceLength
fn sequencesMatch(s1: array<u32, maxSequenceLength>, s1Length: u32, s2: array<u32, maxSequenceLength>) -> bool {
    let lengthDifference = maxSequenceLength-s1Length;
    for (var i: u32 = 0; i < s1Length; i++) {
        if (s1[i] != s2[i+lengthDifference]) {
            return false;
        }
    }
    return true;
}

@compute @workgroup_size(16, 16) fn simulateGames(
    @builtin(workgroup_id) id: vec3u, @builtin(local_invocation_index) index: u32 //the position of this workgroup (same for all within a workgroup)
) {
    let binIndex = id.x*workgroups1D*workgroups1D + id.y*workgroups1D + id.z; //a unique place to put the results of each work group (all in a work group put it here)
    let randomIndex = index + 112332*(binIndex+1) + timeOffset; // multiplied by a big number so that there can be up to that many flips with completely unique random numbers (because then it end up with the next workgroups's numbers)
    z1 = 2134*randomIndex; z2 = 432*randomIndex; z3 = 358*randomIndex; z4 = 123123*randomIndex;

    var flipsSequence = array<u32, maxSequenceLength>(); // [before-last, last, this]
    var i: u32 = 0; // the number of flips that have occurred in this game

    while (true) { // keep going until someone wins
        i++;

        let thisFlip = pickValueWeighted(hybridTaus(randomIndex+i), probabilities);
        flipsSequence = shiftSequence(flipsSequence, thisFlip);

        _WINCHECKS //a lot is going on in here, defined in js
    }
}

`