const config = {
  type: Phaser.AUTO,
  width: window.innerWidth, 
  height: window.innerHeight,
  backgroundColor: "#3498db",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};
const game = new Phaser.Game(config);
let balloons = []; // Array to hold all balloons
let balloonIndex = 1; // To track the balloon number
const maxBalloonScale = 0.4; // Maximum scale for the balloon
const inflationAmount = 0.04; // Amount to inflate with each tap
const pumpPosition = { x: 1000, y: 500 }; // Balloon initial position for pump
const maxBalloonsOnCanvas = 4; // Maximum balloons allowed on canvas
let isInflating = false; // Track if a balloon is currently inflating
let pumpBody, pumpHandle, outputHandle; // Variables for pump parts
let pumpAnimation; // Variable to hold pump animation
let lastLetterIndex = -1; // Track the last alphabet index used (start from -1)
const safeDistance = 200; // Minimum distance from the pump

function preload() {
  this.load.image('background', '/graphics/Symbol 3 copy.png'); // Background image
  this.load.image('particle', '/graphics/star.png'); // Add a path to your particle image
  
  // Load balloon images (1-10)
  for (let i = 1; i <= 10; i++) {
    const balloonNumber = i < 10 ? `10000${i}` : `1000${i}`; // Handle leading zero
    this.load.image(`balloon${i}`, `/graphics/Symbol ${balloonNumber}.png`);
  }
  
  // Load letter images (1-26)
  for (let i = 1; i <= 26; i++) {
    const letterNumber = i < 10 ? `1000${i}` : `100${i}`; // Handle leading zero
    this.load.image(`letter${i}`, `/graphics/Symbol ${letterNumber}.png`);
  }
  this.load.image('rope', '/graphics/Symbol 100011.png'); // Load the rope image

  // Load pump parts (pump handle, body, and output handle)
  this.load.image('pumpHandle', '/graphics/Symbol 320001.png'); 
  this.load.image('pumpBody', '/graphics/Symbol 320003.png'); 
  this.load.image('outputHandle', '/graphics/Symbol 320002.png'); 
  this.load.image('cloudImage', '/graphics/Symbol 27.png'); 
}

function create() {
  this.add.image(config.width / 2, config.height / 2, 'background').setOrigin(0.5, 0.5).setDisplaySize(config.width, config.height); // Cover the whole background


  // Create the pump body, handle, and output handle
  pumpBody = this.add.image(pumpPosition.x, pumpPosition.y + 20, 'pumpBody').setOrigin(0.5, 1).setScale(0.5).setDepth(1);  // Adjust position
  pumpHandle = this.add.image(pumpPosition.x, pumpPosition.y - 120, 'pumpHandle').setOrigin(0.5, 1).setScale(0.5).setDepth(0); // Adjust position
  outputHandle = this.add.image(pumpPosition.x - 150, pumpPosition.y - 20, 'outputHandle').setOrigin(0.5, 1).setScale(0.5).setDepth(1); // Adjust position for output handle

  // Make the pump interactive for inflating
  pumpBody.setInteractive(); 
  pumpBody.on("pointerdown", () => {
    inflateBalloon.call(this); 
    animatePump.call(this); 
  });

  // Stop the pump animation when the pointer is released
  pumpBody.on("pointerup", () => {
    if (pumpAnimation) {
      pumpAnimation.stop(); // Stop pump animation
    }
    // Reset pump handle and body to original positions
    pumpHandle.setY(pumpPosition.y - 120); 
    pumpBody.setY(pumpPosition.y + 20); 
  });
  const cloud = this.add.image(pumpPosition.x, pumpPosition.y + 125, 'cloudImage') 
    .setOrigin(0.5, 1) 
    .setScale(0.6) 
    .setDepth(0); 
  // Set up input handler for bursting the balloons
  this.input.on("pointerdown", (pointer) => {
    for (let i = 0; i < balloons.length; i++) {
      if (balloons[i].isFlying && balloons[i].getBounds().contains(pointer.x, pointer.y)) {
        burstBalloon.call(this, i); // Pass the index of the balloon to burst
        break; // Exit the loop after bursting a balloon
      }
    }
  });
}

function update() {
  for (let i = 0; i < balloons.length; i++) {
    if (balloons[i].isFlying && balloons[i].body) {
      // Update the rope's position to follow the balloon
      if (balloons[i].rope) {
        balloons[i].rope.setPosition(balloons[i].x, balloons[i].y + 16);
      }

      // Add random floating effect
      balloons[i].body.setVelocityX(balloons[i].body.velocity.x + Phaser.Math.Between(-10, 10)); // Random horizontal movement
      balloons[i].body.setVelocityY(balloons[i].body.velocity.y + Phaser.Math.Between(-5, 5)); // Random vertical movement

      // Ensure the alphabet image stays on top of the balloon
      balloons[i].alphabet.setPosition(balloons[i].x, balloons[i].y); // Update the alphabet image position
    }
  }
}

function inflateBalloon() {
  // Allow inflating only if there are less than maxBalloonsOnCanvas and no balloon is currently inflating
  if (balloons.length < maxBalloonsOnCanvas && !isInflating) {
    isInflating = true; // Set to true to prevent other inflations
    // Create a new balloon
    const balloon = this.add.image(pumpPosition.x - 209, pumpPosition.y - 244, `balloon${balloonIndex}`).setVisible(true);
    balloon.setScale(0.1); // Start with a smaller size

    // Add physics to the balloon
    this.physics.add.existing(balloon);
    if (balloon.body) {
      balloon.body.setCollideWorldBounds(true); // Ensure it stays within bounds
    }

    balloon.isFlying = false; 
    balloons.push(balloon);

    // Assign the next alphabet corresponding to the last letter index
    lastLetterIndex = (lastLetterIndex + 1) % 26; // Increment and wrap around after Z (26)
    
    // Create an image of the corresponding alphabet PNG
    const alphabet = this.add.image(balloon.x, balloon.y, `letter${lastLetterIndex + 1}`) // +1 to adjust for index starting from 1
      .setOrigin(0.5, 0.5)
      .setScale(0.02); // Start alphabet smaller

    balloon.alphabet = alphabet; // Associate the alphabet image with the balloon

    // Start inflating the new balloon and alphabet together
    inflateBalloonAnimation.call(this, balloon, alphabet);

    // Increment balloonIndex for the next balloon
    balloonIndex = (balloonIndex % 10) + 1; // Loop back to 1 after 10
  }
}

function inflateBalloonAnimation(balloon, alphabet) {
  // Incrementally inflate the balloon and alphabet together
  this.tweens.add({
    targets: [balloon, alphabet], 
    scaleY: maxBalloonScale, 
    scaleX: maxBalloonScale, 
    duration: 1000, 
    onComplete: () => {
      balloon.setScale(maxBalloonScale); 
      alphabet.setScale(0.3); 
      startFlying.call(this, balloon); // Start flying after reaching max scale
    },
  });

  // Animate the pump handle and body only during inflation
  animatePump.call(this);
}

function animatePump() {
  // Check if there's an existing pump animation and stop it
  if (pumpAnimation) {
    pumpAnimation.stop();
  }

  // Animate pump handle going down deeply for a single touch
  pumpAnimation = this.tweens.add({
    targets: pumpHandle,
    y: pumpHandle.y + 150, 
    duration: 500, 
    yoyo: true, 
    onComplete: () => {
      pumpHandle.setY(pumpPosition.y - 120); 
    },
  });

  // Animate pump body compressing (do not move upwards)
  this.tweens.add({
    targets: pumpBody,
    y: pumpBody.y + 20, 
    duration: 500,
    yoyo: true, 
    onComplete: () => {
      pumpBody.setY(pumpPosition.y + 20); // Reset body to original position
    },
  });
}


function startFlying(balloon) {
  balloon.setPosition(pumpPosition.x - 209, pumpPosition.y - 244); // Detach from the pump
  balloon.isFlying = true; 

  // Create and position the rope
  const rope = this.add.image(balloon.x, balloon.y, 'rope').setOrigin(0.5, 0); 
  rope.setScale(0.4); 


  balloon.rope = rope; 

  // Enable physics for the balloon
  this.physics.add.existing(balloon);
  if (balloon.body) {
    balloon.body.setCollideWorldBounds(true); 
    balloon.body.setVelocity(0, -100); 

    // Change direction after a short delay
    this.time.addEvent({
      delay: 2000, // 2 seconds
      callback: changeDirection,
      callbackScope: this,
      args: [balloon] // Pass the current balloon as an argument
    });

    // After balloon is detached, stop pump animation and allow pumping of new balloons
    isInflating = false;
  }
}

function changeDirection(balloon) {
  // Check if the balloon still exists before changing its direction
  if (balloon && balloon.body) {
    // Change the direction of the balloon randomly
    const randomDirection = Phaser.Math.Between(-50, 50); // Random horizontal velocity
    balloon.body.setVelocityX(randomDirection);
    balloon.body.setVelocityY(-100); // Maintain upward movement
  }
}


function burstBalloon(index) {
  const balloon = balloons[index]; // Get the balloon to pop
  const rope = balloon.rope; // Get the attached rope to remove

  // Create particle effect at the balloon's position
  createParticleEffect.call(this, balloon.x, balloon.y);

  // Remove the rope
  if (rope) {
    rope.destroy(); // Destroy the associated rope image
  }

  // Destroy the balloon and its corresponding alphabet immediately
  balloon.alphabet.destroy(); 
  balloon.destroy(); 

  // Remove the balloon from the array after creating the particle effect
  balloons.splice(index, 1);
}


function createParticleEffect(x, y) {
  const particles = this.add.particles('particle'); // Create particles

  // Create an emitter for the particles
  const emitter = particles.createEmitter({
    speed: { min: 100, max: 300 }, 
    angle: { min: 0, max: 360 }, 
    gravityY: 200, 
    scale: { start: 0.3, end: 0 }, 
    lifespan: 500,
    frequency: -1, 
    quantity: 10, 
    x: x, 
    y: y, 
  });

  // Emit particles briefly
  emitter.explode(10, x, y); // Emit 10 particles at once
}


window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
