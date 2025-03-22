import simulateCode from "./shaders/simulate.wgsl.js"
import sumCode from "./shaders/sum.wgsl.js"



// it will use workgroups set up in 3d, so this is one dimension of the cube of workgroups
const simulateWorkgroups1D = 30 //max 322

function formatSequences(sequences, maxSequenceLength) {
    let output = ""

    for (let i = 0; i < sequences.length; i++) {
        output += "array("
        for (let j = 0; j < maxSequenceLength; j++) {
            output += `${sequences[i][j] | 0},`
        }
        output += "),"
    }

    return output
}

function formatWgslArray(array) {
    let output = ""
    for (let i = 0; i < array.length; i++) {
        output += `${array[i]},`
    }
    return output
}

// returns the wgsl code that will check who will win and count it in the bins
function winChecksCode(numSequences) {
    let code = `var sequenceWon = false;`
    for (let i = 0; i < numSequences; i++) {
        code +=
            `
        if (i >= sequenceLengths[${i}] && sequencesMatch(sequences[${i}], sequenceLengths[${i}], flipsSequence)) {
            atomicAdd(&binsSequence${i}[binIndex], 1);
            sequenceWon = true;
        }
        `
    }
    code += `if (sequenceWon) {return;} //if anyone won, end the game. doing it this way makes ties count as a win for both`

    return code
}

await startSimulation([[2, 1, 0, 2, 1], [1, 2, 0, 1]], [1/3, 1/3, 1/3])

async function startSimulation(sequences, probabilities) {
    let wins = []
    for (let i = 0; i < sequences.length; i++) { wins.push(0) }

    for (let i = 0; i < 100; i++) {
        const thisRoundResults = await simulate(sequences, probabilities)
        for (let j = 0; j < thisRoundResults.length; j++) {
            wins[j] += thisRoundResults[j]
        }

        let displayWins = []
        for (let j = 0; j < sequences.length; j++) {
            displayWins.push(wins[j] / (30 * 30 * 30 * 16 * 16 * (i + 1)))
        }
        console.log(displayWins) //to get a progress update
    }

    for (let i = 0; i < wins.length; i++) {
        wins[i] /= (30 * 30 * 30 * 16 * 16 * 100) //divided by the number of games played to get an average
    }

    console.log(wins)
}

// play millions of games and see how many times each player won
async function simulate(sequences, probabilities) {
    const adapter = await navigator.gpu?.requestAdapter()
    const device = await adapter?.requestDevice()
    if (!device) {
        alert("need a browser that supports WebGPU")
    }



    const numSequences = sequences.length

    let maxSequenceLength = 0
    let sequenceLengths = []
    for (let i = 0; i < numSequences; i++) {
        const L = sequences[i].length
        if (L > maxSequenceLength) { maxSequenceLength = L }
        sequenceLengths.push(L)
    }


    let binsWgsl = ""
    for (let i = 0; i < numSequences; i++) {
        binsWgsl += `@group(0) @binding(${i}) var <storage, read_write> binsSequence${i}: array<atomic<u32>>;\n`
    }


    const simulateModule = device.createShaderModule({
        label: "penney's game simulating module",
        code: simulateCode
            .replace("_WORKGROUPS1D", simulateWorkgroups1D)
            .replace("_TIMEOFFSET", Date.now() % 100000) //a time offset for the random number so that it's different on each run
            .replace("_MAXSEQUENCELENGTH", maxSequenceLength)
            .replace("_VALUEOPTIONS", probabilities.length)
            .replace("_SEQUENCES", formatSequences(sequences, maxSequenceLength))
            .replace("_NUMSEQUENCES", numSequences)
            .replace("_SEQUENCELENGTHS", formatWgslArray(sequenceLengths))
            .replace("_PROBABILITIES", formatWgslArray(probabilities))
            .replace("_BINS", binsWgsl)
            .replace("_WINCHECKS", winChecksCode(numSequences))
    })

    const simulatePipeline = device.createComputePipeline({
        label: "penney's game simulating pipeline",
        layout: "auto",
        compute: { module: simulateModule }
    })

    let binsBuffers = [] //create one bins buffer for each sequence: this will be where 
    let bindGroupEntries = []
    for (let i = 0; i < numSequences; i++) {
        binsBuffers.push(
            device.createBuffer({
                label: `buffer holding entries for wins of sequence ${i}`,
                size: simulateWorkgroups1D ** 3 * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            })
        )

        bindGroupEntries.push(
            { binding: i, resource: { buffer: binsBuffers[i] } }
        )
    }



    const simulateBindGroup = device.createBindGroup({
        label: "bind group for simulating games",
        layout: simulatePipeline.getBindGroupLayout(0),
        entries: bindGroupEntries
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


    for (let i = 0; i < numSequences; i++) { //for each sequence, sum up its wins

        const numSteps = Math.ceil(Math.log2(simulateWorkgroups1D ** 3)) //the number of steps it will take to get that done
        for (let j = 0; j < numSteps; j++) {
            const sumUniformArray = new Uint32Array(2)
            const thisStride = 2 ** j
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
                    { binding: 0, resource: { buffer: binsBuffers[i] } },
                    { binding: 1, resource: { buffer: sumUniformBuffer } }
                ]
            })

            pass.setBindGroup(0, sumBindGroup)
            pass.dispatchWorkgroups(sumWorkgroupsSize, sumWorkgroupsSize, sumWorkgroupsSize)
        }

    }


    pass.end()


    let resultsBuffers = []
    for (let i = 0; i < numSequences; i++) {
        resultsBuffers.push(
            device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            })
        )

        encoder.copyBufferToBuffer(binsBuffers[i], 0, resultsBuffers[i], 0, 4)
    }

    device.queue.submit([encoder.finish()])

    let wins = []
    for (let i = 0; i < numSequences; i++) {
        await resultsBuffers[i].mapAsync(GPUMapMode.READ) //when its ready to be read
        wins.push(new Uint32Array(resultsBuffers[i].getMappedRange().slice())[0])
        resultsBuffers[i].unmap()
    }

    return wins
}

function indexToSequence(index, sequenceLength, valueOptions) {
    let result = []
    for (let i = sequenceLength - 1; i >= 0; i--) {
        result.push(Math.floor(index / Math.pow(valueOptions, i)) % valueOptions)
    }
    return result
}

// generateResultsTable(3, 2)

async function generateResultsTable(sequenceLength, valueOptions) {
    if (document.getElementById("resultsTable")) { document.getElementById("resultsTable").remove() }
    generateHTMLTable(sequenceLength, valueOptions)

    // compared to the html table to be displayed, this one starts at the top right, and fills in right to left then top to bottom
    // it will only contain the top right triangle of the table, because the rest is flipped
    let output = []

    const numSequences = Math.pow(valueOptions, sequenceLength)
    for (let row = 0; row < numSequences; row++) {
        output.push([])
        for (let col = 0; col < numSequences - 1 - row; col++) { //the weird end condition is to make the triangle
            output[row].push(
                await simulate(
                    indexToSequence(row, sequenceLength, valueOptions),
                    indexToSequence(numSequences - 1 - col, sequenceLength, valueOptions), valueOptions
                )
            )
            updateHTMLTable(output, numSequences)
        }
    }

    return output
}

function generateHTMLTable(sequenceLength, valueOptions) {
    const numSequences = Math.pow(valueOptions, sequenceLength)

    const table = document.createElement("table")
    table.id = "resultsTable"
    document.body.append(table)

    const headerRow = document.createElement("tr")
    table.append(headerRow)

    headerRow.append(document.createElement("td"))
    for (let i = 0; i < numSequences; i++) {
        const thisSequence = indexToSequence(i, sequenceLength, valueOptions)
        const thisCell = document.createElement("td")
        thisCell.innerText = thisSequence.join(", ")
        headerRow.append(thisCell)
    }

    for (let i = 0; i < numSequences; i++) {
        const rowSequence = indexToSequence(i, sequenceLength, valueOptions)

        const thisRow = document.createElement("tr")
        table.append(thisRow)

        const rowHeader = document.createElement("td")
        rowHeader.innerText = rowSequence.join(", ")
        thisRow.append(rowHeader)

        for (let j = 0; j < numSequences; j++) {
            const columnSequence = indexToSequence(j, sequenceLength, valueOptions)

            const thisCell = document.createElement("td")
            if (i !== j) {
                thisCell.id = `${i}_${j}`
                thisCell.innerText = "Calculating"
            }
            else {
                thisCell.innerText = "-"
            }
            thisRow.append(thisCell)
        }
    }
}

function updateHTMLTable(jsTable, numSequences) {
    for (let row = 0; row < jsTable.length; row++) {
        for (let i = 0; i < jsTable[row].length; i++) {
            const col = numSequences - 1 - i

            const topTriangle = document.getElementById(`${row}_${col}`)
            const topTriangleProb = jsTable[row][i]
            topTriangle.innerText = toNearestFraction(topTriangleProb)
            topTriangle.style = `background: rgba(${topTriangleProb * 255}, ${topTriangleProb * 255}, ${topTriangleProb * 255}, 255)`

            const bottomTriangle = document.getElementById(`${col}_${row}`)
            const bottomTriangleProb = 1 - topTriangleProb
            bottomTriangle.innerText = toNearestFraction(bottomTriangleProb)
            bottomTriangle.style = `background: rgba(${bottomTriangleProb * 255}, ${bottomTriangleProb * 255}, ${bottomTriangleProb * 255}, 255)`
        }
    }
}

function toNearestFraction(num, maxDenominator = 50) {
    let bestNumerator = 1
    let bestDenominator = 1
    let bestError = Math.abs(num - bestNumerator / bestDenominator)

    for (let denominator = 1; denominator <= maxDenominator; denominator++) {
        const numerator = Math.round(num * denominator)
        const error = Math.abs(num - numerator / denominator)

        if (error < bestError) {
            bestNumerator = numerator
            bestDenominator = denominator
            bestError = error
        }
    }

    return `${bestNumerator}/${bestDenominator}`
}

/*
Todo:
make the table more clear with labels
use the fact that the table is practically diagonally symmetrical with 1-p so do half the calculations
add ui to change the settings
add multiple players and multiple sequences per player
*/