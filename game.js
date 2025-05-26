import * as THREE from 'three';

let player;
let noise, scaleFactor, heightMultiplier; // Made global
const moveSpeed = 0.1;
const rotateSpeed = 0.05;
const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000); // Increased far plane
camera.position.set(0, 1.5, 5); // Position the camera

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
            movement.forward = true;
            break;
        case 'ArrowDown':
        case 's':
            movement.backward = true;
            break;
        case 'ArrowLeft':
        case 'a':
            movement.left = true;
            break;
        case 'ArrowRight':
        case 'd':
            movement.right = true;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
            movement.forward = false;
            break;
        case 'ArrowDown':
        case 's':
            movement.backward = false;
            break;
        case 'ArrowLeft':
        case 'a':
            movement.left = false;
            break;
        case 'ArrowRight':
        case 'd':
            movement.right = false;
            break;
    }
});

function createEnvironment() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(500, 500, 100, 100); // Width, height, widthSegments, heightSegments
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Forest green
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = 0; // Keep initial y at 0, noise will modify actual vertex heights
    scene.add(ground);

    // Terrain height variation
    // Make sure SimplexNoise is available (it should be, from index.html)
    // Assign to global variables
    noise = new SimplexNoise(); 
    scaleFactor = 50; // How "zoomed in" the noise is. Larger number = more spread out hills.
    heightMultiplier = 10; // How tall the hills are.
    
    const positionAttribute = ground.geometry.attributes.position;

    for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
        
        // Note: PlaneGeometry is created in XY plane. When rotated -Math.PI/2 around X,
        // its original X becomes world X, and its original Y becomes world Z.
        // The vertex.z is the height we want to modify *before* rotation.
        // So we use vertex.x and vertex.y for noise calculation before they are rotated.
        
        const noiseValue = noise.noise2D(vertex.x / scaleFactor, vertex.y / scaleFactor); // Use global noise, scaleFactor
        
        // Modify the z-coordinate (which becomes height after rotation)
        positionAttribute.setZ(i, noiseValue * heightMultiplier); // Use global heightMultiplier
    }

    positionAttribute.needsUpdate = true; // Tell Three.js to update the geometry
    ground.geometry.computeVertexNormals(); // Recalculate normals for correct lighting

    // Trees
    const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown for trunk
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Dark green for leaves
    const numberOfTrees = 200;
    const mapSize = 500; // Same as ground plane size
    const trunkHeight = 4; // Keep this consistent with geometry
    const leavesOffsetY = 3; // How much higher the leaves are from the trunk base + trunkHeight/2

    for (let i = 0; i < numberOfTrees; i++) {
        // Generate random X and Z positions within the map boundaries
        const x = (Math.random() - 0.5) * mapSize; 
        const z = (Math.random() - 0.5) * mapSize;

        // Calculate terrain height at this (x,z) position using global noise parameters
        const terrainHeight = noise.noise2D(x / scaleFactor, z / scaleFactor) * heightMultiplier;

        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, trunkHeight, 8);
        const trunk = new THREE.Mesh(trunkGeometry, treeMaterial);
        // Position trunk so its base is on the terrain
        trunk.position.set(x, terrainHeight + trunkHeight / 2, z); 
        scene.add(trunk);

        // Leaves (simple sphere for now)
        const leavesGeometry = new THREE.SphereGeometry(2, 8, 6);
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        // Position leaves above the trunk
        leaves.position.set(x, terrainHeight + trunkHeight + leavesOffsetY, z); 
        scene.add(leaves);
    }
}

function createPlayer() {
    const playerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16); // Radius top, radius bottom, height, segments
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green color for elf
    player = new THREE.Mesh(playerGeometry, playerMaterial);

    const startX = 10;
    const startZ = 10;
    // Calculate the terrain height at the starting position using global noise parameters
    const terrainHeight = noise.noise2D(startX / scaleFactor, startZ / scaleFactor) * heightMultiplier;
    // Player height is 2, so stand on terrainHeight + 1
    player.position.set(startX, terrainHeight + 1, startZ); 
    scene.add(player);
}

createEnvironment(); // <<<< CALL THIS
createPlayer(); // Call this before the initial render

function updatePlayer() {
    if (!player) return;

    // Rotation
    if (movement.left) {
        player.rotation.y += rotateSpeed;
    }
    if (movement.right) {
        player.rotation.y -= rotateSpeed;
    }

    // Movement (relative to player's direction)
    const forwardDirection = new THREE.Vector3();
    player.getWorldDirection(forwardDirection); // Get the forward vector

    if (movement.forward) {
        // Invert the scalar for forward movement
        player.position.add(forwardDirection.clone().multiplyScalar(-moveSpeed)); 
    }
    if (movement.backward) {
        // Use a positive scalar for backward movement (which is forward relative to the inverted direction)
        player.position.add(forwardDirection.clone().multiplyScalar(moveSpeed));
    }

    // Camera follow (simple third-person follow)
    // Calculate camera offset based on player's rotation
    const cameraOffset = new THREE.Vector3(0, 2, 5); // x, y, z offset from player
    cameraOffset.applyQuaternion(player.quaternion); // Rotate offset by player's rotation
    camera.position.copy(player.position).add(cameraOffset);
    camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1, 0))); // Look slightly above player's base
}

function animate() {
    requestAnimationFrame(animate); // Request the next frame

    updatePlayer(); // Update player position, rotation, and camera

    renderer.render(scene, camera); // Render the scene
}

// Start the game loop
animate();
