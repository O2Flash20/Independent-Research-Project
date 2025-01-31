export default /*wgsl*/ `

struct Uniforms {
    stride: u32,
    numInvocations: u32
};

@group(0) @binding(0) var<storage, read_write> data: array<atomic<u32>>;
@group(0) @binding(1) var<uniform> u:Uniforms;

@compute @workgroup_size(1) fn computeSum(
    @builtin(global_invocation_id) id:vec3<u32>
){
    var thisIndex = id.x*u.numInvocations*u.numInvocations+id.y*u.numInvocations+id.z;
    thisIndex *= u.stride*2; //make it line up with the original buffer according to stride. if stride is 1, every other entry is added. if stride is 2, every other is skipped and the next is added
    atomicAdd(&data[thisIndex], atomicLoad(&data[thisIndex+u.stride]));
}

`