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
    const k = sequenceAppeared.length

    let v = 0

    for (let s = 1; s <= k; s++) {
        let p = 1
        for (let i = 0; i <= k - s; i++) {
            p *= sequenceAppeared[s + i - 1] == thisSequence[i] ? (1 / probabilities[sequenceAppeared[s + i - 1]]) : 0
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

function getWinProbabilities(sequences, probabilities) {
    const n = sequences.length

    let M = new Matrix(n, sequences.length)
    for (let row = 0; row < n - 1; row++) {
        for (let col = 0; col < n; col++) {
            M.entries[row][col] = getNetProfit(sequences[col], sequences[row], sequences, probabilities)
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

    return solutions
}

function indexToSequence(index, sequenceLength, valueOptions) {
    let result = []
    for (let i = 0; i < sequenceLength; i++) {
        result.push(Math.floor(index / Math.pow(valueOptions, i)) % valueOptions)
    }
    return result
}

// finds if two players are playing the same sequence
function sequencesMatch() {
    for (let i = 0; i < sequences.length; i++) {
        for (let j = 0; j < sequences.length - 1; j++) {
            if (i == j) { j++ }
            else {
                let sequencesMatch = true
                for (let k = 0; k < sequences[0].length; k++) {
                    if (sequences[i][k] !== sequences[j][k]) { sequencesMatch = false }
                }
                if (sequencesMatch) { return true }
            }
        }
    }

    return false
}

// add a warning if two sequences are the same
function sequenceMatchWarning() {
    if (sequencesMatch()) {
        document.getElementById("sequencesMatchWarning").innerText = "Warning: two players are playing the same sequence!"
    }
    else {
        document.getElementById("sequencesMatchWarning").innerText = ""
    }
}



document.getElementById("numOutcomesInput").addEventListener("input", function (e) {
    setupProbabilitiesInputs(e.target.value)
    setupPlayersInputs()
})

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

            sequenceMatchWarning()
        })

        const percent = document.createElement("span")
        percent.innerText = "%"
        div.append(percent)

        outcomesProbabilities[i] = 1 / n
    }
}



document.getElementById("numPlayersInput").addEventListener("input", function (e) {
    setupPlayersInputs()
})
document.getElementById("sequenceLengthInput").addEventListener("input", function (e) {
    setupPlayersInputs()
})

let sequences = []
setupPlayersInputs(2)
function setupPlayersInputs() {
    const numPlayers = document.getElementById("numPlayersInput").value
    const sequenceLength = document.getElementById("sequenceLengthInput").value
    const outcomePossibilities = outcomesProbabilities.length

    // sets up or removes the button to create a results table depending on if there are two players
    document.getElementById("tableCreatorDiv").innerHTML = ""
    if (numPlayers == 2 && Math.pow(sequenceLength, outcomePossibilities) < 150) { //* 50 is the max table size
        addCreateTableButton()
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

        const thisPlayerSequence = indexToSequence(i, sequenceLength, outcomePossibilities) //used in case the old sequence doesnt exist or isnt valid anymore

        sequences.push([])

        for (let j = 0; j < sequenceLength; j++) {
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

                sequenceMatchWarning()
            })

            if (j !== sequenceLength - 1) {
                const separator = document.createElement("span")
                separator.innerText = ", "
                sequenceEntryDiv.append(separator)
            }

            sequences[i].push(thisValue)
        }

        H.append(document.createElement("br"))
    }
    sequenceMatchWarning()
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



function addCreateTableButton(){
    const H = document.getElementById("tableCreatorDiv")

    const button = document.createElement("button")
    button.innerText="Create table for all possible games"
    button.addEventListener("click", function(){
        createTable()
    })

    H.append(button)
}

function createTable(){
    const H = document.getElementById("tableCreatorDiv")
    H.innerHTML="" //clear the element
    addCreateTableButton() //add the button back

    const table = document.createElement("table")
    H.append(table)

    const sequenceLength = sequences[0].length
    const valueOptions = outcomesProbabilities.length
    const numSequences = Math.pow(valueOptions, sequenceLength)

    for (let i = 0; i < numSequences; i++) {
        const rowSequence = indexToSequence(i, sequenceLength, valueOptions)

        const thisRow = document.createElement("tr")
        table.append(thisRow)

        for (let j = 0; j < numSequences; j++) {
            const colSequence = indexToSequence(j, sequenceLength, valueOptions)

            const thisCell = document.createElement("td")
            if (i !== j) {
                const winRate = getWinProbabilities([rowSequence, colSequence], outcomesProbabilities)[0]
                thisCell.title = `As [${rowSequence.join("")}] against [${colSequence.join("")}]: ${(winRate*100).toFixed(2)}% chance of winning`
                thisCell.style = `background: rgba(${winRate * 255}, ${winRate * 255}, ${winRate * 255}, 255); width: ${500/numSequences}px; height: ${500/numSequences}px;`
            }
            else {
                thisCell.title = ""
            }
            thisRow.append(thisCell)
        }
    }

    const info = document.createElement("p")
    info.innerText = "Hover over a square to see the game it represents."
    H.append(info)
}

function getBestSequence(opponentSequence, outcomePossibilities) {
    const sequenceLength = opponentSequence.length

    let thisSequence = []
    for (let i = 0; i < sequenceLength; i++) {
        let iA = 0
        for (let j = 0; j < sequenceLength; j++) {
            iA += opponentSequence[j]*Math.pow(outcomePossibilities, j+1)
        }
        thisSequence.push(
            (Math.floor((iA % Math.pow(outcomePossibilities, sequenceLength))/Math.pow(outcomePossibilities, i)) % outcomePossibilities)
        )
    }

    return thisSequence
}

function iB(opponentSequence, outcomePossibilities) {
    let sum = 0
    for (let i = 0; i < opponentSequence.length; i++){
        sum += opponentSequence[i]*Math.pow(outcomePossibilities, i)
    }

    return (outcomePossibilities * sum ) % Math.pow(outcomePossibilities, opponentSequence.length)
}

function iBToSequence(iB, sequenceLength, outcomePossibilities) {
    let thisSequence = []
    for (let i = 0; i < sequenceLength; i++){
        thisSequence.push(
            Math.floor(iB/Math.pow(outcomePossibilities, i))%outcomePossibilities
        )
    }

    return thisSequence
}

function actualBestTest(opponentSequence, outcomePossibilities) {
    let probabilities = []
    for (let i = 0; i < outcomePossibilities; i++) {
        probabilities.push(1/outcomePossibilities)
    }

    for (let i = 0; i < outcomePossibilities; i++) {
        // const S = iBToSequence(iB(opponentSequence, outcomePossibilities) + i, opponentSequence.length, outcomePossibilities)
        // getWinProbabilities([S, opponentSequence])
        console.log(
            `${i}: ${getWinProbabilities([
                iBToSequence(iB(opponentSequence, outcomePossibilities) + i, opponentSequence.length, outcomePossibilities), 
                opponentSequence
            ], probabilities)[0]}`
        )
    }
}
// do this for all sequences and visualize whether offset 0, 1, 2, ... is the best