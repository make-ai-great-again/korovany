import * as THREE from 'three';

let player;
let noise, scaleFactor, heightMultiplier; // Made global
let playerHealth = 100;
let playerMaxHealth = 100;
let enemies = []; // Global array for enemies
let animationFrameId; // To store the animation frame ID

// Player Attack Parameters
let isPlayerAttacking = false;
let playerAttackCooldown = 500; // milliseconds
let lastPlayerAttackTime = 0;
const playerAttackRange = 3; // How far the player's attack reaches
const playerAttackDamage = 25; 
const playerAttackAngle = Math.PI / 3; // 60 degree attack cone (30 deg each side of forward)

const moveSpeed = 0.1;
const rotateSpeed = 0.05;

class Enemy {
    constructor(x, y, z, color = 0xff0000) { // Default color red
        this.health = 30;
        this.maxHealth = 30;
        this.speed = 0.03; // Slower than player
        this.attackDamage = 5;
        this.detectionRadius = 20;
        this.attackRadius = 1.5; // Close range for melee
        this.lastAttackTime = 0;
        this.attackCooldown = 1000; // 1 second

        const geometry = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 12); // Slightly smaller than player
        const material = new THREE.MeshStandardMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        scene.add(this.mesh); // Add mesh to the scene
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        
        console.log("Enemy took damage, health:", this.health);

        if (this.health <= 0) {
            console.log("Enemy defeated!");
            // Change color to indicate defeat, e.g., dark gray or black
            this.mesh.material.color.setHex(0x333333); 
            // We won't remove it from scene/array here directly, 
            // as iterating arrays while modifying them can be tricky.
            // The `updateEnemies` loop will handle the actual removal.
        } else {
            // Flash white if damaged but not defeated
            const originalColor = this.mesh.material.color.getHex(); // Assuming it's red (0xff0000) or some other color
            this.mesh.material.color.setHex(0xffffff); 
            setTimeout(() => {
                if(this.health > 0) this.mesh.material.color.setHex(originalColor); // Revert to original if still alive
            }, 150);
        }
    }

    // Placeholder for update logic, will be expanded in Enemy Behavior step
    update(player) { 
        // Basic AI and attack logic will go here later
    }
}

function spawnEnemy(x, z) {
    // Ensure noise, scaleFactor, heightMultiplier are accessible (should be global from previous steps)
    if (typeof noise === 'undefined' || typeof SimplexNoise === 'undefined' && typeof noise.noise2D === 'undefined') {
        console.error("Noise function not available for spawnEnemy. Make sure it's global.");
        return; // Cannot calculate terrain height
    }
    const terrainY = noise.noise2D(x / scaleFactor, z / scaleFactor) * heightMultiplier;
    const enemyYPosition = terrainY + 1.5 / 2; // Half of enemy height (1.5)
    
    const newEnemy = new Enemy(x, enemyYPosition, z);
    enemies.push(newEnemy);
}

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
        
        case ' ': // Spacebar for attack
            event.preventDefault(); // Prevent spacebar from scrolling the page
            const now = Date.now();
            if (!isPlayerAttacking && now - lastPlayerAttackTime > playerAttackCooldown) {
                isPlayerAttacking = true;
                lastPlayerAttackTime = now;
                
                // Perform Attack Logic
                console.log("Player attacks!");

                const playerForward = new THREE.Vector3();
                player.getWorldDirection(playerForward);

                enemies.forEach(enemy => {
                    if (enemy.health > 0) { // Only attack live enemies
                        const directionToEnemy = new THREE.Vector3().subVectors(enemy.mesh.position, player.position);
                        const distanceToEnemy = directionToEnemy.length();

                        if (distanceToEnemy < playerAttackRange) {
                            // Check if enemy is in front of player (within attack angle)
                            directionToEnemy.normalize(); // Need normalized vector for angle calculation
                            const angle = playerForward.angleTo(directionToEnemy);

                            if (angle < playerAttackAngle / 2) { // Check if angle is within half of the cone
                                console.log("Enemy in range and angle, dealing damage.");
                                enemy.takeDamage(playerAttackDamage);
                                // Visual feedback for hitting enemy is now handled in Enemy.takeDamage
                            }
                        }
                    }
                });
                
                // Reset attacking state after a short duration (e.g., animation time)
                // For now, a simple timeout. Later, this might tie into an animation.
                setTimeout(() => {
                    isPlayerAttacking = false;
                }, 200); // Duration of the attack visual/action itself
            }
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

    // Spawn some enemies
    const numberOfEnemies = 5;
    // const mapSize = 500; // Already defined above in tree section, can reuse if scope allows or redefine if needed
    for (let i = 0; i < numberOfEnemies; i++) {
        const enemyX = (Math.random() - 0.5) * mapSize * 0.8; // *0.8 to keep them away from extreme edges
        const enemyZ = (Math.random() - 0.5) * mapSize * 0.8;
        spawnEnemy(enemyX, enemyZ);
    }
    console.log("Spawned enemies:", enemies.length);
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

function updateEnemies() {
    if (!player) return;
    const currentTime = Date.now();
    
    const liveEnemies = []; // Array to store enemies that are still alive

    enemies.forEach(enemy => {
        if (enemy.health <= 0) {
            // If an enemy was just defeated (e.g., health dropped to 0 in the previous frame's attack)
            // and hasn't been removed yet.
            if (enemy.mesh.parent === scene) { // Check if it's still in the scene
                 scene.remove(enemy.mesh);
                 // Dispose of geometry and material if necessary (good practice for larger games)
                 if (enemy.mesh.geometry) enemy.mesh.geometry.dispose();
                 if (enemy.mesh.material) enemy.mesh.material.dispose();
                 console.log("Removed defeated enemy from scene.");
            }
            return; // Skip further processing for this defeated enemy
        }

        liveEnemies.push(enemy); // Keep this enemy for next frame's processing

        // --- Existing Movement ---
        const distanceToPlayer = player.position.distanceTo(enemy.mesh.position);
        if (distanceToPlayer < enemy.detectionRadius && distanceToPlayer > enemy.attackRadius) {
            const directionToPlayer = new THREE.Vector3().subVectors(player.position, enemy.mesh.position).normalize();
            enemy.mesh.position.add(directionToPlayer.multiplyScalar(enemy.speed));
            enemy.mesh.lookAt(player.position.x, enemy.mesh.position.y, player.position.z);
        }

        // --- Existing Attack ---
        if (distanceToPlayer <= enemy.attackRadius) {
            if (currentTime - enemy.lastAttackTime > enemy.attackCooldown) {
                enemy.lastAttackTime = currentTime;
                console.log("Enemy attacks player!");
                playerHealth -= enemy.attackDamage;
                if (playerHealth < 0) playerHealth = 0;
                console.log("Player health:", playerHealth);

                const originalPlayerColor = player.material.color.getHex();
                player.material.color.setHex(0xff0000); 
                setTimeout(() => {
                    player.material.color.setHex(originalPlayerColor);
                }, 150);
            }
        }
    });

    enemies = liveEnemies; // Update the global enemies array to only contain live ones
}

function animate() {
    animationFrameId = requestAnimationFrame(animate); // Store the ID

    updatePlayer(); // Update player position, rotation, and camera
    updateEnemies(); // Update enemy AI, movement, and attacks
    
    // Check for Player Defeat
    if (playerHealth <= 0) {
        alert('Game Over!'); // Display a simple game over message
        cancelAnimationFrame(animationFrameId); // Stop the game loop
        // Optionally, you could add more logic here, like showing a game over screen,
        // preventing further input, etc. For now, alert and stop is sufficient.
        return; // Stop further execution of this animate frame
    }

    renderer.render(scene, camera); // Render the scene
}

// Start the game loop
animate();
