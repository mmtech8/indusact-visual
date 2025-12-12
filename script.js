/* PROTECTION APERÇU */
const previewImg = document.getElementById("previewImage");

previewImg.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

/* LOGO UPLOAD → CROP OBLIGATOIRE */
function requireLogoCrop(cropInstance) {
    if (!cropInstance) {
        alert("Merci de recadrer votre logo avant de continuer.");
        return false;
    }
    return true;
}

/* EXPORT LOGO 1 */
function exportLogo1() {
    const type = logo1TypeSelect.value;

    if (type === "alumni") {
        return Promise.resolve(logo1Source || null);
    }

    if (!requireLogoCrop(cropLogo1)) return Promise.resolve(null);

    const canvas = cropLogo1.getCroppedCanvas({ width: 500, height: 300 });
    logo1Source = canvas.toDataURL("image/png");
    return Promise.resolve(logo1Source);
}

/* EXPORT LOGO 2 */
function exportLogo2() {
    const type = logo2TypeSelect.value;

    if (type === "alumni") {
        return Promise.resolve(logo2Source || null);
    }

    if (!requireLogoCrop(cropLogo2)) return Promise.resolve(null);

    const canvas = cropLogo2.getCroppedCanvas({ width: 500, height: 300 });
    logo2Source = canvas.toDataURL("image/png");
    return Promise.resolve(logo2Source);
}
