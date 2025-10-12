<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="auth.js"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Add TimeCapsule</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <link rel="stylesheet" href="style.css">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="form-page-body">

  <div id="shader-container"></div>
  <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute; overflow:hidden;">
    <defs><filter id="glass-distortion"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise"></feTurbulence><feGaussianBlur in="noise" stdDeviation="2" result="blurred"></feGaussianBlur><feDisplacementMap in="SourceGraphic" in2="blurred" scale="80" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap></filter></defs>
  </svg>
  <div id="liquid-glass-cursor"></div>

  <div class="form-container">
    <h1 class="mb-4 text-center">Add New Capsule</h1>
    <form id="capsuleForm">
      <div class="mb-3">
        <label for="capsuleName" class="form-label">Capsule Name</label>
        <input type="text" class="form-control" id="capsuleName" placeholder="e.g., 2025 Summer Memories">
      </div>
      <div class="mb-3">
        <label for="memoryText" class="form-label">Memory Text / Description</label>
        <textarea class="form-control" id="memoryText" rows="4" placeholder="Write your memory..."></textarea>
      </div>
      <div class="mb-3">
        <label for="photo" class="form-label">Upload Cover Photo (1)</label>
        <input class="form-control" type="file" id="photo" accept="image/*">
      </div>
      <div class="mb-3">
        <label for="video" class="form-label">Upload Video (1)</label>
        <input class="form-control" type="file" id="video" accept="video/*">
      </div>
      <div class="mb-3">
        <label for="unlockDate" class="form-label">Set Unlock Date</label>
        <input type="date" class="form-control" id="unlockDate">
      </div>
      <div class="mb-3">
        <label for="template" class="form-label">Choose Template</label>
        <select class="form-select" id="template">
            <option selected>Select a template...</option>
            <option value="casual">Casual</option>
            <option value="friends">Friends</option>
            <option value="romantic">Romantic</option>
            <option value="social">Social</option>
            <option value="adventure">Adventure</option>
            <option value="family">Family</option>
            <option value="achievement">Achievement</option>
            <option value="reflective">Reflective</option>
            <option value="future">Future</option>
            <option value="celebration">Celebration</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary w-100 btn-lg">Save Capsule</button>
    </form>
  </div>
  
  <script>
    // Animation Script
    const glass = document.getElementById('liquid-glass-cursor');
    const glassWidth = 120; const glassHeight = 120;
    document.body.addEventListener('mouseenter', () => gsap.to(glass, { duration: 0.5, opacity: 1, ease: 'power2.out' }));
    window.addEventListener("mousemove", (e) => {
      const posX = e.clientX - glassWidth / 2;
      const posY = e.clientY - glassHeight / 2;
      gsap.to(glass, { duration: 0.6, left: posX, top: posY, ease: "power2.out" });
    });
    const container = document.getElementById('shader-container');
    if (container) {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const clock = new THREE.Clock();
      const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
      const fragmentShader = `precision highp float; uniform vec2 iResolution; uniform float iTime; uniform vec2 iMouse; void main() { vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y; vec2 mouse = (iMouse - 0.5 * iResolution.xy) / iResolution.y; float t = iTime * 0.2; float mouseDist = length(uv - mouse); float warp = sin(mouseDist * 20.0 - t * 4.0) * 0.1; warp *= smoothstep(0.4, 0.0, mouseDist); uv += warp; vec2 gridUv = abs(fract(uv * 10.0) - 0.5); float line = pow(1.0 - min(gridUv.x, gridUv.y), 50.0); vec3 gridColor = vec3(0.1, 0.5, 1.0); vec3 color = gridColor * line * (0.5 + sin(t * 2.0) * 0.2); float energy = sin(uv.x * 20.0 + t * 5.0) * sin(uv.y * 20.0 + t * 3.0); energy = smoothstep(0.8, 1.0, energy); color += vec3(1.0, 0.2, 0.8) * energy * line; float glow = smoothstep(0.1, 0.0, mouseDist); color += vec3(1.0) * glow * 0.5; gl_FragColor = vec4(color, 1.0); }`;
      const uniforms = { iTime: { value: 0 }, iResolution: { value: new THREE.Vector2() }, iMouse: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) } };
      const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
      const geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      const onResize = () => { const width = window.innerWidth; const height = window.innerHeight; renderer.setSize(width, height); uniforms.iResolution.value.set(width, height); };
      window.addEventListener('resize', onResize);
      onResize();
      window.addEventListener('mousemove', (e) => uniforms.iMouse.value.set(e.clientX, window.innerHeight - e.clientY));
      renderer.setAnimationLoop(() => { uniforms.iTime.value = clock.getElapsedTime(); renderer.render(scene, camera); });
    }
  </script>
  <script>
    // Form Submission Script
    document.getElementById('capsuleForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData();
      formData.append('capsule_name', document.getElementById('capsuleName').value);
      formData.append('text', document.getElementById('memoryText').value);
      formData.append('template', document.getElementById('template').value);
      formData.append('unlock_date', document.getElementById('unlockDate').value);
      const photoInput = document.getElementById('photo');
      if (photoInput.files.length > 0) { formData.append('photos', photoInput.files[0]); }
      const videoInput = document.getElementById('video');
      if (videoInput.files.length > 0) { formData.append('videos', videoInput.files[0]); }
      try {
        const token = localStorage.getItem('token');
        const res = await fetch("/capsule", {
            method: "POST",
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        if (res.ok) { alert(data.message); window.location.href = 'review.html'; } else { alert("Error: " + data.error); }
      } catch (error) {
        console.error('Error during upload:', error);
        alert('A critical error occurred. Please check the developer console.');
      }
    });
  </script>
</body>
</html>
