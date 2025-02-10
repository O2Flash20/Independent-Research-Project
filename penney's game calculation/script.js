function getReturn(sequence1, sequence2, probabilities) {
    const k = sequence1.length

    let v = 0

    for (let s = 1; s <= k; s++) {
        let p = 1
        for (let i = 0; i <= k - s; i++) {
            p *= sequence1[s + i - 1] == sequence2[i] ? (1 / probabilities[sequence1[s + i - 1]]) : 0
        }
        v += p
    }

    return v
}

function getWinRate(sequence1, sequence2, probabilities) {
    return (getReturn(sequence2, sequence2, probabilities) - getReturn(sequence2, sequence1, probabilities)) /
        (getReturn(sequence1, sequence1, probabilities) - getReturn(sequence1, sequence2, probabilities) + getReturn(sequence2, sequence2, probabilities) - getReturn(sequence2, sequence1, probabilities))
}

function indexToSequence(index, sequenceLength, valueOptions) {
    let result = []
    for (let i = sequenceLength - 1; i >= 0; i--) {
        result.push(Math.floor(index / Math.pow(valueOptions, i)) % valueOptions)
    }
    return result
}

function generateTable(sequenceLength, probabilities) {
    if (document.getElementById("resultsTable")) {document.getElementById("resultsTable").remove()}

    const valueOptions = probabilities.length

    const numSequences = Math.pow(valueOptions, sequenceLength)

    const table = document.createElement("table")
    table.id="resultsTable"
    document.body.append(table)

    const headerRow = document.createElement("tr")
    table.append(headerRow)

    const topLeftCell = document.createElement("td")
    topLeftCell.innerText = "P2↓ / P1→"
    headerRow.append(topLeftCell)
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
            const colSequence = indexToSequence(j, sequenceLength, valueOptions)

            const thisCell = document.createElement("td")
            if (i !== j) {
                const winRate = getWinRate(rowSequence, colSequence, probabilities)
                thisCell.innerText = winRate.toFixed(2)
                thisCell.style = `background: rgba(${winRate*255}, ${winRate*255}, ${winRate*255}, 255)`
            }
            else {
                thisCell.innerText = "-"
            }
            thisRow.append(thisCell)
        }
    }
}

document.getElementById("probInput").addEventListener("input", function(e){
    const p = parseFloat(e.target.value)
    generateTable(5, [p, (1-p)])

    console.log([p, 1-p])
}) 