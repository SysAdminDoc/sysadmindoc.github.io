class Snowfall {
  constructor({
    numberOfSnowflakes = 20,
    mainSnowflakeSize = 5,
    snowflakeSize = 3,
    colors = ["#FFFFFF", "#B0C4DE", "#ADD8E6", "#C0C0C0", "#D3D3D3"],
    mouseMoveThreshold = 0.5, // Threshold for mouse movement speed
    timeThreshold = 100, // Time in milliseconds for speed calculation
    fadeTimeout = 10*1000 // For fade effect
  } = {}) {
    this.numberOfSnowflakes = numberOfSnowflakes;
    this.mainSnowflakeSize = mainSnowflakeSize;
    this.snowflakeSize = snowflakeSize;
    this.snowflakeColors = colors;
    this.mouseMoveThreshold = mouseMoveThreshold;
    this.timeThreshold = timeThreshold;

    this.mouseX = 400;
    this.mouseY = 300;
    this.previousMouseX = this.mouseX;
    this.previousMouseY = this.mouseY;
    this.previousTime = Date.now(); // Last mouse movement time

    this.screenWidth = 800;
    this.screenHeight = 600;
    this.scrollLeft = 0;
    this.scrollTop = 0;

    this.snowflakes = [];
    this.initSnowflakes();

    // Setup event listeners
    this.setupEvents();

    // Start the animation loop
    this.startAnimation();
  }

  // Initialize snowflakes
  initSnowflakes() {
    for (let i = 0; i < this.numberOfSnowflakes; i++) {
      const snowflake = {
        element: null,
        isMain: true,
        velocityX: 0,
        velocityY: 0,
        positionX: this.mouseX,
        positionY: this.mouseY,
        size: this.mainSnowflakeSize,
        color: this.getRandomColor(),
      };
      this.snowflakes.push(snowflake);
    }
  }

  // Setup event listeners
  setupEvents() {
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('resize', this.updateScreenSize);
  }

  // Handle mouse movement
  handleMouseMove = (event) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - this.previousTime;

    const distance = Math.sqrt(
      Math.pow(event.pageX - this.previousMouseX, 2) + Math.pow(event.pageY - this.previousMouseY, 2)
    );

    // If mouse is moving faster than the threshold, generate snowflakes
    if (distance / timeDiff > this.mouseMoveThreshold) {
      this.updateScrollPosition();
      this.mouseX = event.pageX;
      this.mouseY = event.pageY;
      this.generateSnowflakes(); // Generate snowflakes with fast movement
    } else {
      this.mouseX = event.pageX;
      this.mouseY = event.pageY;
    }

    this.previousTime = currentTime;
    this.previousMouseX = this.mouseX;
    this.previousMouseY = this.mouseY;
  };

  // Start the animation loop
  startAnimation() {
    this.updateScreenSize();
    requestAnimationFrame(this.animateSnowflakes);
  }

  // Update scroll position
  updateScrollPosition() {
    this.scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
  }

  // Update screen size
  updateScreenSize = () => {
    this.screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    this.screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  };

  // Create a snowflake element
  createSnowflakeElement(size, color) {
    const div = document.createElement("div");
    div.style.pointerEvents = "none";
    div.style.position = "absolute";
    div.style.top = 0;
    div.style.height = `${size}px`;
    div.style.width = `${size}px`;
    div.style.overflow = "hidden";
    div.style.backgroundColor = color;
    div.style.visibility = "hidden"; // Initially hidden
    div.style.clip = `rect(0px, ${size}px, ${size}px, 0px)`;
    //div.style.borderRadius = `100%`;
    document.body.appendChild(div);
    return div;
  }

  // Get a random color for the snowflake
  getRandomColor() {
    return this.snowflakeColors[Math.floor(Math.random() * this.snowflakeColors.length)];
  }

  // Update the position and appearance of a snowflake
  updateSnowflake(snowflake) {
    if (!snowflake.element) {
      snowflake.element = this.createSnowflakeElement(snowflake.size, snowflake.color);
    }

    // If the snowflake is active, update its position
    if (snowflake.velocityX > 0) {
      snowflake.velocityX--;
      if (snowflake.velocityX === 25) {
        snowflake.size = this.snowflakeSize;
        if (snowflake.element) {
          snowflake.element.style.width = `${this.snowflakeSize}px`;
          snowflake.element.style.height = `${this.snowflakeSize}px`;
        }
      }

      snowflake.positionY += 1 + Math.random() * 3;
      snowflake.positionX += (this.snowflakes.indexOf(snowflake) % 5 - 2) / 5;

      // If the snowflake is still on the screen, update its position
      if (snowflake.positionY < this.screenHeight + this.scrollTop) {
        snowflake.element.style.transform = `translate(${snowflake.positionX}px, ${snowflake.positionY}px)`;
        snowflake.element.style.visibility = "visible";
      }
    }
  }

  // Main animation loop for snowflakes
  animateSnowflakes = () => {
    this.snowflakes.forEach((snowflake) => this.updateSnowflake(snowflake));
    requestAnimationFrame(this.animateSnowflakes);
  };

  // Generate snowflakes when the mouse is moving fast
  generateSnowflakes() {
    const numberOfGeneratedSnowflakes = Math.floor(Math.random() * 5) + 1; // Random number between 1 and 5

    // Gradually generate new snowflakes based on mouse movement
    for (let i = 0; i < numberOfGeneratedSnowflakes; i++) {
      const snowflake = this.snowflakes[Math.floor(Math.random() * this.snowflakes.length)];

      if (!snowflake.velocityX) {
        snowflake.positionX = this.mouseX;
        snowflake.positionY = this.mouseY;
        snowflake.velocityX = 50; // Set velocity for falling
        snowflake.isMain = true;
        snowflake.size = this.mainSnowflakeSize;
        if (snowflake.element) {
          snowflake.element.style.visibility = "visible";
          snowflake.element.style.opacity = 1;
		  this.fadeOut(snowflake.element); // Apply fade-out effect when the snowflake moves off screen
        }
      }
    }
  }

  // Apply a fade-out effect to the snowflake after it goes off-screen
  fadeOut(element) {
	  setTimeout(() => {
		element.style.transition = "opacity 1s"; // Smooth fade effect
		element.style.opacity = 0; // Fade out
	  }, +this.snowflakeSize); // Delay before fading out
	}
}


/*
window.addEventListener('load', () => {
	// Create an instance of the Snowfall class and start the animation
	const snowfall = new Snowfall({
	  numberOfSnowflakes: 30,
	  mainSnowflakeSize: 2,
	  snowflakeSize: 1,
	  colors: ["#FFFFFF", "#D3D3D3", "#ADD8E6", "#C0C0C0", "#B0C4DE"],
	  mouseMoveThreshold: 1.5, // Minimum speed for snowflake generation
	  timeThreshold: 100, // Time within which the mouse should cover a certain distance
	  snowflakeSize: 1500.
	});
});*/
