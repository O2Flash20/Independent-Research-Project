export default /*wgsl*/ `

const workgroups1D = _WORKGROUPS1D;
const timeOffset = _TIMEOFFSET;

@group(0) @binding(0) var <storage, read_write> bins: array<atomic<u32>>;

// https://indico.cern.ch/event/93877/contributions/2118070/attachments/1104200/1575343/acat3_revised_final.pdf
fn seedPerThread(i: u32) -> u32 {
    return i * 1099087573;
}

fn tauStep(z: u32, s1: u32, s2: u32, s3: u32, M: u32) -> u32 {
    let b = (((z<<s1)^z)>>s2);
    return (((z & M) << s3) ^ b);
}

fn random(i: u32) -> f32 {
    let seed = seedPerThread(i);

    let r0 = tauStep(seed, 13, 19, 12, 429496729) ^ tauStep(seed, 2 ,25 ,4 ,4294967288) ^ tauStep(seed, 3, 11, 17, 429496280) ^ (1664525*seed+1013904223);
    let r1 = tauStep(r0, 13, 19, 12, 429496729) ^ tauStep(r0, 2 ,25 ,4 ,4294967288) ^ tauStep(r0, 3, 11, 17, 429496280) ^ (1664525*r0+1013904223);
    let r2 = tauStep(r1, 13, 19, 12, 429496729) ^ tauStep(r1, 2 ,25 ,4 ,4294967288) ^ tauStep(r1, 3, 11, 17, 429496280) ^ (1664525*r1+1013904223);
    let r3 = tauStep(r2, 13, 19, 12, 429496729) ^ tauStep(r2, 2 ,25 ,4 ,4294967288) ^ tauStep(r2, 3, 11, 17, 429496280) ^ (1664525*r2+1013904223);

    return f32(r3) * 2.3283064365387e-10;
}

fn sequenceMatches(s1: array<bool, 3>, s2: array<bool, 3>) -> bool {
    return s1[0] == s2[0] && s1[1] == s2[1] && s1[2] && s2[2];
}

@compute @workgroup_size(16, 16) fn simulateGames(
    @builtin(workgroup_id) id: vec3u, @builtin(local_invocation_index) index: u32 //the position of this workgroup (same for all within a workgroup)
) {
    let binIndex = id.x*workgroups1D*workgroups1D + id.y*workgroups1D + id.z;
    let randomIndex = index + 1000*(binIndex+1) + timeOffset;

    var sequence = array<bool, 3>(false, false, false); // [before-last, last, this]
    var i: u32 = 0;
    while (true) {
        i++;
        let thisFlip = random(randomIndex + i) > 0.5; //true (heads) if the random number is greater than 0.5
        sequence[0] = sequence[1];
        sequence[1] = sequence[2];
        sequence[2] = thisFlip;

        if (i >= 3) {
            if (sequenceMatches(sequence, array<bool, 3>(true, true, true))) {
                atomicAdd(&bins[binIndex], 1);
                break;
            }
            else if (sequenceMatches(sequence, array<bool, 3>(false, true, true))) {
                atomicAdd(&bins[binIndex], 0);
                break;
            }
        }
    }
}

`