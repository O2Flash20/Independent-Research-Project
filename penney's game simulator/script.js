import simulateCode from "./shaders/simulate.wgsl.js"
import sumCode from "./shaders/sum.wgsl.js"



// it will use workgroups set up in 3d, so this is one dimension of the cube of workgroups
const simulateWorkgroups1D = 322 //max 322


// turns the js array into input for a wgsl array
function formatSequence(sequence) {
    let output = ""
    for (let i = 0; i < sequence.length-1; i++) {
        output += `${sequence[i]}, `
    }
    output += `${sequence[sequence.length-1]}`

    return output
}

function generateComparison(sequenceLength) {
    let output = ""
    for (let i = 0; i < sequenceLength-1; i++) {
        output += `(s1[${i}] == s2[${i}]) && `
    }
    output += `(s1[${sequenceLength-1}] == s2[${sequenceLength-1}])`

    return output
}

// for a coin, valueOptions is 2; for a regular die, valueOptions is 6
async function simulate(sequence1, sequence2, valueOptions) {
    const adapter = await navigator.gpu?.requestAdapter()
    const device = await adapter?.requestDevice()
    if (!device) {
        alert("need a browser that supports WebGPU")
    }



    const simulateModule = device.createShaderModule({
        label: "penney's game simulating module",
        code: simulateCode
            .replace("_WORKGROUPS1D", simulateWorkgroups1D)
            .replace("_TIMEOFFSET", Date.now()%100000) //a time offset for the random number so that it's different on each run
            .replace("_SEQUENCELENGTH", sequence1.length)
            .replace("_VALUEOPTIONS", valueOptions)
            .replace("_SEQUENCE1", formatSequence(sequence1))
            .replace("_SEQUENCE2", formatSequence(sequence2))
            .replace("_SEQUENCECOMPARE", generateComparison(sequence1.length))
    })

    const simulatePipeline = device.createComputePipeline({
        label: "penney's game simulating pipeline",
        layout: "auto",
        compute: { module: simulateModule }
    })

    const binsBuffer = device.createBuffer({
        label: "buffer holding different entries for the results of groups of games",
        size: simulateWorkgroups1D ** 3 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    })

    const simulateBindGroup = device.createBindGroup({
        label: "bind group for simulating games",
        layout: simulatePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: binsBuffer } }
        ]
    })



    const sumModule = device.createShaderModule({
        label: "module to sum all the bins together",
        code: sumCode
    })

    const sumPipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: sumModule }
    })



    const encoder = device.createCommandEncoder()



    const pass = encoder.beginComputePass()
    pass.setPipeline(simulatePipeline)
    pass.setBindGroup(0, simulateBindGroup)
    pass.dispatchWorkgroups(simulateWorkgroups1D, simulateWorkgroups1D, simulateWorkgroups1D)



    pass.setPipeline(sumPipeline)

    const numSteps = Math.ceil(Math.log2(simulateWorkgroups1D ** 3)) //the number of steps it will take to get that done
    for (let i = 0; i < numSteps-1; i++) {
        const sumUniformArray = new Uint32Array(2)
        const thisStride = 2 ** i
        const sumWorkgroupsSize = Math.ceil(simulateWorkgroups1D / Math.pow(thisStride * 2, 1 / 3)) //the workgroups are called as a cube, this finds the dimensions of the cube needed to have enough to sum the entire buffer
        sumUniformArray.set([thisStride, sumWorkgroupsSize])

        const sumUniformBuffer = device.createBuffer({
            size: 8,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
        device.queue.writeBuffer(sumUniformBuffer, 0, sumUniformArray)

        const sumBindGroup = device.createBindGroup({
            label: `bindGroup for the sum shader, stride number ${thisStride}`,
            layout: sumPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: binsBuffer } },
                { binding: 1, resource: { buffer: sumUniformBuffer } }
            ]
        })

        pass.setBindGroup(0, sumBindGroup)
        pass.dispatchWorkgroups(sumWorkgroupsSize, sumWorkgroupsSize, sumWorkgroupsSize)
    }

    pass.end()

    const resultBuffer1 = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    })
    const resultBuffer2 = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    })


    encoder.copyBufferToBuffer(binsBuffer, 0, resultBuffer1, 0, 4)
    encoder.copyBufferToBuffer(binsBuffer, 2**(numSteps+1), resultBuffer2, 0, 4) //*because of integer overflow, we cant do the last step on the gpu. the last addition happens on the cpu where it can be handled properly by javascript

    device.queue.submit([encoder.finish()])

    await resultBuffer1.mapAsync(GPUMapMode.READ) //when its ready to be read
    const result1 = new Uint32Array(resultBuffer1.getMappedRange().slice())[0]
    resultBuffer1.unmap()

    await resultBuffer2.mapAsync(GPUMapMode.READ) //when its ready to be read
    const result2 = new Uint32Array(resultBuffer2.getMappedRange().slice())[0]
    resultBuffer2.unmap()

    return (result1 + result2) / (simulateWorkgroups1D ** 3 * 256)
}

// console.log(await simulate([1, 0, 0], [0, 0, 0], 2))

document.addEventListener("click", async function(){
    console.log(
        await simulate([0, 1, 0, 1], [1, 0, 1, 1], 2)
    )
})

function toNearestFraction(num, maxDenominator = 1000) {
    let bestNumerator = 1;
    let bestDenominator = 1;
    let bestError = Math.abs(num - bestNumerator / bestDenominator);

    for (let denominator = 1; denominator <= maxDenominator; denominator++) {
        const numerator = Math.round(num * denominator);
        const error = Math.abs(num - numerator / denominator);

        if (error < bestError) {
            bestNumerator = numerator;
            bestDenominator = denominator;
            bestError = error;
        }
    }

    return `${bestNumerator}/${bestDenominator}`;
}

/*
the compute shader runs to play games for two sequences against each other
    each work group plays n games, adds 1 to atomicInt shared value if player 1 wins and 0 if player 2 wins
    then, one of the work groups stores that total to a buffer
    then do the shader big adding thing to sum all of them up
    the chance of player 1 winning is [that number]/[total games simulated]

in js, it runs the shader for each combination
*/