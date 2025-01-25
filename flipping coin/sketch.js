let renderCanvas
let forcePositionCanvas
let forceAngleCanvas



let camera

let coinModel
let coinTexture

let groundTexture

let vectorModel

let axisModel



let coinPos
let coinLinVel
let coinRotVel
let coinInitialUpVel

const coinMass = 0.0055
const coinRadius = 0.01

const worldScale = 1 / coinRadius


let forceDir // calculated from forceDirXAxis and forceDirYAxis
let forceDirXAxis //its rotation on the x-axis
let forceDirYAxis //its rotation on the y-axis
let forceMag
let forcePos



// "start" for inputting the force, "fly" for the coin flying
let renderMode = "start"



function preload() {
    coinModel = loadModel("assets/coin assets/coin.obj")
    coinTexture = loadImage("assets/coin assets/coinTexture.png")

    groundTexture = loadImage("assets/ground.png")

    vectorModel = loadModel("assets/vector.stl")

    axisModel = loadModel("assets/axis.stl")
}



function setup() {
    forcePositionCanvas = createGraphics(300, 300)
    forcePositionCanvas.parent(document.getElementById("forcePositionCanvasHolder"))

    forceAngleCanvas = createGraphics(300, 300)
    forceAngleCanvas.parent(document.getElementById("forceAngleCanvasHolder"))

    renderCanvas = createCanvas(1000, 800, "webgl")
    renderCanvas.parent(document.getElementById("3dCanvasHolder"))



    camera = createCamera()
    camera.roll(PI)
    camera.frustum(-width / 20, width / 20, -height / 20, height / 20, 0.1 * 800, 30 * 800)

    setCamera(camera)

    noStroke()
    textureWrap(REPEAT)
    specularMaterial(125)



    coinPos = createVector(0, 0.0008, 0); coinLinVel = createVector(0, 0, 0); coinRotVel = createVector(0, 0, 0); coinInitialUpVel = 3; forceDir = createVector(0, 1, 0); forceDirXAxis = 0, forceDirYAxis = 0; forceMag = 1; forcePos = createVector(0, 0, 0)
}



let forcePosGrabbed = false
let forceTipGrabbed = false
document.getElementById("forcePositionCanvasHolder").addEventListener("mousedown", (e) => {
    const forceCanvasPos = getForceCanvasPos()

    const bounds = document.getElementById("forcePositionCanvasHolder").getBoundingClientRect()
    const clickPos = createVector(e.x - bounds.left, e.y - bounds.top)

    if (clickPos.dist(forceCanvasPos) < forcePositionCanvas.width * 0.05) {
        forcePosGrabbed = true
    }

    else {
        const forceTip = forceCanvasPos.copy().add(
            createVector(Math.cos(forceDirYAxis), -Math.sin(forceDirYAxis)).mult(90 * Math.sin(forceDirXAxis)),
        )

        if (clickPos.dist(forceTip) < forcePositionCanvas.width * 0.05) {
            forceTipGrabbed = true
        }
    }
})

document.getElementById("forcePositionCanvasHolder").addEventListener("mouseup", () => { forcePosGrabbed = false; forceTipGrabbed = false })

document.getElementById("forcePositionCanvasHolder").addEventListener("mousemove", (e) => {
    const bounds = document.getElementById("forcePositionCanvasHolder").getBoundingClientRect()
    const clickPos = createVector(e.x - bounds.left, e.y - bounds.top)

    if (forcePosGrabbed) {
        const clickPosWorld = clickPos.copy()
            .sub(forcePositionCanvas.width / 2, forcePositionCanvas.height / 2)
            .div(forcePositionCanvas.width / 2 * 0.75, -forcePositionCanvas.height / 2 * 0.75)
            .mult(coinRadius)

        forcePos = createVector(clickPosWorld.x, 0, clickPosWorld.y).limit(coinRadius)
    }

    else if (forceTipGrabbed) {
        const angle = PI - getForceCanvasPos().sub(clickPos).heading()
        forceDirYAxis = angle
        updateForceDir()
    }
})


document.getElementById("forceDirXAxis").addEventListener("input", (e) => {
    document.getElementById("forceDirXAxisDisplay").innerText = e.target.value
    forceDirXAxis = parseFloat(PI / 180 * e.target.value)
    updateForceDir()
})


document.getElementById("forceMagnitude").addEventListener("input", (e) => {
    forceMag = parseFloat(e.target.value)
})


document.getElementById("initialVelocity").addEventListener("input", (e) => {
    coinInitialUpVel = parseFloat(e.target.value)
})


document.getElementById("flipCoin").addEventListener("click", flipCoin)



let t = 0
let startedFalling = false
let endAlert = 0
function draw() {

    if (endAlert !== 0) {
        // send the alert
        alert(endAlert == 1 ? "Heads!" : "Tails!")
        endAlert = 0


        // now reset everything
        coinLinVel = createVector(0, 0, 0)
        coinPos = createVector(0, 0.0008, 0)
        coinRotVel = createVector(0, 0, 0)

        renderMode = "start"
    }



    forcePositionCanvas.background(0)

    forcePositionCanvas.stroke(0)
    forcePositionCanvas.strokeWeight(2)

    forcePositionCanvas.fill(255)
    forcePositionCanvas.ellipse(forcePositionCanvas.width / 2, forcePositionCanvas.height / 2, forcePositionCanvas.width * 0.75)
    forcePositionCanvas.fill(200)
    forcePositionCanvas.ellipse(forcePositionCanvas.width / 2, forcePositionCanvas.height / 2, forcePositionCanvas.width * 0.9 * 0.75)

    const forceDrawPos = getForceCanvasPos()
    forcePositionCanvas.fill(255, 0, 0)
    forcePositionCanvas.ellipse(forceDrawPos.x, forceDrawPos.y, forcePositionCanvas.width * 0.1)

    // up is negative z
    forcePositionCanvas.stroke(255, 0, 0)
    forcePositionCanvas.strokeWeight(5)
    if (Math.sin(forceDirXAxis) > 0.1) {
        drawVector(
            forcePositionCanvas,
            createVector(Math.cos(forceDirYAxis), -Math.sin(forceDirYAxis)).mult(90 * Math.sin(forceDirXAxis)),
            forceDrawPos,
            15,
            PI / 6
        )
    }



    forceAngleCanvas.background(0)

    forceAngleCanvas.stroke(127)
    forceAngleCanvas.strokeWeight(5)
    forceAngleCanvas.line(forceAngleCanvas.width * 0.25, 0, forceAngleCanvas.width * 0.25, forceAngleCanvas.height * 0.75)

    forceAngleCanvas.stroke(255, 0, 0)
    drawVector(
        forceAngleCanvas,
        createVector(Math.sin(forceDirXAxis), -Math.cos(forceDirXAxis)).mult(200),
        createVector(forceAngleCanvas.width * 0.25, forceAngleCanvas.height * 0.75),
        15,
        PI / 6
    )

    forceAngleCanvas.stroke(255)
    forceAngleCanvas.strokeWeight(15)
    forceAngleCanvas.line(0, forceAngleCanvas.height * 0.75, forceAngleCanvas.width, forceAngleCanvas.height * 0.75)



    background(0)



    // const dt = deltaTime / 1000
    const dt = 0.004
    t += dt

    // rotation axis of the coin
    const axis = coinRotVel.copy().normalize()
    const coinRotationMatrix = getRotationMatrix(axis, coinRotVel.mag() * t)



    if (renderMode === "fly" && coinPos.y < 0.02 && startedFalling) { //fell back down and it's now time to stop the simulation, set up the camera to get a look at the result and prepare an alert

        camera.setPosition(0, 800, -1)
        camera.lookAt(0, 0, 0)

        const upVector = vectorMatrixMult(coinRotationMatrix, createVector(0, 1, 0))
        endAlert = upVector.y > 0 ? 1 : 2
    }
    else if (renderMode == "fly") {
        coinLinVel.add(createVector(0, -9.81 * dt, 0))
        coinPos.add(coinLinVel.copy().mult(dt))
        if (coinLinVel.y < 0) { startedFalling = true }
    }



    scale(1 / coinRadius)

    orbitControl(15, 15, 1)

    directionalLight(255, 255, 255, 0, -1, 1)
    ambientLight(150)



    shininess(100)
    texture(coinTexture)
    push()

    // drawing the coin
    applyMatrix(coinRotationMatrix)
    model(coinModel)

    // drawing the normal vector of the coin
    if (renderMode == "fly") {
        rotateX(-PI / 2)
        fill(255, 255, 0)
        model(vectorModel)
    }

    pop()



    // drawing the axis of rotation of the coin
    fill(0, 120, 120)
    push()
    applyMatrix(vectorPointMatrix(axis))
    model(axisModel)
    pop()



    // drawing the initial force
    if (renderMode === "start") {
        fill(255, 0, 0)
        push()
        translate(worldScale * forcePos.x, worldScale * forcePos.y, worldScale * forcePos.z)
        applyMatrix(vectorPointMatrix(forceDir))
        model(vectorModel)
        pop()
    }



    //after this, all object will be drawn relative to the ground and not the coin position
    translate(-coinPos.x * worldScale, -coinPos.y * worldScale, -coinPos.z * worldScale)



    shininess(1)
    texture(groundTexture)
    push()
    rotateX(PI / 2)
    plane(100, 100)
    pop()
}



// gets the coin moving
function flipCoin() {
    t = 0
    startedFalling = false
    renderMode = "fly"

    coinPos = createVector(0, 0.00081, 0)
    coinLinVel = createVector(0, coinInitialUpVel, 0)

    coinRotVel = getRotVel(
        forceDir.copy().mult(forceMag), //force
        forcePos, //force position (make sure it's on the coin, y=0, x & z < r)
        0.001, //time the force is applied
        coinMass,
        coinRadius
    )
}



// https://en.wikipedia.org/wiki/Rotation_matrix#Rotation_matrix_from_axis_and_angle
// returns a matrix that rotates a 3d object around the given axis by the given angle
function getRotationMatrix(axis, angle) {
    let c = cos(angle)
    let s = sin(angle)
    let t = 1 - c

    let x = axis.x
    let y = axis.y
    let z = axis.z

    return [
        t * x * x + c, t * x * y - s * z, t * x * z + s * y, 0,
        t * x * y + s * z, t * y * y + c, t * y * z - s * x, 0,
        t * x * z - s * y, t * y * z + s * x, t * z * z + c, 0,
        0, 0, 0, 1
    ]
}

// used for applying 4x4 matrices like above to vectors
function vectorMatrixMult(matrix, vector) {
    return createVector(
        matrix[0] * vector.x + matrix[1] * vector.y + matrix[2] * vector.z,
        matrix[4] * vector.x + matrix[5] * vector.y + matrix[6] * vector.z,
        matrix[8] * vector.x + matrix[9] * vector.y + matrix[10] * vector.z
    )
}

// returns a matrix that points a 3d object from +z to the given direction
function vectorPointMatrix(direction) {
    const rotationAxis = createVector(0, 0, 1).cross(direction).normalize()
    const rotationAngle = -Math.acos(createVector(0, 0, 1).dot(direction))

    return getRotationMatrix(rotationAxis, rotationAngle)
}

// returns the rotational velocity of the coin given a force acting on it
// https://physics.stackexchange.com/questions/268698/compute-an-objects-inertia-around-an-arbitrary-axis-using-its-known-values-for
function getRotVel(force, forcePosition, forceTime, coinMass, coinRadius) {
    // it should be forcePosition cross force technically but something's off somewhere else
    const torque = force.copy().cross(forcePosition)
    const torqueXZMagNorm = (torque.x * torque.x + torque.z * torque.z) / torque.mag()

    const momentOfInertia = (coinMass * coinRadius * coinRadius / 4) * (2 - torqueXZMagNorm)

    return torque.mult(forceTime / momentOfInertia)
}

function getForceCanvasPos() {
    return createVector(forcePos.x, forcePos.z)
        .copy()
        .mult(forcePositionCanvas.width / (2 * coinRadius) * 0.75, -forcePositionCanvas.width / (2 * coinRadius) * 0.75)
        .add(forcePositionCanvas.width / 2, forcePositionCanvas.height / 2)
}

function drawVector(canvas, vector, position, headLength, headAngle) {
    canvas.push()
    canvas.translate(position.x, position.y)
    canvas.rotate(vector.heading())
    canvas.line(0, 0, vector.mag(), 0)
    canvas.line(vector.mag(), 0, vector.mag() - headLength * Math.cos(headAngle), headLength * Math.sin(headAngle))
    canvas.line(vector.mag(), 0, vector.mag() - headLength * Math.cos(headAngle), -headLength * Math.sin(headAngle))
    canvas.pop()
}

function updateForceDir() {
    forceDir = createVector(
        Math.cos(forceDirYAxis) * Math.sin(forceDirXAxis),
        Math.cos(forceDirXAxis),
        Math.sin(forceDirYAxis) * Math.sin(forceDirXAxis),
    )
}