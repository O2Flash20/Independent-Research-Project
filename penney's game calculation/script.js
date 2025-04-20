// Matrix.entries[row][column]
class Matrix {
    constructor(rows, columns) {
        this.rows = rows
        this.columns = columns

        this.entries = []

        for (let j = 0; j < rows; j++) {
            let thisRow = []
            for (let i = 0; i < columns; i++) {
                thisRow.push(i == j ? 1 : 0)
            }
            this.entries.push(thisRow)
        }
    }

    multiplyScalar(scalar) {
        let multiplied = new Matrix(this.rows, this.columns)
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
                multiplied.entries[i][j] = this.entries[i][j] * scalar
            }
        }

        return multiplied
    }

    determinant() {
        // if the matrix is just a number, return that number
        if (this.rows == 1 && this.columns == 1) { return this.entries[0][0] }

        // if the number of rows and columns is 2, just get the number the quick way
        if (this.rows == 2 && this.columns == 2) {
            return this.entries[0][0] * this.entries[1][1] - this.entries[0][1] * this.entries[1][0]
        }

        let solution = 0

        for (let i = 0; i < this.columns; i++) { //go through the top row
            const entry = this.entries[0][i]
            const sign = (-1) ** (2 + i) //-1(row+column) but with the index starting at 1 instead of 0

            const minorMatrix = new Matrix(this.rows - 1, this.columns - 1)
            // fill in the matrix
            let minorEntries = []
            for (let j = 1; j < this.rows; j++) {
                let thisRow = []
                for (let k = 0; k < this.columns - 1; k++) {
                    thisRow.push(k < i ? this.entries[j][k] : this.entries[j][k + 1])
                }
                minorEntries.push(thisRow)
            }
            minorMatrix.entries = minorEntries
            const minor = minorMatrix.determinant(false)

            solution += entry * sign * minor
        }

        return solution
    }

    cofactor() {
        if (this.rows == 1 && this.columns == 1) { return this } //if it's just a number, return that number

        let cofactor = new Matrix(this.rows, this.columns)

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {

                let minorMatrix = new Matrix(this.rows - 1, this.columns - 1)
                let minorMatrixEntries = []
                for (let k = 0; k < this.rows - 1; k++) {
                    let thisRow = []
                    for (let l = 0; l < this.columns - 1; l++) {
                        const rowIndex = k < i ? k : k + 1; const columnIndex = l < j ? l : l + 1
                        thisRow.push(
                            this.entries
                            [rowIndex]
                            [columnIndex]
                        )
                    }
                    minorMatrixEntries.push(thisRow)
                }
                minorMatrix.entries = minorMatrixEntries

                cofactor.entries[i][j] = minorMatrix.determinant() * (-1) ** (i + 1 + j + 1)
            }
        }

        return cofactor
    }

    transpose() {
        let transpose = new Matrix(this.rows, this.columns)
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
                transpose.entries[i][j] = this.entries[j][i]
            }
        }
        return transpose
    }

    adjoint() {
        return this.cofactor().transpose()
    }

    inverse() {
        return this.adjoint().multiplyScalar(1 / this.determinant())
    }

    multiplyVector(vector) {
        if (this.columns !== vector.rows) { console.log("Matrix multiplication not gonna workie") }
        let product = new Matrix(vector.rows, 1)
        product.entries[0][0] = 0 //make it be all 0s to start

        for (let i = 0; i < vector.rows; i++) {
            for (let j = 0; j < vector.rows; j++) {
                product.entries[i][0] += vector.entries[j][0] * this.entries[i][j]
            }
        }

        return product
    }
}

function getReturn(sequenceAppeared, thisSequence, probabilities) {
    const LA = sequenceAppeared.length
    const LB = thisSequence.length

    let v = 0

    for (let s = 1; s <= Math.min(LA, LB); s++) {
        let p = 1
        for (let i = 1; i <= s; i++) {
            p *= (thisSequence[i - 1] == sequenceAppeared[LA - s + i - 1] ? 1 : 0) / probabilities[thisSequence[i - 1]]
        }

        v += p
    }

    return v
}

function getNetProfit(sequenceAppeared, thisSequence, sequences, probabilities) {
    const n = sequences.length

    let otherSequencesSum = 0
    for (let k = 1; k <= n; k++) {
        otherSequencesSum += getReturn(sequenceAppeared, sequences[k - 1], probabilities)
    }
    return 1 / (n - 1) * (n * getReturn(sequenceAppeared, thisSequence, probabilities) - otherSequencesSum)
}

// checks if this sequence contains another sequence. if it does, it cannot win
function containsOtherSequence(sequences, index) {
    const S = sequences[index]

    // for each other sequence
    for (let i = 0; i < sequences.length; i++) {
        if (i == index) { continue }
        const O = sequences[i]

        // step through this one and see if it matches up
        for (let j = S.length - O.length; j >= 0; j--) { //note: if O is longer than S this never runs, so that's dealt with
            let match = true
            for (let k = 0; k < O.length; k++) {
                if (S[j + k] !== O[k]) { match = false; break } //this one isnt a match
            }
            if (match) { return true }
        }
    }

    return false
}

// checks if the end of this sequence matches with the end of another sequence. if it does, both are disqualitied
function isEndOfOtherSequence(sequences, index) {
    const S = sequences[index]

    for (let i = 0; i < sequences.length; i++) {
        const O = sequences[i]
        if (i == index || S.length > O.length) { continue }

        let match = true
        for (let j = 0; j < S.length; j++) {
            if (O[O.length - S.length + j] !== S[j]) { match = false; break }
        }
        if (match) { return true }
    }

    return false
}

function getWinProbabilities(sequences, probabilities) {

    // removing sequences that contain another
    let sequencesTrimmed = []
    let removedSequences = []
    for (let i = 0; i < sequences.length; i++) {
        if (containsOtherSequence(sequences, i) || isEndOfOtherSequence(sequences, i)) {
            removedSequences.push(i)
        }
        else {
            sequencesTrimmed.push(sequences[i])
        }
    }

    // if no sequences remain after being trimmed, return an empty array
    if (sequencesTrimmed.length < 2) { return new Array(sequences.length) }

    const n = sequencesTrimmed.length

    // fill the main part of the matrix
    let M = new Matrix(n, sequencesTrimmed.length)
    for (let row = 0; row < n - 1; row++) {
        for (let col = 0; col < n; col++) {
            M.entries[row][col] = getNetProfit(sequencesTrimmed[col], sequencesTrimmed[row], sequencesTrimmed, probabilities)
        }
    }
    // fill in the last row with 1
    for (let col = 0; col < n; col++) {
        M.entries[n - 1][col] = 1
    }

    let V = new Matrix(n, 1)
    for (let i = 0; i < n - 1; i++) {
        V.entries[i][0] = 0
    }
    V.entries[n - 1][0] = 1

    const solutionsVector = M.inverse().multiplyVector(V)
    let solutions = []
    for (let i = 0; i < n; i++) {
        solutions.push(solutionsVector.entries[i][0])
    }

    // replace back the ones removed for containing another sequence, but with probability 0
    let winRates = []
    let indexInRemoved = 0
    let indexInSolutions = 0
    for (let i = 0; i < sequences.length; i++) {
        if (removedSequences[indexInRemoved] == i) { winRates.push(0); indexInRemoved++ }
        else { winRates.push(solutions[indexInSolutions]); indexInSolutions++ }
    }

    return winRates

}

function indexToSequence(index, sequenceLength, outcomePossibilities) {
    let result = []
    for (let i = 0; i < sequenceLength; i++) {
        result.push(Math.floor(index / Math.pow(outcomePossibilities, i)) % outcomePossibilities)
    }
    return result
}

document.getElementById("numOutcomesInput").addEventListener("input", function (e) {
    setupProbabilitiesInputs(e.target.value)
    setupPlayersInputs()
})


let sequenceLengths = []
setupSequenceLengths(2)
function setupSequenceLengths(numSequences) {
    const H = document.getElementById("sequenceLengthsHolder")
    H.innerHTML = ""

    // sequenceLengths = []

    while (numSequences > sequenceLengths.length) {
        sequenceLengths.push(3)
    }

    while (numSequences < sequenceLengths.length) {
        sequenceLengths.splice(-1, 1)
    }

    for (let i = 0; i < numSequences; i++) {
        const div = document.createElement("div")
        div.classList.add("outcomeProbabilityDiv")
        H.append(div)

        const label = document.createElement("span")
        label.innerText = `Player ${i + 1}'s Length:`
        div.append(label)

        const input = document.createElement("input")
        input.type = "number"
        input.value = sequenceLengths[i] || 3
        input.min = 1
        input.max = 100
        input.step = 1
        div.append(input)

        input.addEventListener("input", function (e) {
            sequenceLengths[i] = parseFloat(e.target.value)
            setupPlayersInputs()
        })

        // sequenceLengths[i] = 3
    }

}

let outcomesProbabilities = []
setupProbabilitiesInputs(2)
function setupProbabilitiesInputs(numProbabilities) {
    const H = document.getElementById("outcomesProbabilitiesHolder")
    H.innerHTML = ""

    outcomesProbabilities = []

    const n = numProbabilities
    for (let i = 0; i < n; i++) {
        const div = document.createElement("div")
        div.classList.add("outcomeProbabilityDiv")
        H.append(div)

        const label = document.createElement("span")
        label.innerText = `${i}: `
        div.append(label)

        const input = document.createElement("input")
        input.type = "number"
        input.value = 100 / n
        input.min = 0
        input.max = 100
        input.step = 0.1
        div.append(input)

        input.addEventListener("input", function (e) {
            outcomesProbabilities[i] = e.target.value / 100

            let sum = 0
            for (let i = 0; i < n; i++) {
                sum += outcomesProbabilities[i]
            }
            if (Math.abs(sum - 1) >= 0.001) {
                document.getElementById("outcomesProbabilitiesWarning").innerText = "Warning: these probabilities do not add to 100%!"
            }
            else {
                document.getElementById("outcomesProbabilitiesWarning").innerText = ""
            }
        })

        const percent = document.createElement("span")
        percent.innerText = "%"
        div.append(percent)

        outcomesProbabilities[i] = 1 / n
    }
}


document.getElementById("numPlayersInput").addEventListener("input", function (e) {
    setupSequenceLengths(document.getElementById("numPlayersInput").value)
    setupPlayersInputs()
})

let sequences = []
setupPlayersInputs()
function setupPlayersInputs() {
    const numPlayers = document.getElementById("numPlayersInput").value
    const outcomePossibilities = outcomesProbabilities.length

    // sets up or removes the button to create a results table depending on if there are two players
    document.getElementById("tableCreatorDiv").innerHTML = ""

    if (numPlayers == 2 && Math.pow(Math.max(sequenceLengths[0], sequenceLengths[1]), outcomePossibilities) < 250) {
        addCreateTableButton()
    }
    if (numPlayers == 3 && Math.pow(Math.max(sequenceLengths[0], sequenceLengths[1]), outcomePossibilities) < 250) {
        addCreate3dTableButton()
    }

    const H = document.getElementById("playerSequencesHolder")
    H.innerHTML = ""

    const oldSequences = sequences //keep sequences we used to have there if still valid
    sequences = []

    for (let i = 0; i < numPlayers; i++) {
        const playerDiv = document.createElement("div")
        playerDiv.classList.add("playerDiv")
        H.append(playerDiv)

        const playerLabel = document.createElement("span")
        playerLabel.innerText = `Player ${i + 1}: `
        playerDiv.append(playerLabel)

        const thisPlayerSequence = indexToSequence(i, sequenceLengths[i], outcomePossibilities) //used in case the old sequence doesnt exist or isnt valid anymore

        sequences.push([])

        for (let j = 0; j < sequenceLengths[i]; j++) {
            const sequenceEntryDiv = document.createElement("div")
            sequenceEntryDiv.classList.add("sequenceEntryDiv")
            playerDiv.append(sequenceEntryDiv)

            const input = document.createElement("input")
            let thisValue = 0
            if (oldSequences[i] && oldSequences[i][j]) {
                thisValue = Math.min(oldSequences[i][j], outcomePossibilities - 1)
            }
            else {
                thisValue = thisPlayerSequence[j]
            }
            input.value = thisValue
            input.type = "number"
            input.min = 0
            input.max = outcomePossibilities - 1
            sequenceEntryDiv.append(input)

            input.addEventListener("input", function (e) {
                sequences[i][j] = parseInt(e.target.value)
            })

            if (j !== sequenceLengths[i] - 1) {
                const separator = document.createElement("span")
                separator.innerText = ", "
                sequenceEntryDiv.append(separator)
            }

            sequences[i].push(thisValue)
        }

        H.append(document.createElement("br"))
    }
}


document.getElementById("calculateChancesButton").addEventListener("click", function () {
    displayWinChances()
})
function displayWinChances() {
    const chances = getWinProbabilities(sequences, outcomesProbabilities)
    const H = document.getElementById("winChancesDisplay")
    H.innerHTML = ""

    for (let i = 0; i < chances.length; i++) {
        const elt = document.createElement("p")
        const F = toNearestFraction(chances[i], 100)
        elt.innerText = `Player ${i + 1}: ${parseFloat((chances[i] * 100).toFixed(5))}% chance of winning (${F.error > 0.00001 ? "~" : ""}${F.fraction})`
        H.append(elt)
    }
}

function toNearestFraction(num, maxDenominator = 50) {
    if (isNaN(num)) { return { fraction: "NaN", error: 0 } }

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

    return { fraction: `${bestNumerator}/${bestDenominator}`, error: bestError }
}


function addCreateTableButton() {
    const H = document.getElementById("tableCreatorDiv")

    const button = document.createElement("button")
    button.innerText = "Create table for all possible games"
    button.addEventListener("click", function () {
        createTable()
    })

    H.append(button)
}

function createTable() {
    const H = document.getElementById("tableCreatorDiv")
    H.innerHTML = "" //clear the element
    addCreateTableButton() //add the button back

    const table = document.createElement("table")
    H.append(table)

    // const sequenceLength = sequences[0].length
    const valueOptions = outcomesProbabilities.length
    // const numSequences = Math.pow(valueOptions, sequenceLength)

    const sequenceLength0 = sequenceLengths[0]
    const sequenceLength1 = sequenceLengths[1]
    const numSequences0 = Math.pow(valueOptions, sequenceLength0)
    const numSequences1 = Math.pow(valueOptions, sequenceLength1)
    const maxNumSequences = Math.max(numSequences0, numSequences1)

    for (let i = 0; i < numSequences0; i++) {
        const rowSequence = indexToSequence(i, sequenceLength0, valueOptions)

        const thisRow = document.createElement("tr")
        table.append(thisRow)

        for (let j = 0; j < numSequences1; j++) {
            const colSequence = indexToSequence(j, sequenceLength1, valueOptions)

            const thisCell = document.createElement("td")
            const winRate = getWinProbabilities([rowSequence, colSequence], outcomesProbabilities)[0]

            if (typeof winRate == "number") {
                thisCell.title = `As [${rowSequence.join("")}] against [${colSequence.join("")}]: ${(winRate * 100).toFixed(2)}% chance of winning`
                thisCell.style = `background: rgba(${winRate * 255}, ${winRate * 255}, ${winRate * 255}, 255); width: ${500 / maxNumSequences}px; height: ${500 / maxNumSequences}px;`
            }
            else {
                thisCell.title = `As [${rowSequence.join("")}] against [${colSequence.join("")}]: Game Invalid - Sequences end the same`
                thisCell.style = `background: rgb(106, 0, 0); width: ${500 / maxNumSequences}px; height: ${500 / maxNumSequences}px;`
            }

            thisRow.append(thisCell)
        }
    }

    const info = document.createElement("p")
    info.innerText = "Hover over a square to see the game it represents."
    H.append(info)
}

function addCreate3dTableButton() {
    const H = document.getElementById("tableCreatorDiv")

    const button = document.createElement("button")
    button.innerText = "Create table for all possible games"
    button.addEventListener("click", function () {
        create3dTable("All Players")
    })

    H.append(button)
}

function create3dTable(playerShown) {
    const H = document.getElementById("tableCreatorDiv")
    H.innerHTML = "" //clear the element
    addCreate3dTableButton() //add the button back

    // const sequenceLength = sequences[0].length
    const valueOptions = outcomesProbabilities.length
    // const numSequences = Math.pow(valueOptions, sequenceLength)

    const sequenceLength0 = sequenceLengths[0]
    const sequenceLength1 = sequenceLengths[1]
    const sequenceLength2 = sequenceLengths[2]
    const numSequences0 = Math.pow(valueOptions, sequenceLength0)
    const numSequences1 = Math.pow(valueOptions, sequenceLength1)
    const numSequences2 = Math.pow(valueOptions, sequenceLength2)
    const maxNumSequences = Math.max(numSequences0, numSequences1, numSequences2)

    let tables = []
    for (let i = 0; i < numSequences2; i++) {
        let t = document.createElement("table")
        t.id = `table${i}`
        tables.push(t)
    }

    // creates one table for each sequence that player 3 could be
    for (let k = 0; k < numSequences2; k++) {
        const sliceSequence = indexToSequence(k, sequenceLength2, valueOptions)

        for (let i = 0; i < numSequences0; i++) {
            const rowSequence = indexToSequence(i, sequenceLength0, valueOptions)

            const thisRow = document.createElement("tr")
            tables[k].append(thisRow)

            for (let j = 0; j < numSequences1; j++) {
                const colSequence = indexToSequence(j, sequenceLength1, valueOptions)

                const thisCell = document.createElement("td")
                const winRate = getWinProbabilities([rowSequence, colSequence, sliceSequence], outcomesProbabilities)

                let gameValid = true
                for (let m = 0; m < winRate.length; m++) {
                    if (typeof winRate[m] !== "number") { gameValid = false; break }
                }

                if (gameValid) {
                    thisCell.title = `Player 1 as ${rowSequence.join("")}: ${(winRate[0] * 100).toFixed(2)}% chance of winning\nPlayer 2 as ${colSequence.join("")}: ${(winRate[1] * 100).toFixed(2)}% chance of winning\nPlayer 3 as ${sliceSequence.join("")}: ${(winRate[2] * 100).toFixed(2)}% chance of winning`
                    if (playerShown == "All Players") {
                        thisCell.style = `background: rgba(${winRate[0] * 255}, ${winRate[1] * 255}, ${winRate[2] * 255}, 255); width: ${500 / maxNumSequences}px; height: ${500 / maxNumSequences}px;`
                    }
                    else if (playerShown == "Player 1") {
                        thisCell.style = `background: rgba(${winRate[0] * 255}, ${winRate[0] * 255}, ${winRate[0] * 255}, 255); width: ${500 / maxNumSequences}px; height: ${500 / maxNumSequences}px;`
                    }
                    else if (playerShown == "Player 2") {
                        thisCell.style = `background: rgba(${winRate[1] * 255}, ${winRate[1] * 255}, ${winRate[1] * 255}, 255); width: ${500 / maxNumSequences}px; height: ${500 / maxNumSequences}px;`
                    }
                    else if (playerShown == "Player 3") {
                        thisCell.style = `background: rgba(${winRate[2] * 255}, ${winRate[2] * 255}, ${winRate[2] * 255}, 255); width: ${500 / maxNumSequences}px; height: ${500 / maxNumSequences}px;`
                    }
                }
                else {
                    thisCell.title = `Player 1 as ${rowSequence.join("")}\nPlayer 2 as ${colSequence.join("")}\nPlayer 3 as ${sliceSequence.join("")}\nGame Invalid - Sequences end the same or one player will always win`
                    // thisCell.style = `background-image: url("../crossedCell.png"); width: ${500 / maxNumSequences}px; height: ${500 / maxNumSequences}px; background-size: ${500 / maxNumSequences}px ${500 / maxNumSequences}px; background-repeat: no-repeat;`
                    thisCell.style = `background: black; width: ${500 / maxNumSequences}px; height: ${500 / maxNumSequences}px; background-size: ${500 / maxNumSequences}px ${500 / maxNumSequences}px; background-repeat: no-repeat;`
                }

                thisRow.append(thisCell)
            }
        }

    }


    const info = document.createElement("p")
    info.innerText = "Hover over a square to see the game it represents."
    H.append(info)

    const tableArea = document.createElement("div")
    H.append(tableArea)
    tableArea.append(tables[0])

    const sliceSlider = document.createElement("input")
    sliceSlider.type = "range"
    sliceSlider.step = 1
    sliceSlider.max = numSequences2-1
    sliceSlider.min = 0
    sliceSlider.value= 0
    H.append(sliceSlider)

    const sliceSliderLabel = document.createElement("span")
    sliceSliderLabel.innerText = `Player 3: ${indexToSequence(0, sequenceLength2, valueOptions).join("")}`
    H.append(sliceSliderLabel)

    sliceSlider.addEventListener("input", function () {
        let V = parseInt(sliceSlider.value)
        sliceSliderLabel.innerText = `Player 3: ${indexToSequence(V, sequenceLength2, valueOptions).join("")}`
        tableArea.innerHTML = ""
        tableArea.append(tables[V])
    })

    H.append(document.createElement("br"))

    const playerShownLabel = document.createElement("span")
    playerShownLabel.innerHTML = "Player Shown: "
    H.append(playerShownLabel)

    const playerShownElt = document.createElement("select")
    playerShown.id = "3dTablePlayerShown"
    H.append(playerShownElt)

    const allPlayersShown = document.createElement("option")
    allPlayersShown.innerText = "All Players"
    playerShownElt.append(allPlayersShown)

    const Player1Shown = document.createElement("option")
    Player1Shown.innerText = "Player 1"
    playerShownElt.append(Player1Shown)

    const Player2Shown = document.createElement("option")
    Player2Shown.innerText = "Player 2"
    playerShownElt.append(Player2Shown)

    const Player3Shown = document.createElement("option")
    Player3Shown.innerText = "Player 3"
    playerShownElt.append(Player3Shown)

    playerShownElt.value = playerShown

    playerShownElt.addEventListener("change", function() {
        create3dTable(playerShownElt.value)
    })
}

// not exactly right
function getBestSequence(opponentSequence, outcomePossibilities) {
    const sequenceLength = opponentSequence.length

    let thisSequence = []
    for (let i = 0; i < sequenceLength; i++) {
        let iA = 0
        for (let j = 0; j < sequenceLength; j++) {
            iA += opponentSequence[j] * Math.pow(outcomePossibilities, j + 1)
        }
        thisSequence.push(
            (Math.floor((iA % Math.pow(outcomePossibilities, sequenceLength)) / Math.pow(outcomePossibilities, i)) % outcomePossibilities)
        )
    }

    return thisSequence
}

// gives each sequence a number
function iB(opponentSequence, outcomePossibilities) {
    let sum = 0
    for (let i = 0; i < opponentSequence.length; i++) {
        sum += opponentSequence[i] * Math.pow(outcomePossibilities, i)
    }

    return (outcomePossibilities * sum) % Math.pow(outcomePossibilities, opponentSequence.length)
}

// index back to sequence
function iBToSequence(iB, sequenceLength, outcomePossibilities) {
    let thisSequence = []
    for (let i = 0; i < sequenceLength; i++) {
        thisSequence.push(
            Math.floor(iB / Math.pow(outcomePossibilities, i)) % outcomePossibilities
        )
    }

    return thisSequence
}

// gets the index offset from the simple prediction for the best sequence for player 2
function bestOffset(opponentSequence, outcomePossibilities) {
    let probabilities = []
    for (let i = 0; i < outcomePossibilities; i++) {
        probabilities.push(1 / outcomePossibilities)
    }

    let bestWinRate = 0
    let bestIndex = -1
    for (let i = 0; i < outcomePossibilities; i++) {
        let thisWinRate = getWinProbabilities([
            iBToSequence(iB(opponentSequence, outcomePossibilities) + i, opponentSequence.length, outcomePossibilities),
            opponentSequence
        ], probabilities)[0]
        if (thisWinRate > bestWinRate) {
            bestWinRate = thisWinRate
            bestIndex = i
        }
    }

    return bestIndex
}

// gets the offset for each sequence in the two player game
function actualBest(sequenceLength, outcomePossibilities) {
    let points = ""
    for (let i = 0; i < Math.pow(outcomePossibilities, sequenceLength); i++) {
        const thisSequence = indexToSequence(i, sequenceLength, outcomePossibilities)
        const offset = bestOffset(thisSequence, outcomePossibilities)

        points += `(${i}, ${offset}), `
    }

    console.log(points)
}
// do this for all sequences and visualize whether offset 0, 1, 2, ... is the best

function getPlayer2BestStrategy(opponentSequence, outcomePossibilities) {
    let probabilities = []
    for (let i = 0; i < outcomePossibilities; i++) {
        probabilities.push(1 / outcomePossibilities)
    }

    let bestWinRate = 0
    let bestSequence
    for (let i = 0; i < Math.pow(outcomePossibilities, opponentSequence.length); i++) {
        const thisSequence = indexToSequence(i, opponentSequence.length, outcomePossibilities)
        const winRate = getWinProbabilities([thisSequence, opponentSequence], probabilities)[0]

        if (winRate > bestWinRate) {
            bestWinRate = winRate
            bestSequence = thisSequence
        }
    }

    return [bestWinRate, bestSequence]
}

// gets the win rate of player 1's sequence assuming player 2 chooses the optimal sequence in response, in other words: the worst possible win rate for player 1
function player1SequenceWinRate(sequence, outcomePossibilities) {
    let probabilities = []
    for (let i = 0; i < outcomePossibilities; i++) {
        probabilities.push(1 / outcomePossibilities)
    }

    let lowestWinChance = 1
    for (let i = 0; i < Math.pow(outcomePossibilities, sequence.length); i++) {
        const opponentSequence = indexToSequence(i, sequence.length, outcomePossibilities)

        let sequencesAreSame = true
        for (let j = 0; j < sequence.length; j++) {
            if (sequence[j] !== opponentSequence[j]) { sequencesAreSame = false; break }
        }
        if (!sequencesAreSame) {
            lowestWinChance = Math.min(
                lowestWinChance,
                getWinProbabilities([sequence, opponentSequence], probabilities)[0]
            )
        }

    }

    return lowestWinChance
}

function getPlayer1BestStrategy(sequenceLength, outcomePossibilities) {
    let highestWinRate = 0
    let bestSequences = []
    for (let i = 0; i < Math.pow(outcomePossibilities, sequenceLength); i++) {
        const thisSequence = indexToSequence(i, sequenceLength, outcomePossibilities)
        const thisSequenceWinRate = player1SequenceWinRate(thisSequence, outcomePossibilities)
        if (thisSequenceWinRate > highestWinRate) {
            highestWinRate = thisSequenceWinRate
            bestSequences = [thisSequence]
        }
        else if (thisSequenceWinRate == highestWinRate) {
            bestSequences.push(thisSequence)
        }
    }

    return [highestWinRate, bestSequences]
}

function getPlayer2BestStrategies(sequenceLength, outcomePossibilities) {
    let output = []

    for (let i = 0; i < Math.pow(outcomePossibilities, sequenceLength); i++) {
        let opponentSequence = indexToSequence(i, sequenceLength, outcomePossibilities)

        output.push([opponentSequence, getPlayer2BestStrategy(opponentSequence, outcomePossibilities)[1]])
    }

    return output
}

function getPlayer3BestStrategy(sequenceLength, outcomePossibilities) {
    let results = ""

    for (let i = 0; i < Math.pow(outcomePossibilities, sequenceLength); i++) {
        for (let j = 0; j < Math.pow(outcomePossibilities, sequenceLength); j++) {
            let maxProb = 0
            let maxIndex = -1
            for (let k = 0; k < Math.pow(outcomePossibilities, sequenceLength); k++) {
                const thisProb = getWinProbabilities([indexToSequence(i, sequenceLength, outcomePossibilities), indexToSequence(j, sequenceLength, outcomePossibilities), indexToSequence(k, sequenceLength, outcomePossibilities)], [1/3, 1/3, 1/3])[2]
                if (thisProb > maxProb) {
                    maxProb = thisProb
                    maxIndex = k
                }
            }
            results += `(${i}, ${j}, ${maxIndex}), `
        }
    }

    return results
}