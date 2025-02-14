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

    let otherSequencesSum = 0;
    for (let k = 1; k <= n; k++) {
        otherSequencesSum += getReturn(sequenceAppeared, sequences[k-1], probabilities)
    }
    return 1/(n-1) * (n*getReturn(sequenceAppeared, thisSequence, probabilities) - otherSequencesSum)
}

function getWinProbabilities(sequences, probabilities) {
    const n = sequences.length

    let M = new Matrix(n, sequences.length)
    for (let row = 0; row < n-1; row++) {
        for (let col = 0; col < n; col++){
            M.entries[row][col] = getNetProfit(sequences[col], sequences[row], sequences, probabilities)
        }
    }
    // fill in the last row with 1
    for (let col = 0; col < n; col ++) {
        M.entries[n-1][col] = 1
    }

    let V = new Matrix(n, 1)
    for (let i = 0; i < n-1; i++) {
        V.entries[i][0] = 0
    }
    V.entries[n-1][0] = 1

    const solutionsVector = M.inverse().multiplyVector(V)
    let solutions = []
    for (let i = 0; i < n; i++) {
        solutions.push(solutionsVector.entries[i][0])
    }

    return solutions
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