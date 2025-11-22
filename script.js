<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Créer mon visuel – J’agis pour une industrie mixte et performante</title>
  <link rel="stylesheet" href="style.css">
</head>

<body>
  <div class="container">

    <h1>Je crée mon visuel<br>“J’agis pour une industrie mixte et performante”</h1>
    <p class="intro">
      Complète le formulaire, recadre ta photo dans le cercle, puis valide.<br>
      Tu recevras ton visuel personnalisé par e-mail.
    </p>

    <!-- SECTION 1 : INFORMATIONS -->
    <section class="sectionBox">
      <h2>1. Informations</h2>

      <label>Email *</label>
      <input type="email" id="email" required>

      <label>Nom et prénom (optionnel)</label>
      <input type="text" id="fullname">

      <label>Nombre de logos d’organisation à afficher</label>
      <div class="radioGroup">
        <label><input type="radio" name="logoCount" value="0" checked> 0 logo</label>
        <label><input type="radio" name="logoCount" value="1"> 1 logo</label>
        <label><input type="radio" name="logoCount" value="2"> 2 logos</label>
      </div>
      <p class="help">Si tu choisis 0 logo, le visuel sera généré sans bande blanche.</p>
    </section>

    <!-- SECTION 2 : LOGOS -->
    <section id="logosSection" class="sectionBox">
      <h2>2. Organisations (logos)</h2>

      <!-- LOGO 1 -->
      <div class="logoBlock">
        <h3>Logo 1</h3>

        <label>Type d’organisation</label>
        <select id="typeLogo1" class="orgType">
          <option value="alumni">Association alumni</option>
          <option value="other">Entreprise / organisation</option>
        </select>

        <div id="logo1AlumniList" class="alumniDrop">
          <label>Logo alumni 1</label>
          <select id="logo1Alumni"></select>
        </div>

        <div id="logo1Upload" class="uploadBlock hidden">
          <label>Uploader un logo</label>
          <input type="file" id="logo1File" accept="image/*">
        </div>

        <div class="logoPreview">
          <canvas id="logoPreview1"></canvas>
        </div>
      </div>

      <!-- LOGO 2 -->
      <div id="logo2Block" class="logoBlock hidden">
        <h3>Logo 2</h3>

        <label>Type d’organisation</label>
        <select id="typeLogo2" class="orgType">
          <option value="alumni">Association alumni</option>
          <option value="other">Entreprise / organisation</option>
        </select>

        <div id="logo2AlumniList" class="alumniDrop">
          <label>Logo alumni 2</label>
          <select id="logo2Alumni"></select>
        </div>

        <div id="logo2Upload" class="uploadBlock hidden">
          <label>Uploader un logo</label>
          <input type="file" id="logo2File" accept="image/*">
        </div>

        <div class="logoPreview">
          <canvas id="logoPreview2"></canvas>
        </div>
      </div>
    </section>

    <!-- SECTION 3 : PHOTO -->
    <section class="sectionBox">
      <h2>3. Photo de profil</h2>

      <label>Importer ta photo</label>
      <button id="uploadBtn">Choisir une photo</button>
      <input type="file" id="photoInput" accept="image/*" class="hidden">

      <p class="help">Idéalement visage ou buste, bien éclairé. Tu pourras recadrer avant de valider.</p>

      <div class="cropWrapper">
        <div id="cropArea"></div>

        <div class="previewWrapper">
          <h3>Aperçu dans le cercle</h3>
          <div id="circlePreview"></div>
        </div>
      </div>
    </section>

    <!-- CONSENTEMENT -->
    <section class="sectionBox">
      <label>
        <input type="checkbox" id="consent">
        J’accepte que ma photo et les logos fournis soient utilisés dans le cadre de l’appel à l’action.
      </label>
    </section>

    <!-- BOUTON -->
    <button id="generateBtn" disabled>Générer mon visuel</button>

  </div>

  <script src="script.js"></script>
</body>
</html>
