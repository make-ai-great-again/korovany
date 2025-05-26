import * as THREE from 'three';

let player;
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
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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
    const groundGeometry = new THREE.PlaneGeometry(50, 50); // Width, height
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Forest green
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = 0;
    scene.add(ground);

    // Trees
    const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown for trunk
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Dark green for leaves

    const treePositions = [
        { x: 5, z: -5 },
        { x: -8, z: -10 },
        { x: 10, z: 0 },
        { x: -15, z: 8 },
        { x: 12, z: -15 }
    ];

    treePositions.forEach(pos => {
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 8); // Radius top, radius bottom, height, segments
        const trunk = new THREE.Mesh(trunkGeometry, treeMaterial);
        trunk.position.set(pos.x, 2, pos.z); // Y position is half height
        scene.add(trunk);

        // Leaves (simple sphere for now)
        const leavesGeometry = new THREE.SphereGeometry(2, 8, 6); // Radius, width segments, height segments
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(pos.x, 5, pos.z); // Position above the trunk
        scene.add(leaves);
    });
}

function createPlayer() {
    const playerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16); // Radius top, radius bottom, height, segments
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green color for elf
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 1, 0); // Adjusted Y for cylinder height of 2
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
