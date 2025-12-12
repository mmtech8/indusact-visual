/* CONFIG */
const MAKE_WEBHOOK_URL = "https://hook.integromat.com/XXX";

/* CROP STATES */
let cropPhoto = null;
let cropLogo1 = null;
let cropLogo2 = null;

let logo1Cropped = false;
let logo2Cropped = false;

let photoSource = null;
let logo1Source = null;
let logo2Source = null;

const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");
const previewImg = document.getElementById("previewImage");

previewImg.src = "";
previewImg.style.display = "none";

/* PHOTO */
const photoUploadInput = document.getElementById("photoUpload");
const photoZoomInput = document.getElementById("photoZoom");
const photoCropImage = document.getElementById("photoCropImage");

photoUploadInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
        photoCropImage.src = ev.target.result;
        if (cropPhoto) cropPhoto.destroy();

        cropPhoto = new Cropper(photoCropImage, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1,
            background: false,
            guides: false
        });
        photoZoomInput.value = 1;
    };
    reader.readAsDataURL(file);
});

photoZoomInput.addEventListener("input", e => {
    if (cropPhoto) cropPhoto.zoomTo(parseFloat(e.target.value));
});

function exportPhoto() {
    if (!cropPhoto) return null;
    const canvas = cropPhoto.getCroppedCanvas({ width: 466, height: 466 });
    photoSource = canvas.toDataURL("image/png");
    return photoSource;
}

/* LOGO UPLOAD RESET */
function resetLogoCrop(logo) {
    if (logo === 1) logo1Cropped = false;
    if (logo === 2) logo2Cropped = false;
}

/* LOGO 1 */
document.getElementById("logoUpload1").addEventListener("change", e => {
    resetLogoCrop(1);
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById("logoCropImage1").src = ev.target.result;
        if (cropLogo1) cropLogo1.destroy();

        cropLogo1 = new Cropper(document.getElementById("logoCropImage1"), {
            aspectRatio: 5 / 3,
            viewMode: 1,
            autoCropArea: 1,
            background: false,
            guides: false
        });
    };
    reader.readAsDataURL(file);
});

function exportLogo1() {
    if (!cropLogo1) return null;
    const canvas = cropLogo1.getCroppedCanvas({ width: 500, height: 300 });
    logo1Cropped = true;
    logo1Source = canvas.toDataURL("image/png");
    return logo1Source;
}

/* LOGO 2 */
document.getElementById("logoUpload2").addEventListener("change", e => {
    resetLogoCrop(2);
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById("logoCropImage2").src = ev.target.result;
        if (cropLogo2) cropLogo2.destroy();

        cropLogo2 = new Cropper(document.getElementById("logoCropImage2"), {
            aspectRatio: 5 / 3,
            viewMode: 1,
            autoCropArea: 1,
            background: false,
            guides: false
        });
    };
    reader.readAsDataURL(file);
});

function exportLogo2() {
    if (!cropLogo2) return null;
    const canvas = cropLogo2.getCroppedCanvas({ width: 500, height: 300 });
    logo2Cropped = true;
    logo2Source = canvas.toDataURL("image/png");
    return logo2Source;
}

/* PREVIEW */
previewImg.addEventListener("contextmenu", e => e.preventDefault());

async function drawFinalCanvas() {
    if (!cropPhoto) return;

    if (document.getElementById("logoUpload1")?.files.length && !logo1Cropped) return;
    if (document.getElementById("logoUpload2")?.files.length && !logo2Cropped) return;

    exportPhoto();
    exportLogo1();
    exportLogo2();

    ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

    const previewBase64 = finalCanvas.toDataURL("image/jpeg", 0.6);
    previewImg.src = previewBase64;
    previewImg.style.display = "block";
}

document.getElementById("previewBtn").addEventListener("click", drawFinalCanvas);
