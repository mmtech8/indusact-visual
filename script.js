let photoCropper = null;
let logoCropper = null;
let hasPreview = false;

const previewImg = document.getElementById("previewImage");
const canvas = document.getElementById("finalCanvas");
const ctx = canvas.getContext("2d");

/* -------- PHOTO -------- */

document.getElementById("photoUpload").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const img = document.getElementById("photoCropImage");
    img.src = URL.createObjectURL(file);

    if (photoCropper) photoCropper.destroy();

    photoCropper = new Cropper(img, {
        aspectRatio: 1,
        viewMode: 1,
        guides: false,
        background: false
    });

    checkReady();
});

/* -------- LOGO -------- */

const logoType = document.getElementById("logoType");
const logoUpload = document.getElementById("logoUpload");
const logoCropWrapper = document.getElementById("logoCropWrapper");

logoType.addEventListener("change", () => {
    logoUpload.style.display = logoType.value === "upload" ? "block" : "none";
    logoCropWrapper.style.display = "none";
});

logoUpload.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const img = document.getElementById("logoCropImage");
    img.src = URL.createObjectURL(file);
    logoCropWrapper.style.display = "flex";

    if (logoCropper) logoCropper.destroy();

    logoCropper = new Cropper(img, {
        aspectRatio: 3 / 1,
        viewMode: 1,
        background: false
    });

    checkReady();
});

/* -------- PREVIEW -------- */

document.getElementById("previewBtn").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const photo = photoCropper.getCroppedCanvas({ width: 466, height: 466 });
    ctx.drawImage(photo, 300, 300);

    if (logoType.value === "upload" && logoCropper) {
        const logo = logoCropper.getCroppedCanvas({ width: 400, height: 140 });
        ctx.drawImage(logo, 340, 1000);
    }

    previewImg.src = canvas.toDataURL("image/png");
    previewImg.style.display = "block";

    hasPreview = true;
    document.getElementById("sendBtn").disabled = false;
});

/* -------- CLICK DROIT BLOQUÉ SUR PREVIEW -------- */

previewImg.addEventListener("contextmenu", e => e.preventDefault());

/* -------- VALIDATION -------- */

function checkReady() {
    const emailOk = document.getElementById("email").value !== "";
    const consentOk = document.getElementById("consent").checked;
    const photoOk = photoCropper !== null;

    document.getElementById("previewBtn").disabled = !(emailOk && consentOk && photoOk);
}
