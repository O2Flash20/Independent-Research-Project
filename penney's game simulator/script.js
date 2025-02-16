import simulateCode from "./shaders/simulate.wgsl.js"
import sumCode from "./shaders/sum.wgsl.js"



// it will use workgroups set up in 3d, so this is one dimension of the cube of workgroups
const simulateWorkgroups1D = 150 //max 322

function formatSequences(sequences) {
    let output = ""

    for (let i = 0; i < sequences.length; i++) {
        output += "array("
        for (let j = 0; j < sequences[0].length; j++) {
            output += `${sequences[i][j]},`
        }
        output += "),"
    }

    return output
}

function formatProbabilities(probabilities) {
    let output = ""
    for (let i = 0; i < probabilities.length; i++) {
        output += `${probabilities[i]},`
    }
    return output
}

// console.log(await getWinProbabilities([[0, 0, 1], [1, 0, 1], [0, 1, 0]], [0.2, 0.8]))
console.log(await getWinProbabilities([[2, 0, 1, 2], [1, 2, 1, 2], [0, 1, 0, 0], [1, 2, 2, 1]], [0.2, 0.7, 0.1]))

async function getWinProbabilities(sequences, probabilities) {
    let winRates = []
    for (let i = 0; i < sequences.length; i++) {
        winRates.push(await simulate(sequences, probabilities, i))
    }

    return winRates
}

// return the win rate of one sequence, the one at countedSequence
async function simulate(sequences, probabilities, countedSequence) {
    const adapter = await navigator.gpu?.requestAdapter()
    const device = await adapter?.requestDevice()
    if (!device) {
        alert("need a browser that supports WebGPU")
    }



    const simulateModule = device.createShaderModule({
        label: "penney's game simulating module",
        code: simulateCode
            .replace("_WORKGROUPS1D", simulateWorkgroups1D)
            .replace("_TIMEOFFSET", Date.now() % 100000) //a time offset for the random number so that it's different on each run
            .replace("_SEQUENCELENGTH", sequences[0].length)
            .replace("_VALUEOPTIONS", probabilities.length)
            .replace("_SEQUENCES", formatSequences(sequences))
            .replace("_NUMSEQUENCES", sequences.length)
            .replace("_PROBABILITIES", formatProbabilities(probabilities))
            .replace("_COUNTEDSEQUENCE", countedSequence)
    })

    console.log(
        simulateCode
            .replace("_WORKGROUPS1D", simulateWorkgroups1D)
            .replace("_TIMEOFFSET", Date.now() % 100000) //a time offset for the random number so that it's different on each run
            .replace("_SEQUENCELENGTH", sequences[0].length)
            .replace("_VALUEOPTIONS", probabilities.length)
            .replace("_SEQUENCES", formatSequences(sequences))
            .replace("_NUMSEQUENCES", sequences.length)
            .replace("_PROBABILITIES", formatProbabilities(probabilities))
            .replace("_COUNTEDSEQUENCE", 0)
    )

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
    for (let i = 0; i < numSteps - 1; i++) {
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
    encoder.copyBufferToBuffer(binsBuffer, 2 ** (numSteps + 1), resultBuffer2, 0, 4) //*because of integer overflow, we cant do the last step on the gpu. the last addition happens on the cpu where it can be handled properly by javascript

    device.queue.submit([encoder.finish()])

    await resultBuffer1.mapAsync(GPUMapMode.READ) //when its ready to be read
    const result1 = new Uint32Array(resultBuffer1.getMappedRange().slice())[0]
    resultBuffer1.unmap()

    await resultBuffer2.mapAsync(GPUMapMode.READ) //when its ready to be read
    const result2 = new Uint32Array(resultBuffer2.getMappedRange().slice())[0]
    resultBuffer2.unmap()

    return (result1 + result2) / (simulateWorkgroups1D ** 3 * 256)
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
    if (document.getElementById("resultsTable")){document.getElementById("resultsTable").remove()}
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
    table.id="resultsTable"
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
            topTriangle.style = `background: rgba(${topTriangleProb*255}, ${topTriangleProb*255}, ${topTriangleProb*255}, 255)`

            const bottomTriangle = document.getElementById(`${col}_${row}`)
            const bottomTriangleProb = 1-topTriangleProb
            bottomTriangle.innerText = toNearestFraction(bottomTriangleProb)
            bottomTriangle.style = `background: rgba(${bottomTriangleProb*255}, ${bottomTriangleProb*255}, ${bottomTriangleProb*255}, 255)`
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