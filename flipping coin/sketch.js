let camera

let coinModel
let coinTexture

let groundTexture

let vectorModel



let coinPos
let coinLinVel
let coinRotVel

const coinMass = 0.0055
const coinRadius = 0.01

const worldScale = 1/coinRadius



function preload() {
    coinModel = loadModel("assets/coin assets/coin.obj")
    coinTexture = loadImage("assets/coin assets/coinTexture.png")

    groundTexture = loadImage("assets/ground.png")

    vectorModel = loadModel("assets/vector.stl")
}

function setup() {
    createCanvas(1000, 800, "webgl")

    camera = createCamera()
    camera.roll(PI)
    camera.frustum(-width/20, width/20, -height/20, height/20, 0.1*800, 30*800)

    noStroke()

    textureWrap(REPEAT)

    specularMaterial(125)



    coinPos = createVector(0, 0, 0)
    coinLinVel = createVector(0, 3, 0)

    coinRotVel = getRotVel(
        createVector(0, 1, 1), //force
        createVector(0.01, 0, 0.005), //force position (make sure it's on the coin, y=0, x & z < r)
        0.001, //time the force is applied
        coinMass,
        coinRadius
    )
    console.log(coinRotVel)
}

let t = 0
function draw() {
    background(0)

    const dt = deltaTime / 10000
    t += dt

    coinLinVel.add(createVector(0, -9.81 * dt, 0))
    coinPos.add(coinLinVel.copy().mult(dt))

    scale(1/coinRadius)

    orbitControl(15, 15, 1)

    directionalLight(255, 255, 255, 0, -1, 1)
    ambientLight(150)

    // rotation axis of the coin
    const axis = coinRotVel.copy().normalize()

    shininess(100)
    texture(coinTexture)
    push()

    applyMatrix(getRotationMatrix(axis, coinRotVel.mag() * t))
    model(coinModel)

    rotateX(-PI / 2)
    fill(255, 255, 0)
    model(vectorModel)

    pop()



    fill(255, 0, 0)
    push()
    applyMatrix(vectorPointMatrix(axis))
    model(vectorModel)
    pop()



    translate(-coinPos.x*worldScale, -coinPos.y*worldScale, -coinPos.z*worldScale) //after this, all object will be drawn relative to the ground and not the coin position



    shininess(1)
    texture(groundTexture)
    push()
    rotateX(PI / 2)
    plane(100, 100)
    pop()
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

// returns a matrix that points a 3d object from +z to the given direction
function vectorPointMatrix(direction) {
    const rotationAxis = createVector(0, 0, 1).cross(direction).normalize()
    const rotationAngle = -Math.acos(createVector(0, 0, 1).dot(direction))

    return getRotationMatrix(rotationAxis, rotationAngle)
}

// returns the rotational velocity of the coin given a force acting on it
function getRotVel(force, forcePosition, forceTime, coinMass, coinRadius) {
    const torque = forcePosition.copy().cross(force)
    const torqueXZMagNorm = (torque.x * torque.x + torque.z * torque.z) / torque.mag()

    const momentOfInertia = (coinMass * coinRadius * coinRadius / 4) * (2 - torqueXZMagNorm)

    return torque.mult(forceTime / momentOfInertia)
}

// https://physics.stackexchange.com/questions/268698/compute-an-objects-inertia-around-an-arbitrary-axis-using-its-known-values-for