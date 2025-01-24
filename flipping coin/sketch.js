let camera

let coinPos

let coinModel
let coinTexture

let groundTexture

let vectorModel

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

    noStroke()

    textureWrap(REPEAT)

    specularMaterial(125)

    coinPos = createVector(0, 0, 0)
}

let t = 0
function draw() {
    background(0)

    t += deltaTime / 1000

    coinPos.add(createVector(0, 0.1, 0))

    scale(100)

    orbitControl(15, 15, 1)

    directionalLight(255, 255, 255, 0, -1, 1)
    ambientLight(150)

    // rotation axis of the coin
    const axis = createVector(0, 2, 1).normalize()

    shininess(100)
    texture(coinTexture)
    push()
    applyMatrix(getRotationMatrix(axis, 2*t))
    console.log(axis.copy().dot(createVector(0, 1, 0)))
    model(coinModel)
    pop()

    fill(255, 0, 0)
    push()
    // applyMatrix(vectorPointMatrix(createVector(Math.sin(t), Math.cos(t), 0)))
    model(vectorModel)
    pop()

    translate(-coinPos.x, -coinPos.y, -coinPos.z) //after this, all object will be drawn relative to the ground and not the coin position

    shininess(1)
    texture(groundTexture)
    push()
    rotateX(PI/2)
    plane(100, 100)
    pop()
}

// https://en.wikipedia.org/wiki/Rotation_matrix#Rotation_matrix_from_axis_and_angle
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

function vectorPointMatrix(direction) {
    const originalVectorDir = createVector(0, 0, 1)
    const YZAngle = Math.atan2(direction.y, direction.z)
    const XtoYZAngle = Math.atan2(direction.x, sqrt(direction.y**2 + direction.z**2))
}