const MAKE_WEBHOOK_URL = "https://hook.integromat.com/XXX";

const canvas = document.getElementById("finalCanvas");
const ctx = canvas.getContext("2d");

const previewImg = document.getElementById("previewImage");

let cropperPhoto = null;
let cropperLogo1 = null;

let photoData = null;
let logoData = null;

/* ---------- PHOTO ---------- */
document.getElementById("photoUpload").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const img = document.getElementById("photoCrop");
  img.src = URL.createObjectURL(file);
  img.classList.remove("is-hidden");

  if (cropperPhoto) cropperPhoto.destroy();

  cropperPhoto = new Cropper(img, {
    aspectRatio: 1,
    viewMode: 1,
    dragMode: "move",
    autoCropArea: 1,
    background: false
  });

  updateButtons();
});

/* ---------- LOGO ---------- */
document.getElementById("logoUpload1").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const img = document.getElementById("logoCrop1");
  img.src = URL.createObjectURL(file);
  img.classList.remove("is-hidden");

  if (cropperLogo1) cropperLogo1.destroy();

  cropperLogo1 = new Cropper(img, {
    aspectRatio: 5 / 3, // 🔒 rectangle horizontal
    viewMode: 1,
    dragMode: "move",
    autoCropArea: 1,
    background: false
  });
});

/* ---------- PREVIEW ---------- */
document.getElementById("previewBtn").addEventListener("click", () => {
  if (!cropperPhoto) return;

  photoData = cropperPhoto.getCroppedCanvas({
    width: 466,
    height: 466
  });

  if (cropperLogo1) {
    logoData = cropperLogo1.getCroppedCanvas({
      width: 500,
      height: 300
    });
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(photoData, 307, 200, 466, 466);

  if (logoData) {
    ctx.drawImage(logoData, 290, 1100, 500, 300);
  }

  previewImg.src = canvas.toDataURL("image/png");
  previewImg.classList.remove("is-hidden");

  document.getElementById("sendBtn").disabled = false;
});

/* ---------- SEND ---------- */
document.getElementById("sendBtn").addEventListener("click", async () => {
  const payload = {
    email: document.getElementById("email").value,
    image: canvas.toDataURL("image/png")
  };

  await fetch(MAKE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  alert("Visuel envoyé !");
});

/* ---------- UX ---------- */
function updateButtons() {
  const emailOk = document.getElementById("email").value.trim() !== "";
  const consentOk = document.getElementById("consent").checked;
  document.getElementById("previewBtn").disabled = !(emailOk && consentOk && cropperPhoto);
}

document.getElementById("email").addEventListener("input", updateButtons);
document.getElementById("consent").addEventListener("change", updateButtons);
