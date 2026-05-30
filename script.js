const menu = document.getElementById("mobileMenu");
    const menuButton = document.getElementById("menuButton");
    const imageModal = document.getElementById("imageModal");
    const modalImage = document.getElementById("modalImage");

    function toggleMenu() {
      const isHidden = menu.classList.toggle("hidden");
      menuButton.setAttribute("aria-expanded", String(!isHidden));
    }

    function closeMenu() {
      menu.classList.add("hidden");
      menuButton.setAttribute("aria-expanded", "false");
    }

    function openImageModal(src, alt) {
      modalImage.src = src;
      modalImage.alt = alt;
      imageModal.classList.remove("hidden");
      imageModal.classList.add("flex");
      imageModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
    }

    function closeImageModal() {
      imageModal.classList.add("hidden");
      imageModal.classList.remove("flex");
      imageModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      modalImage.src = "";
    }

    function handleImageKey(event, src, alt) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openImageModal(src, alt);
      }
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !imageModal.classList.contains("hidden")) {
        closeImageModal();
      }
    });

    let audioContext;

    function getAudioContext() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      return audioContext;
    }

    function playUiSound(type = "hover") {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      const isClick = type === "click";

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(isClick ? 520 : 740, now);
      oscillator.frequency.exponentialRampToValueAtTime(isClick ? 360 : 620, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(isClick ? 0.045 : 0.018, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (isClick ? 0.12 : 0.07));

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + (isClick ? 0.13 : 0.08));
    }

    function wireUiSounds() {
      const soundTargets = document.querySelectorAll("a, button, .image-pop, .skill-card, .project-card");
      soundTargets.forEach((target) => {
        target.addEventListener("pointerenter", () => playUiSound("hover"));
        target.addEventListener("click", () => playUiSound("click"));
      });
    }

    wireUiSounds();
